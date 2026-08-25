/**
 * POST /api/tts — speak an assistant reply in Rick's voice.
 *
 * Returns audio/mpeg on success. On any failure it returns JSON with a
 * `reason`, which the client uses to quietly disable the speaker rather than
 * interrupting the conversation — the answer is already on screen, so audio is
 * an enhancement that is allowed to fail.
 *
 * GET /api/tts — health probe.
 */

import { clientKey, rateLimit } from '@/lib/rag/ratelimit.ts'
import {
  fishConfig,
  fishConfigured,
  MAX_SPEECH_CHARS,
  plainForSpeech,
  synthesize,
} from '@/lib/tts/fish.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Speech synthesis for one sentence, with retries.
export const maxDuration = 30

/** Speech is billed per character, so it gets a tighter budget than chat. */
const TTS_PER_MINUTE = 10

export async function POST(req: Request) {
  const cfg = fishConfig()

  if (!fishConfigured(cfg)) {
    return Response.json(
      { reason: 'not-configured', error: 'Voice is not configured.' },
      { status: 503 },
    )
  }

  const limit = rateLimit(`tts:${clientKey(req.headers)}`, TTS_PER_MINUTE)
  if (!limit.ok) {
    return Response.json(
      { reason: 'rate-limited', error: `Try again in ${limit.retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  let body: { text?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { reason: 'bad-request', error: 'Expected a JSON body.' },
      { status: 400 },
    )
  }

  const raw = typeof body.text === 'string' ? body.text : ''
  // Guard the upstream bill before doing any work: reject absurd payloads
  // outright, then trim what is left down to the speech budget.
  if (!raw.trim()) {
    return Response.json(
      { reason: 'bad-request', error: 'Nothing to say.' },
      { status: 400 },
    )
  }
  if (raw.length > MAX_SPEECH_CHARS * 6) {
    return Response.json(
      { reason: 'bad-request', error: 'Text is too long to speak.' },
      { status: 413 },
    )
  }

  const text = plainForSpeech(raw)
  if (!text) {
    return Response.json(
      { reason: 'bad-request', error: 'Nothing to say.' },
      { status: 400 },
    )
  }

  try {
    const result = await synthesize(cfg, text, req.signal)

    if (!result.ok || !result.body) {
      // 402 is the one worth naming: the Fish account has no API credit, which
      // is a billing state rather than a bug, and the client should stop
      // retrying until it changes.
      const reason = result.status === 402 ? 'no-credit' : 'upstream'
      console.error(`[api/tts] Fish ${result.status}: ${result.error ?? ''}`)
      return Response.json(
        { reason, status: result.status, error: result.error ?? 'Voice failed.' },
        { status: result.status === 402 ? 402 : 502 },
      )
    }

    return new Response(result.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    if (req.signal.aborted) return new Response(null, { status: 499 })
    console.error('[api/tts]', err)
    return Response.json(
      { reason: 'upstream', error: 'Voice is unavailable.' },
      { status: 502 },
    )
  }
}

export async function GET() {
  const cfg = fishConfig()
  return Response.json({
    fish: fishConfigured(cfg) ? 'configured' : 'missing FISH_API_KEY/FISH_VOICE_ID',
    model: cfg.model,
    voiceId: cfg.voiceId || null,
    maxChars: MAX_SPEECH_CHARS,
  })
}
