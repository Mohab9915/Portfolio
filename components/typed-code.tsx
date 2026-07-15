"use client"

import { useEffect, useRef, useState } from "react"

type Tok = { t: string; c?: string }

/**
 * A line of "source code" expressed as colored tokens. Colors are limited to
 * the orange/neutral palette so it reads like a warm editor theme.
 */
const kw = "text-accent" // keywords (const, etc.)
const str = "text-primary" // string literals
const key = "text-foreground" // object keys
const pun = "text-muted-foreground" // punctuation / brackets
const com = "text-muted-foreground/70 italic" // comments

const LINES: Tok[][] = [
  [{ t: "// initializing developer profile", c: com }],
  [
    { t: "const ", c: kw },
    { t: "engineer", c: key },
    { t: " = ", c: pun },
    { t: "{", c: pun },
  ],
  [
    { t: "  name", c: key },
    { t: ": ", c: pun },
    { t: "'Mohab Haedarea'", c: str },
    { t: ",", c: pun },
  ],
  [
    { t: "  role", c: key },
    { t: ": ", c: pun },
    { t: "'AI & Software Engineer'", c: str },
    { t: ",", c: pun },
  ],
  [
    { t: "  focus", c: key },
    { t: ": [", c: pun },
    { t: "'LLM systems'", c: str },
    { t: ", ", c: pun },
    { t: "'RAG'", c: str },
    { t: ", ", c: pun },
    { t: "'voice agents'", c: str },
    { t: "],", c: pun },
  ],
  [
    { t: "  status", c: key },
    { t: ": ", c: pun },
    { t: "'open to early-career roles'", c: str },
    { t: ",", c: pun },
  ],
  [{ t: "}", c: pun }],
]

// Flatten to a single character stream so we can reveal char-by-char while
// preserving per-token colors and line breaks.
type FlatChar = { ch: string; c?: string; line: number }
const FLAT: FlatChar[] = []
LINES.forEach((line, li) => {
  line.forEach((tok) => {
    for (const ch of tok.t) FLAT.push({ ch, c: tok.c, line: li })
  })
  if (li < LINES.length - 1) FLAT.push({ ch: "\n", line: li })
})
const TOTAL = FLAT.length

export function TypedCode() {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

  const [count, setCount] = useState(prefersReduced ? TOTAL : 0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (prefersReduced) return
    let start: number | null = null
    const CHARS_PER_SEC = 42
    const tick = (ts: number) => {
      if (start === null) start = ts
      const elapsed = (ts - start) / 1000
      const next = Math.min(TOTAL, Math.floor(elapsed * CHARS_PER_SEC))
      setCount(next)
      if (next < TOTAL) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [prefersReduced])

  const done = count >= TOTAL

  // Split the revealed characters back into lines for rendering.
  const shown = FLAT.slice(0, count)
  const lines: FlatChar[][] = LINES.map(() => [])
  shown.forEach((fc) => {
    if (fc.ch !== "\n") lines[fc.line].push(fc)
  })
  const activeLine = shown.length ? shown[shown.length - 1].line : 0

  return (
    <div className="rise-in overflow-hidden rounded-lg border border-border bg-popover/80 font-mono text-sm shadow-2xl backdrop-blur-md">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-3">
        <span className="size-3 rounded-full bg-destructive/80" />
        <span className="size-3 rounded-full bg-primary/80" />
        <span className="size-3 rounded-full bg-accent/60" />
        <span className="ml-3 text-xs text-muted-foreground">profile.ts</span>
      </div>

      {/* code body */}
      <pre className="overflow-x-auto p-5 leading-relaxed sm:p-6">
        <code className="grid">
          {LINES.map((_, li) => {
            const isActive = !done && li === activeLine
            const visible = li < activeLine || done || li === activeLine
            return (
              <span key={li} className="flex min-h-[1.5em] gap-4">
                <span className="w-5 select-none text-right text-muted-foreground/40">
                  {li + 1}
                </span>
                <span className="whitespace-pre">
                  {lines[li].map((fc, i) => (
                    <span key={i} className={fc.c}>
                      {fc.ch}
                    </span>
                  ))}
                  {isActive && visible && <span className="caret bg-primary/80">&nbsp;</span>}
                </span>
              </span>
            )
          })}
          {done && (
            <span className="mt-3 flex gap-4 text-muted-foreground/70">
              <span className="w-5 select-none text-right text-muted-foreground/40">$</span>
              <span>
                node profile.ts <span className="caret bg-primary/80">&nbsp;</span>
              </span>
            </span>
          )}
        </code>
      </pre>
    </div>
  )
}
