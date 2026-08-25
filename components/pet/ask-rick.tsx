'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, Volume2, VolumeX, X } from 'lucide-react'

import { RickPet, type PetActivity } from './rick-pet.tsx'
import {
  createSpeechQueue,
  takeSentences,
  type SpeechQueue,
} from './speech-queue.ts'

const PANEL_WIDTH = 380
/** Keystrokes stop counting as "typing" this long after the last one. */
const TYPING_IDLE_MS = 1200

interface Message {
  role: 'user' | 'assistant'
  content: string
  failed?: boolean
}

const SUGGESTIONS = [
  'What has he actually shipped?',
  'Tell me about the voice AI thing',
  'Is he any good with RAG?',
  'How do I reach him?',
]

/** Remembers the mute choice between visits. */
const VOICE_PREF_KEY = 'ask-rick:voice'

/** The model is told to emit prose and "- " bullets only; this renders that. */
function Answer({ text }: { text: string }) {
  const blocks: React.ReactNode[] = []
  let bullets: string[] = []

  const flushBullets = () => {
    if (bullets.length === 0) return
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="my-1.5 flex flex-col gap-1 pl-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[0.5em] size-1 shrink-0 rounded-full bg-primary" />
            <span>{inline(b)}</span>
          </li>
        ))}
      </ul>,
    )
    bullets = []
  }

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (/^[-*•]\s+/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[-*•]\s+/, ''))
      continue
    }
    flushBullets()
    if (trimmed) {
      blocks.push(
        <p key={`p-${blocks.length}`} className="my-1">
          {inline(trimmed)}
        </p>,
      )
    }
  }
  flushBullets()

  return <>{blocks}</>
}

/** Minimal inline formatting — **bold** is the only thing the model emits. */
function inline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

