'use client'

import { useEffect, useRef, useState } from 'react'

import {
  CELL_H,
  CELL_W,
  SHEET_COLS,
  SHEET_ROWS,
  SHEET_SRC,
  STATES,
  type PetState,
} from './sprite.ts'

export type PetActivity = 'wander' | 'think' | 'talk'

interface Props {
  /** Driven by the chat: thinking while the model reasons, talking while it streams. */
  activity: PetActivity
  /** True once the chat panel is open, so he holds still. */
  anchored: boolean
  /**
   * Called with where he is standing when clicked, so the panel can open at
   * him. He used to walk across to a fixed panel, which read as running away
   * mid-conversation; now the panel comes to him and he never moves for it.
   */
  onSummon: (rect: DOMRect) => void
}

/** Pixels per second. */
const SPEED = { walk: 46, run: 118 }
/** No pointer or key input for this long and he curls up. */
const SLEEP_AFTER_MS = 45_000
/** How far above the ground he stands. */
const GROUND_OFFSET = 4
/** Close enough to a wander target to call it arrived. */
const ARRIVE_EPSILON = 6

interface Brain {
  x: number
  dir: 1 | -1
  state: PetState
  frame: number
  frameClock: number
  /** Seconds spent in the current plan. */
  planClock: number
  plan: 'move' | 'rest'
  planDuration: number
  targetX: number
  /** A one-shot animation (wave, cheer) that pre-empts everything else. */
  oneShot: PetState | null
  /**
   * Wall-clock deadline for that one-shot.
   *
   * Frame counting alone is not enough to end it. Per-frame `dt` is clamped so
   * a backgrounded tab cannot teleport him, which means at a low frame rate
   * animation time advances slower than real time — an 0.8 s wave was still
   * playing many seconds later, holding the pet on the wave sprite while the
   * assistant had already started speaking.
   */
  oneShotUntil: number
  lastInput: number
  width: number
  ready: boolean
}

