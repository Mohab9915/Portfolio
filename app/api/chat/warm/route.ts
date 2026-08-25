/**
 * POST /api/chat/warm — wake the retrieval path before anyone asks anything.
 *
 * Every hop in this pipeline sleeps when idle, and the bill lands on the first
 * visitor of the session. Measured on a cold pipeline versus one used seconds
 * earlier:
 *
 *   embed (Hugging Face serverless)   5135ms  ->  390ms
 *   Zilliz search (serverless tier)    485ms  ->   89ms
 *   rerank (OpenRouter)               3186ms  -> 3186→530ms
 *   ------------------------------------------------------
 *   total retrieval                    ~8.8s  ->  ~1.0s
 *
 * So the fix is not to make the hops faster, it is to stop the visitor paying
 * for the first one. The client calls this as soon as it sees intent — hover
 * on the pet, or the panel opening — which buys several seconds of runway
 * while they read the suggestions and type.
 *
 * It runs a real query through the real path so nothing is left cold, then
 * throws the result away.
 */

import { ragConfig } from '@/lib/rag/config.ts'
import { clientKey, rateLimit } from '@/lib/rag/ratelimit.ts'
import { retrieve } from '@/lib/rag/retrieve.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/** Representative of a real question, so it warms the same code paths. */
const WARM_QUERY = 'what does he do'

export async function POST(req: Request) {
  const cfg = ragConfig()
  if (!cfg.apiKey) return Response.json({ warmed: false }, { status: 204 })

  // A warm-up is cheap but not free; keep it to a few per IP per minute.
  const limit = rateLimit(`warm:${clientKey(req.headers)}`, 3)
  if (!limit.ok) return Response.json({ warmed: false, reason: 'rate-limited' })

  const started = Date.now()
  try {
    const { source, reranked } = await retrieve(cfg, WARM_QUERY, req.signal)
    return Response.json({
      warmed: true,
      ms: Date.now() - started,
      source,
      reranked,
    })
  } catch (err) {
    // A failed warm-up must never surface to the visitor — the real request
    // will report its own problems.
    console.error('[api/chat/warm]', err)
    return Response.json({ warmed: false, ms: Date.now() - started })
  }
}
