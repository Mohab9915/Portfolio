/**
 * Thin OpenRouter client covering the three calls this pipeline makes:
 * embeddings, reranking, and a streaming chat completion.
 *
 * Free-tier models throttle aggressively, so requests retry with exponential
 * backoff on 429/5xx.
 */

import { OPENROUTER_BASE, type RagConfig } from './config.ts'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** OpenRouter rejects a model-fallback list longer than this. */
const MAX_MODEL_FALLBACKS = 3

function headers(cfg: RagConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${cfg.apiKey}`,
    'Content-Type': 'application/json',
    // Attribution — surfaces this app in the OpenRouter dashboard.
    'HTTP-Referer': cfg.siteUrl,
    'X-Title': cfg.siteName,
  }
}

async function post(
  cfg: RagConfig,
  path: string,
  body: unknown,
  init: { signal?: AbortSignal; retries?: number } = {},
): Promise<Response> {
  const { signal, retries = 3 } = init
  let lastError = 'unknown error'

  for (let attempt = 0; attempt < retries; attempt++) {
    let res: Response
    try {
      res = await fetch(`${OPENROUTER_BASE}${path}`, {
        method: 'POST',
        headers: headers(cfg),
        body: JSON.stringify(body),
        signal,
      })
    } catch (err) {
      if (signal?.aborted) throw err
      lastError = err instanceof Error ? err.message : String(err)
      await sleep(400 * 2 ** attempt)
      continue
    }

    if (res.ok) return res

    const detail = await res.text().catch(() => '')
    lastError = `${res.status} ${res.statusText} ${detail.slice(0, 300)}`

    // Retry throttling and upstream faults only; other 4xx means the request
    // itself is wrong and retrying will not help.
    if (res.status !== 429 && res.status < 500) break
    await sleep(400 * 2 ** attempt)
  }

  throw new Error(`OpenRouter ${path} failed: ${lastError}`)
}

/**
 * Embed a batch of strings.
 *
 * nvidia/nemotron-3-embed-1b is symmetric — it ignores `input_type`, so
 * queries and passages are embedded the same way with no prefixes.
 */
export async function embed(
  cfg: RagConfig,
  input: string[],
  opts: { batchSize?: number; signal?: AbortSignal } = {},
): Promise<number[][]> {
  const { batchSize = 16, signal } = opts
  const out: number[][] = []

  for (let i = 0; i < input.length; i += batchSize) {
    const batch = input.slice(i, i + batchSize)
    const res = await post(
      cfg,
      '/embeddings',
      { model: cfg.embedModel, input: batch },
      { signal },
    )
    const json = (await res.json()) as {
      data: { index?: number; embedding: number[] }[]
    }
    // Items may come back out of order; `index` is authoritative.
    const ordered = [...json.data].sort(
      (a, b) => (a.index ?? 0) - (b.index ?? 0),
    )
    for (const item of ordered) out.push(item.embedding)
  }

  return out
}

export interface RerankHit {
  index: number
  score: number
}

/** Cross-encoder rerank over the vector-search candidates. */
export async function rerank(
  cfg: RagConfig,
  query: string,
  documents: string[],
  topN: number,
  signal?: AbortSignal,
): Promise<RerankHit[]> {
  const res = await post(
    cfg,
    '/rerank',
    {
      model: cfg.rerankModel,
      query,
      documents,
      top_n: Math.min(topN, documents.length),
    },
    { signal },
  )
  const json = (await res.json()) as {
    results: { index: number; relevance_score: number }[]
  }
  return json.results.map((r) => ({ index: r.index, score: r.relevance_score }))
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type StreamEvent =
  | { type: 'reasoning'; text: string }
  | { type: 'content'; text: string }

/**
 * Stream a chat completion, yielding reasoning and content separately.
 *
 * Reasoning models (stealth/ox-alpha included) emit a run of chunks whose
 * `content` is empty while `reasoning` fills in. Surfacing that as its own
 * event lets the UI show a real thinking state instead of a dead spinner.
 */
export async function* streamChat(
  cfg: RagConfig,
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {},
): AsyncGenerator<StreamEvent> {
  const { maxTokens = 700, temperature = 0.3, signal } = opts

  const res = await post(
    cfg,
    '/chat/completions',
    {
      model: cfg.chatModel,
      // OpenRouter walks this list server-side when a model errors or is
      // throttled, so a busy upstream degrades to a slower answer rather than
      // to no answer. The API rejects more than three ids, and the primary
      // occupies one of them.
      models: [cfg.chatModel, ...cfg.chatFallbacks].slice(0, MAX_MODEL_FALLBACKS),
      messages,
      stream: true,
      max_tokens: maxTokens,
      temperature,
      // stealth/ox-alpha is a reasoning model and spends ~9.5s thinking before
      // emitting a character — most of the wait a visitor feels. Low effort
      // cuts time-to-first-token to ~2.3s with no loss of quality on answers
      // this short, which are lookups rather than problems to solve. The model
      // rejects reasoning being disabled outright, so this is the lever.
      reasoning: { effort: 'low' },
    },
    { signal },
  )

  if (!res.body) throw new Error('OpenRouter returned no response body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE frames are newline-delimited; keep any trailing partial line.
    let newline = buffer.indexOf('\n')
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      newline = buffer.indexOf('\n')

      // ": OPENROUTER PROCESSING" keep-alive comments land here too.
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return

      let parsed: {
        choices?: { delta?: { content?: string; reasoning?: string } }[]
      }
      try {
        parsed = JSON.parse(payload)
      } catch {
        continue
      }

      const delta = parsed.choices?.[0]?.delta
      if (delta?.reasoning) yield { type: 'reasoning', text: delta.reasoning }
      if (delta?.content) yield { type: 'content', text: delta.content }
    }
  }
}