export default function AskRick() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<'idle' | 'typing' | 'thinking' | 'streaming'>(
    'idle',
  )

  const [voiceOn, setVoiceOn] = useState(true)
  /** Flipped off for good once the voice backend says it cannot serve us. */
  const [voiceAvailable, setVoiceAvailable] = useState(true)
  const [speaking, setSpeaking] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)
  const [petBottom, setPetBottom] = useState(4)
  const abortRef = useRef<AbortController | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Read inside the streaming callback, which would otherwise close over a
  // stale value from the render that started the request.
  const voiceOnRef = useRef(voiceOn)
  voiceOnRef.current = voiceOn
  const voiceAvailableRef = useRef(voiceAvailable)
  voiceAvailableRef.current = voiceAvailable
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const busy = phase === 'thinking' || phase === 'streaming'

  // He keeps talking from the first streamed token until the audio stops, so
  // the mouth movement covers the gap while speech is being synthesised.
  const petActivity: PetActivity =
    phase === 'streaming' || speaking
      ? 'talk'
      : phase === 'idle'
        ? 'wander'
        : 'think'

  /* Follow the stream as it grows. */
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, phase])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const stopSpeaking = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
    setSpeaking(false)
  }, [])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      audioRef.current?.pause()
    },
    [],
  )

  /* Restore the mute preference from a previous visit. */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VOICE_PREF_KEY)
      if (saved !== null) setVoiceOn(saved === 'on')
    } catch {
      // Storage blocked (private mode) — the default stands.
    }
  }, [])

  /*
   * Closing the panel stops him mid-sentence. The request is aborted too, not
   * just the audio: with voice on, text is revealed by the speech queue, so
   * leaving the request running would keep writing into a panel nobody sees.
   */
  useEffect(() => {
    if (open) return
    abortRef.current?.abort()
    stopSpeaking()
    setPhase('idle')
  }, [open, stopSpeaking])

  const toggleVoice = useCallback(() => {
    setVoiceOn((on) => {
      const next = !on
      if (!next) stopSpeaking()
      try {
        localStorage.setItem(VOICE_PREF_KEY, next ? 'on' : 'off')
      } catch {
        // Not being able to persist the choice is not worth failing over.
      }
      return next
    })
  }, [stopSpeaking])

  /* Playback lives in the speech queue; this just holds the current element. */
  const bindAudio = useCallback((audio: HTMLAudioElement | null) => {
    audioRef.current = audio
  }, [])

  /**
   * On a phone the panel is full width, so the pet's usual spot at the bottom
   * of the viewport is underneath it. Lift him to stand on the panel's top
   * edge instead — the panel grows as the answer streams, so track its height.
   */
  useEffect(() => {
    const update = () => {
      const narrow = window.innerWidth < 640
      const height = panelRef.current?.offsetHeight ?? 0
      // 16px panel inset from the bottom, plus a little breathing room.
      setPetBottom(open && narrow && height ? height + 28 : 4)
    }
    update()

    const panel = panelRef.current
    const observer = panel ? new ResizeObserver(update) : null
    if (panel && observer) observer.observe(panel)
    window.addEventListener('resize', update)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [open])

  const noteTyping = useCallback(() => {
    setPhase((p) => (p === 'thinking' || p === 'streaming' ? p : 'typing'))
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      setPhase((p) => (p === 'typing' ? 'idle' : p))
    }, TYPING_IDLE_MS)
  }, [])

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (!trimmed || busy) return

      abortRef.current?.abort()
      stopSpeaking()
      const controller = new AbortController()
      abortRef.current = controller
      // Hoisted so the finally block can tell who owns the phase transition.
      let queue: SpeechQueue | null = null

      // Snapshot the prior turns before appending, so the model gets the
      // conversation as it stood when the question was asked.
      const history = messages
        .filter((m) => !m.failed)
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }))

      setInput('')
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: '' },
      ])
      setPhase('thinking')

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: trimmed, history }),
          signal: controller.signal,
        })

        if (!res.ok || !res.body) {
          const detail = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(detail?.error ?? 'The assistant is unavailable right now.')
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let answer = ''

        const patchLast = (patch: Partial<Message>) =>
          setMessages((prev) => {
            const next = [...prev]
            next[next.length - 1] = { ...next[next.length - 1], ...patch }
            return next
          })

        // With voice on, the queue owns the pace: it reveals each sentence as
        // that sentence starts playing, so reading and listening stay in step.
        // With voice off, tokens go straight to the transcript as they arrive.
        const useVoice = voiceOnRef.current && voiceAvailableRef.current
        let spoken = ''
        let pending = ''

        queue = useVoice
          ? createSpeechQueue({
              signal: controller.signal,
              onAudio: bindAudio,
              onUnavailable: () => setVoiceAvailable(false),
              onReveal: (text) => {
                spoken += text
                setPhase('streaming')
                setSpeaking(true)
                patchLast({ content: spoken })
              },
              onIdle: () => {
                if (controller.signal.aborted) return
                setSpeaking(false)
                setPhase('idle')
              },
            })
          : null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          let split = buffer.indexOf('\n\n')
          while (split !== -1) {
            const frame = buffer.slice(0, split).trim()
            buffer = buffer.slice(split + 2)
            split = buffer.indexOf('\n\n')

            if (!frame.startsWith('data:')) continue
            let event: {
              type: string
              text?: string
              message?: string
            }
            try {
              event = JSON.parse(frame.slice(5).trim())
            } catch {
              continue
            }

            // A "sources" event arrives first; the panel does not render
            // citations, so it is ignored here.
            if (event.type === 'delta' && event.text) {
              answer += event.text
              if (queue) {
                pending += event.text
                const { sentences, rest } = takeSentences(pending)
                pending = rest
                // Synthesis starts here, one sentence in — not after the whole
                // reply has finished streaming.
                for (const sentence of sentences) queue.push(sentence)
              } else {
                setPhase('streaming')
                patchLast({ content: answer })
              }
            } else if (event.type === 'error') {
              answer = event.message ?? 'Something went wrong.'
              patchLast({ content: answer, failed: true })
            }
          }
        }

        if (queue) {
          // Whatever is left never reached a sentence boundary.
          const { sentences } = takeSentences(pending, true)
          for (const sentence of sentences) queue.push(sentence)
          queue.finish()
        }

        if (!answer) {
          patchLast({
            content: 'No answer came back — try asking again.',
            failed: true,
          })
        }
      } catch (err) {
        if (controller.signal.aborted) return
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = {
            role: 'assistant',
            content:
              err instanceof Error ? err.message : 'Something went wrong.',
            failed: true,
          }
          return next
        })
      } finally {
        // With voice on the queue is still playing here; it resets the phase
        // when the last sentence finishes.
        if (!controller.signal.aborted && !queue) setPhase('idle')
      }
    },
    [busy, messages, stopSpeaking, bindAudio],
  )

  return (
    <>
      <RickPet
        activity={petActivity}
        anchored={open}
        anchorInset={PANEL_WIDTH + 24}
        bottomOffset={petBottom}
        onSummon={() => setOpen((v) => !v)}
      />

      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-4 right-4 z-50 flex w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-md"
          role="dialog"
          aria-label="Ask about Mohab"
        >
          {/* Header — one compact row; the dot carries the status. */}
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-2.5">
            <span className="relative flex size-2 shrink-0">
              {(speaking || busy) && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              )}
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <p className="flex-1 font-mono text-sm font-medium text-foreground">
              ask_rick<span className="text-muted-foreground/60">()</span>
            </p>
            {voiceAvailable && (
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={voiceOn ? 'Mute Rick' : 'Unmute Rick'}
                aria-pressed={voiceOn}
                title={voiceOn ? 'Mute' : 'Unmute'}
                className={`rounded-md p-1.5 transition-colors hover:bg-secondary ${
                  voiceOn ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {voiceOn ? (
                  <Volume2 className="size-4" />
                ) : (
                  <VolumeX className="size-4" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Transcript */}
          <div
            ref={scrollRef}
            className="flex max-h-[56vh] min-h-[150px] flex-col gap-4 overflow-y-auto px-4 py-4 text-sm leading-relaxed"
          >
            {messages.length === 0 && (
              <div className="flex flex-col gap-4">
                <p className="text-pretty text-muted-foreground">
                  Look, I read the guy&apos;s whole CV so you don&apos;t have to.
                  Ask me something.
                </p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="group flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-foreground"
                    >
                      <span className="font-mono text-xs text-primary/70 transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === 'user' ? (
                <p
                  key={i}
                  className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-primary/15 px-3.5 py-2 text-foreground"
                >
                  {m.content}
                </p>
              ) : (
                <div
                  key={i}
                  className={
                    m.failed ? 'text-destructive' : 'text-muted-foreground'
                  }
                >
                  {m.content ? (
                    <Answer text={m.content} />
                  ) : (
                    <span
                      className="flex items-center gap-1"
                      aria-label="Rick is thinking"
                    >
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          className="size-1.5 animate-bounce rounded-full bg-primary/70"
                          style={{ animationDelay: `${d * 140}ms` }}
                        />
                      ))}
                    </span>
                  )}
                </div>
              ),
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(input)
            }}
            className="flex items-center gap-2 border-t border-border bg-background/30 px-3.5 py-2.5"
          >
            <span className="font-mono text-sm text-primary/80">&gt;</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                noteTyping()
              }}
              maxLength={500}
              placeholder="ask about my experience…"
              aria-label="Your question"
              className="min-w-0 flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            <button
              type="submit"
              disabled={busy || input.trim().length === 0}
              aria-label="Send"
              className="rounded-md p-1.5 text-primary transition-all hover:bg-primary/10 disabled:opacity-25 disabled:hover:bg-transparent"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
