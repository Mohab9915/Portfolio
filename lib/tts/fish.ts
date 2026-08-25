/**
 * Fish Audio text-to-speech.
 *
 * The API key never reaches the browser — the client posts text to /api/tts and
 * this module does the outbound call, streaming the audio back.
 */

const FISH_BASE = 'https://api.fish.audio'

/**
 * Characters per request.
 *
 * The free tier has no hard character cap, but it is governed by a Fair Use
 * policy and the generator is already told to answer in two to four sentences.
 * This is the backstop that keeps a runaway reply from turning into a
 * two-minute monologue nobody listens to.
 */
export const MAX_SPEECH_CHARS = 700

export interface FishConfig {
  apiKey: string
  model: string
  voiceId: string
}

export function fishConfig(): FishConfig {
  return {
    apiKey: (process.env.FISH_API_KEY ?? '').trim(),
    // Selected via an HTTP header, not the body. The "-free" suffix is
    // load-bearing: the paid strings (s2.1-pro, s1) return 402 without API
    // credit, which Fish bills separately from platform credit.
    model: (process.env.FISH_MODEL ?? 's2.1-pro-free').trim(),
    voiceId: (process.env.FISH_VOICE_ID ?? '').trim(),
  }
}

export function fishConfigured(cfg: FishConfig): boolean {
  return Boolean(cfg.apiKey && cfg.voiceId)
}

/**
 * Flatten the assistant's markdown into something worth reading aloud.
 *
 * The generator emits "- " bullets and **bold**, which a speech model would
 * either verbalise ("dash", "asterisk asterisk") or stumble over. Bullets
 * become sentences so the delivery keeps its rhythm.
 */
export function plainForSpeech(text: string): string {
  const spoken = text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    // Fish takes non-verbal sounds as bracketed markers, so the persona's
    // "*burp*" stage direction becomes one. Without this it is read aloud as
    // the literal word. The brackets survive the punctuation strip below —
    // that character class deliberately excludes [ and ].
    // Only the markers are dropped, not the words between them: the model uses
    // *emphasis* on real content ("builds *production* LLM systems"), and
    // deleting the span would eat the word.
    .replace(/[*_`#]/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    // A bullet reads better as its own sentence than as a dangling fragment.
    .map((line) => {
      const stripped = line.replace(/^[-*•]\s+/, '')
      return /[.!?…]$/.test(stripped) ? stripped : `${stripped}.`
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (spoken.length <= MAX_SPEECH_CHARS) return spoken

  // Truncate on a sentence boundary rather than mid-word.
  const clipped = spoken.slice(0, MAX_SPEECH_CHARS)
  const lastStop = Math.max(
    clipped.lastIndexOf('. '),
    clipped.lastIndexOf('! '),
    clipped.lastIndexOf('? '),
  )
  return lastStop > MAX_SPEECH_CHARS * 0.5
    ? clipped.slice(0, lastStop + 1)
    : `${clipped.trimEnd()}…`
}

export interface SpeechResult {
  ok: boolean
  status: number
  body: ReadableStream<Uint8Array> | null
  error?: string
}

export async function synthesize(
  cfg: FishConfig,
  text: string,
  signal?: AbortSignal,
): Promise<SpeechResult> {
  const res = await fetch(`${FISH_BASE}/v1/tts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
      // Fish picks the backend model from this header, not the JSON body.
      model: cfg.model,
    },
    body: JSON.stringify({
      text,
      reference_id: cfg.voiceId,
      format: 'mp3',
      mp3_bitrate: 128,
      normalize: true,
      latency: 'normal',
    }),
    signal,
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    let message = detail.slice(0, 300)
    try {
      const parsed = JSON.parse(detail) as { message?: string }
      if (parsed.message) message = parsed.message
    } catch {
      // Not JSON; the raw text is the best we have.
    }
    return { ok: false, status: res.status, body: null, error: message }
  }

  return { ok: true, status: res.status, body: res.body }
}
