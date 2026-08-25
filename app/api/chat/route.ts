/**
 * POST /api/chat — ask a question about Mohab's CV.
 *
 * Streams Server-Sent Events:
 *   {"type":"sources","passages":[...]}   retrieved excerpts, sent first
 *   {"type":"thinking"}                   model started reasoning
 *   {"type":"delta","text":"..."}         answer tokens
 *   {"type":"done"}
 *   {"type":"error","message":"..."}
 *
 * GET /api/chat — health probe reporting which backends are actually wired up.
 */

import { ragConfig, zillizConfigured } from '@/lib/rag/config.ts'
import { embeddingDim, embeddingModel, embeddingProvider } from '@/lib/rag/embeddings.ts'
import { activeProvider, generate } from '@/lib/rag/generate.ts'
import type { ChatMessage } from '@/lib/rag/openrouter.ts'
import { buildMessages, MAX_HISTORY_TURNS } from '@/lib/rag/prompt.ts'
import { clientKey, rateLimit } from '@/lib/rag/ratelimit.ts'
import { retrieve } from '@/lib/rag/retrieve.ts'
import { rewriteQuery } from '@/lib/rag/rewrite.ts'
import { listCollections } from '@/lib/rag/zilliz.ts'
import cvIndex from '@/data/cv-index.json'

// Needs Node: the local fallback index decodes vectors with Buffer.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Retrieval plus generation is normally 1.5-4s, but a cold Zilliz serverless
// cluster or a throttled provider can push past Vercel's default ceiling.
export const maxDuration = 30

const MAX_QUESTION_LENGTH = 500

function sse(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`)
}

function badRequest(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const cfg = ragConfig()

  if (!cfg.apiKey) {
    // Named explicitly: this is the first thing to check after a deploy.
    return badRequest(
      'The assistant is not configured — OPENROUTER_API_KEY is missing (embeddings and reranking need it).',
      503,
    )
  }

  const limit = rateLimit(clientKey(req.headers))
  if (!limit.ok) {
    return Response.json(
      { error: `Too many questions — try again in ${limit.retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  let body: { question?: unknown; history?: unknown }
  try {
    body = await req.json()
  } catch {
    return badRequest('Expected a JSON body.')
  }

  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (!question) return badRequest('Ask a question first.')
  if (question.length > MAX_QUESTION_LENGTH) {
    return badRequest(`Questions are capped at ${MAX_QUESTION_LENGTH} characters.`)
  }

  // Trust the client only for conversational continuity, and only within the
  // shapes and sizes we expect.
  const history: ChatMessage[] = Array.isArray(body.history)
    ? body.history
        .filter(
          (m): m is ChatMessage =>
            !!m &&
            typeof m === 'object' &&
            (m as ChatMessage).role !== 'system' &&
            ((m as ChatMessage).role === 'user' ||
              (m as ChatMessage).role === 'assistant') &&
            typeof (m as ChatMessage).content === 'string',
        )
        .slice(-MAX_HISTORY_TURNS)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2_000) }))
    : []

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        try {
          controller.enqueue(sse(payload))
        } catch {
          // Client hung up mid-stream; nothing to do.
        }
      }

      try {
        // Retrieval searches the resolved question; the generator still sees
        // the visitor's own words, so the reply answers what they asked.
        const { query, rewritten } = await rewriteQuery(
          cfg,
          question,
          history,
          req.signal,
        )

        const { passages, source, reranked } = await retrieve(
          cfg,
          query,
          req.signal,
        )

        send({
          type: 'sources',
          source,
          reranked,
          resolvedQuery: rewritten ? query : undefined,
          passages: passages.map((p) => ({
            id: p.id,
            title: p.title,
            section: p.section,
            meta: p.meta,
            score: p.rerankScore ?? p.vectorScore,
          })),
        })

        let announcedThinking = false
        let produced = false

        for await (const event of generate(
          cfg,
          buildMessages(question, passages, history),
          { signal: req.signal },
        )) {
          if (event.type === 'reasoning') {
            // Reasoning models emit a run of empty-content chunks first. Tell
            // the UI so the pet can think instead of the page looking stalled.
            if (!announcedThinking) {
              announcedThinking = true
              send({ type: 'thinking' })
            }
            continue
          }
          produced = true
          send({ type: 'delta', text: event.text })
        }

        if (!produced) {
          send({
            type: 'delta',
            text: "I couldn't put an answer together just then. Try asking again?",
          })
        }
        send({ type: 'done' })
      } catch (err) {
        if (!req.signal.aborted) {
          console.error('[api/chat]', err)
          send({
            type: 'error',
            message:
              'Something broke while answering. Mohab is reachable directly if this keeps happening.',
          })
        }
      } finally {
        try {
          controller.close()
        } catch {
          // Already closed.
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Stops proxies from buffering the stream into one lump.
      'X-Accel-Buffering': 'no',
    },
  })
}

export async function GET() {
  const cfg = ragConfig()
  const provider = activeProvider(cfg)
  const chatModel =
    provider === 'groq'
      ? cfg.groq.model
      : provider === 'llm7'
        ? cfg.llm7.model
        : provider === 'gemini'
          ? cfg.gemini.model
          : cfg.chatModel
  const health: Record<string, unknown> = {
    // Embeddings and reranking always go through OpenRouter, whichever
    // backend ends up generating the answer.
    openrouter: cfg.apiKey ? 'configured' : 'missing OPENROUTER_API_KEY',
    generator: `${provider} (${chatModel})`,
    embeddings: `${embeddingProvider(cfg)} (${embeddingModel(cfg)}, ${embeddingDim(cfg)}-d)`,
    models: {
      embed: embeddingModel(cfg),
      rerank: cfg.rerankModel,
      chat: chatModel,
    },
    // A bundled index built at a different width than the configured embedder
    // makes every local-fallback answer nonsense, so say so plainly.
    bundledIndex:
      cvIndex.dim === embeddingDim(cfg)
        ? `ok (${cvIndex.chunks.length} chunks, ${cvIndex.dim}-d, ${cvIndex.model})`
        : `MISMATCH — index is ${cvIndex.dim}-d (${cvIndex.model}) but the app embeds at ${embeddingDim(cfg)}-d; re-run pnpm rag:ingest`,
    zilliz: zillizConfigured(cfg) ? 'configured' : 'not configured',
    collection: cfg.zilliz.collection,
  }

  if (zillizConfigured(cfg)) {
    try {
      const collections = await listCollections(cfg)
      health.zilliz = collections.includes(cfg.zilliz.collection)
        ? 'ready'
        : `reachable, but "${cfg.zilliz.collection}" is missing — run pnpm rag:ingest`
      health.collections = collections
    } catch (err) {
      health.zilliz = `unreachable: ${
        err instanceof Error ? err.message : String(err)
      }`
    }
  }

  return Response.json(health)
}