export function RickPet({ activity, anchored, onSummon }: Props) {
  const rootRef = useRef<HTMLButtonElement>(null)
  const spriteRef = useRef<HTMLSpanElement>(null)
  const brainRef = useRef<Brain | null>(null)

  const [size, setSize] = useState({ w: 96, h: 104 })
  const [ready, setReady] = useState(false)
  const [showHint, setShowHint] = useState(false)

  // Props are read inside the animation loop, which must not be re-created on
  // every render — a mirror ref keeps the loop stable and current.
  const propsRef = useRef({ activity, anchored })
  propsRef.current = { activity, anchored }

  /* Decode the atlas before first paint so he never flashes a blank box. */
  useEffect(() => {
    const img = new Image()
    img.src = SHEET_SRC
    img
      .decode()
      .then(() => setReady(true))
      .catch(() => setReady(true))
  }, [])

  /* Scale to viewport. */
  useEffect(() => {
    const measure = () => {
      const scale = window.innerWidth < 640 ? 0.4 : 0.5
      setSize({ w: Math.round(CELL_W * scale), h: Math.round(CELL_H * scale) })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  /* Nudge first-time visitors that he is interactive. */
  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => setShowHint(true), 4000)
    return () => clearTimeout(t)
  }, [ready])

  useEffect(() => {
    if (anchored) setShowHint(false)
  }, [anchored])

  /* The animation loop. */
  useEffect(() => {
    if (!ready) return
    const root = rootRef.current
    const sprite = spriteRef.current
    if (!root || !sprite) return

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const viewport = () => window.innerWidth
    const maxX = () => Math.max(8, viewport() - size.w - 24)

    const brain: Brain =
      brainRef.current ??
      ({
        x: Math.min(maxX(), viewport() * 0.18),
        dir: 1,
        state: 'idle',
        frame: 0,
        frameClock: 0,
        planClock: 0,
        plan: 'rest',
        planDuration: 2,
        targetX: 0,
        oneShot: null,
        oneShotUntil: 0,
        lastInput: Date.now(),
        width: size.w,
        ready: true,
      } satisfies Brain)
    brain.width = size.w
    brainRef.current = brain

    const markInput = () => {
      brain.lastInput = Date.now()
    }
    const inputEvents = ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart']
    for (const evt of inputEvents) {
      window.addEventListener(evt, markInput, { passive: true })
    }

    const setState = (next: PetState) => {
      if (brain.state === next) return
      brain.state = next
      brain.frame = 0
      brain.frameClock = 0
    }

    const pickPlan = () => {
      brain.planClock = 0
      if (brain.plan === 'move') {
        brain.plan = 'rest'
        brain.planDuration = 1.5 + Math.random() * 3.5
        // Now and then he stops to play a bit of guitar instead of standing.
        setState(Math.random() < 0.09 ? 'guitar' : 'idle')
      } else {
        brain.plan = 'move'
        brain.targetX = 40 + Math.random() * Math.max(1, maxX() - 40)
        brain.planDuration = 12
        setState(Math.random() < 0.15 ? 'run' : 'walk')
      }
    }

    let last = performance.now()
    let raf = 0

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      // Clamp so a backgrounded tab does not teleport him on return.
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      const { activity: act, anchored: isAnchored } = propsRef.current
      const asleep = Date.now() - brain.lastInput > SLEEP_AFTER_MS

      // A one-shot ends on its own clock, and speaking always outranks it —
      // a wave must never keep his mouth shut once there is audio playing.
      if (brain.oneShot && (Date.now() >= brain.oneShotUntil || act === 'talk')) {
        brain.oneShot = null
      }

      // ---- decide what he is doing --------------------------------------
      if (brain.oneShot) {
        setState(brain.oneShot)
      } else if (act === 'think' || act === 'talk' || isAnchored) {
        // He does not travel once the chat is open — the panel opened at him,
        // so there is nowhere to go. Walking or running mid-conversation read
        // as him wandering off from his own answer.
        setState(act === 'think' ? 'think' : act === 'talk' ? 'talk' : 'idle')
      } else if (asleep) {
        setState('sleep')
      } else if (reduceMotion) {
        setState('idle')
      } else {
        brain.planClock += dt
        if (brain.plan === 'move') {
          const delta = brain.targetX - brain.x
          if (Math.abs(delta) <= ARRIVE_EPSILON) {
            pickPlan()
          } else {
            brain.dir = delta > 0 ? 1 : -1
            const speed = brain.state === 'run' ? SPEED.run : SPEED.walk
            brain.x += Math.sign(delta) * speed * dt
          }
        }
        if (brain.planClock >= brain.planDuration) pickPlan()
      }

      brain.x = Math.max(8, Math.min(brain.x, maxX()))

      // ---- advance the sprite -------------------------------------------
      const def = STATES[brain.state]
      brain.frameClock += dt
      const frameDuration = 1 / def.fps
      while (brain.frameClock >= frameDuration) {
        brain.frameClock -= frameDuration
        const next = brain.frame + 1
        if (next >= def.frames) {
          if (def.loop) {
            brain.frame = 0
          } else {
            brain.frame = def.hold ? def.frames - 1 : 0
            // A one-shot has played out; hand control back.
            if (brain.oneShot && !def.hold) {
              brain.oneShot = null
              brain.plan = 'rest'
              brain.planClock = 0
              brain.planDuration = 1
            }
          }
        } else {
          brain.frame = next
        }
      }

      // Exposed so the current animation can be read straight off the DOM
      // rather than reverse-engineered from background-position.
      if (root.dataset.state !== brain.state) root.dataset.state = brain.state
      root.style.transform = `translate3d(${brain.x}px, 0, 0)`
      // Rows whose art already faces left need the opposite flip, or he walks
      // backwards. See SpriteState.facesLeft.
      const facing = def.facesLeft ? -brain.dir : brain.dir
      sprite.style.transform = `scaleX(${facing})`
      sprite.style.backgroundPosition = `-${brain.frame * size.w}px -${
        def.row * size.h
      }px`
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      for (const evt of inputEvents) window.removeEventListener(evt, markInput)
    }
  }, [ready, size.w, size.h])

  const handleClick = () => {
    const brain = brainRef.current
    if (brain) {
      // Wake him, wave, and let the chat open behind the animation.
      const wave = STATES.wave
      brain.lastInput = Date.now()
      brain.oneShot = 'wave'
      // Length of the animation in real time, plus a little slack.
      brain.oneShotUntil = Date.now() + (wave.frames / wave.fps) * 1000 + 150
      brain.frame = 0
      brain.frameClock = 0
    }
    setShowHint(false)
    // Hand the panel his current position so it can open next to him.
    const rect = rootRef.current?.getBoundingClientRect()
    if (rect) onSummon(rect)
  }

  if (!ready) return null

  return (
    <button
      ref={rootRef}
      type="button"
      onClick={handleClick}
      aria-label="Ask Rick about Mohab's experience"
      className="group fixed left-0 z-40 cursor-pointer select-none border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{
        width: size.w,
        height: size.h,
        bottom: GROUND_OFFSET,
        willChange: 'transform',
      }}
    >
      {showHint && (
        <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 w-max -translate-x-1/2 animate-pulse rounded-md border border-border bg-popover/95 px-2.5 py-1 font-mono text-[11px] text-foreground shadow-lg backdrop-blur-sm">
          psst — ask me about Mohab
          <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r border-border bg-popover/95" />
        </span>
      )}
      <span
        ref={spriteRef}
        aria-hidden="true"
        className="block"
        style={{
          width: size.w,
          height: size.h,
          backgroundImage: `url(${SHEET_SRC})`,
          backgroundSize: `${SHEET_COLS * size.w}px ${SHEET_ROWS * size.h}px`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
          transformOrigin: 'center bottom',
        }}
      />
    </button>
  )
}
