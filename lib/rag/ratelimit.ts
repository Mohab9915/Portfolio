/**
 * Per-IP sliding window, held in module memory.
 *
 * This is a public endpoint that spends tokens on every call, so it needs a
 * brake. Serverless instances each keep their own counters, which makes this a
 * speed bump rather than a guarantee — enough to stop a bored visitor holding
 * down enter, not enough to stop a determined attacker. If the site ever needs
 * the real thing, swap the Map for Upstash/Vercel KV behind this same call.
 */

const WINDOW_MS = 60_000
const MAX_REQUESTS = 8
/** Bound memory if a lot of distinct IPs show up between prunes. */
const MAX_TRACKED_KEYS = 5_000

const hits = new Map<string, number[]>()

export interface RateLimitResult {
  ok: boolean
  /** Seconds until the caller may retry. */
  retryAfter: number
  remaining: number
}

export function rateLimit(
  key: string,
  limit = MAX_REQUESTS,
  windowMs = WINDOW_MS,
): RateLimitResult {
  const now = Date.now()
  const cutoff = now - windowMs

  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, times] of hits) {
      if (times.every((t) => t <= cutoff)) hits.delete(k)
    }
  }

  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff)

  if (recent.length >= limit) {
    const retryAfter = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000))
    hits.set(key, recent)
    return { ok: false, retryAfter, remaining: 0 }
  }

  recent.push(now)
  hits.set(key, recent)
  return { ok: true, retryAfter: 0, remaining: limit - recent.length }
}

/** Best-effort client identity behind Vercel's proxy. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headers.get('x-real-ip') ?? 'unknown'
}
