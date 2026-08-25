/**
 * Keeps the written answer and the spoken answer in step.
 *
 * The naive approach — stream the text, then synthesise the whole reply once
 * it is done — has the text finish several seconds before the voice even
 * starts, so you read the answer and then listen to it again. Worse, nothing
 * can be spoken until the last token arrives.
 *
 * Instead the reply is cut into sentences as it streams. Each sentence is sent
 * for synthesis the moment it is complete (in parallel, so later sentences are
 * already rendering while earlier ones play), and its text is revealed at the
 * instant its audio begins. Reading and hearing then advance together, and the
 * first audio starts one sentence into the reply rather than after all of it.
 */

/** Below this, a fragment waits for the next one instead of being spoken alone. */
const MIN_CHUNK_CHARS = 24

/**
 * Above this, a sentence is broken at a clause boundary.
 *
 * The model happily writes 440-character run-on sentences held together by
 * commas. Left whole, one of those becomes a single 23-second utterance: the
 * whole paragraph appears at once and then plays for half a minute, which is
 * the very thing sentence streaming is meant to avoid.
 */
const MAX_CHUNK_CHARS = 180

/** Sentence end, or a line break (bullets are their own utterance). */
const BOUNDARY = /([.!?…]["')\]]?(?=\s|$)|\n+)/g

/** Clause boundaries, used only to break up an over-long sentence. */
const CLAUSE = /([,;:—–]\s+)/g

function splitLong(sentence: string): string[] {
  if (sentence.length <= MAX_CHUNK_CHARS) return [sentence]

  const pieces: string[] = []
  let current = ''
  let start = 0

  CLAUSE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = CLAUSE.exec(sentence)) !== null) {
    const end = match.index + match[0].length
    const clause = sentence.slice(start, end)
    start = end

    // Keep packing clauses until adding another would cross the limit.
    if (current && current.length + clause.length > MAX_CHUNK_CHARS) {
      pieces.push(current)
      current = clause
    } else {
      current += clause
    }
  }

  current += sentence.slice(start)
  if (current) pieces.push(current)

  // A sentence with no clause breaks at all stays whole — better one long
  // utterance than one cut mid-phrase.
  return pieces.length > 0 ? pieces : [sentence]
}

/**
 * Split off every complete sentence, returning the unfinished tail.
 *
 * The boundary requires whitespace or end-of-string after the punctuation,
 * which is what keeps decimals intact — "GPA: 3.22" has no space after the
 * dot, so it is never treated as a sentence end.
 */
export function takeSentences(
  buffer: string,
  flush = false,
): { sentences: string[]; rest: string } {
  const sentences: string[] = []
  let start = 0

  BOUNDARY.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = BOUNDARY.exec(buffer)) !== null) {
    const end = match.index + match[0].length
    const piece = buffer.slice(start, end)
    // Too short to stand alone: leave `start` where it is so this fragment
    // merges into the next sentence.
    if (piece.trim().length >= MIN_CHUNK_CHARS) {
      sentences.push(...splitLong(piece))
      start = end
    }
  }

  let rest = buffer.slice(start)
  if (flush && rest.trim()) {
    sentences.push(...splitLong(rest))
    rest = ''
  }

  return { sentences, rest }
}

interface QueueOptions {
  signal: AbortSignal
  /** Called as each chunk starts speaking — append it to the visible answer. */
  onReveal: (text: string) => void
  /** The voice backend cannot serve us and will not recover this session. */
  onUnavailable: () => void
  /** Everything queued has been spoken. */
  onIdle: () => void
  /** Lets the caller stop playback from outside. */
  onAudio: (audio: HTMLAudioElement | null) => void
}

export interface SpeechQueue {
  push(text: string): void
  finish(): void
}

async function fetchSpeech(
  text: string,
  signal: AbortSignal,
): Promise<{ blob: Blob | null; fatal: boolean }> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal,
    })
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as {
        reason?: string
      } | null
      const fatal =
        detail?.reason === 'no-credit' || detail?.reason === 'not-configured'
      return { blob: null, fatal }
    }
    return { blob: await res.blob(), fatal: false }
  } catch {
    return { blob: null, fatal: false }
  }
}

function play(
  blob: Blob,
  signal: AbortSignal,
  onAudio: (a: HTMLAudioElement | null) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    let settled = false

    const done = () => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(url)
      onAudio(null)
      resolve()
    }

    if (signal.aborted) {
      done()
      return
    }
    signal.addEventListener(
      'abort',
      () => {
        audio.pause()
        done()
      },
      { once: true },
    )

    audio.onended = done
    audio.onerror = done
    onAudio(audio)
    // Autoplay can still be refused; treat that as "no audio for this chunk"
    // rather than stalling the queue.
    audio.play().catch(done)
  })
}

export function createSpeechQueue(opts: QueueOptions): SpeechQueue {
  const { signal, onReveal, onUnavailable, onIdle, onAudio } = opts

  const items: { text: string; speech: Promise<{ blob: Blob | null; fatal: boolean }> }[] = []
  let draining = false
  let finished = false
  let voiceDead = false

  const drain = async () => {
    if (draining) return
    draining = true

    // No await between the emptiness check and clearing the flag, so a push
    // cannot slip in unnoticed here.
    while (items.length > 0 && !signal.aborted) {
      const item = items.shift()!
      const { blob, fatal } = await item.speech
      if (signal.aborted) break

      if (fatal && !voiceDead) {
        voiceDead = true
        onUnavailable()
      }

      // Reveal on playback start, so the words appear as they are spoken. When
      // there is no audio the text still shows — silence must never cost the
      // reader the answer.
      onReveal(item.text)
      if (blob) await play(blob, signal, onAudio)
    }

    draining = false
    if ((finished && items.length === 0) || signal.aborted) onIdle()
  }

  return {
    push(text: string) {
      if (!text.trim()) return
      if (voiceDead || signal.aborted) {
        // Voice is gone; fall back to plain streaming so the reply still lands.
        onReveal(text)
        return
      }
      items.push({ text, speech: fetchSpeech(text, signal) })
      void drain()
    },
    finish() {
      finished = true
      void drain()
    },
  }
}
