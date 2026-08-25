/**
 * Google Gemini generation.
 *
 * Generation moved here from OpenRouter; embeddings and reranking still go
 * through OpenRouter, which has no Gemini equivalent wired up.
 *
 * Two things about Gemini 3.x shape this client:
 *
 * 1. It thinks before answering, and thinking tokens come out of the same
 *    budget as the reply — 3.7-flash burned ~684 of them on a three-sentence
 *    answer. So `maxOutputTokens` has to cover both, or the reply is truncated
 *    mid-sentence with no error to explain why.
 * 2. The flash models return 503 "experiencing high demand" often enough to
 *    matter, so requests retry instead of failing on the first refusal.
 *
 * Model choice is worth measuring rather than assuming: on identical prompts,
 * time-to-first-token was ~1.1s for gemini-3.1-flash-lite, ~3.9s for
 * gemini-3.5-flash, and ~16s for gemini-3.7-flash.
 */

import type { RagConfig } from './config.ts'
import type { ChatMessage, StreamEvent } from './openrouter.ts'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function geminiConfigured(cfg: RagConfig): boolean {
  return Boolean(cfg.gemini.apiKey)
}

interface GeminiPart {
  text?: string
  /** Set on parts that are the model's private reasoning, not the answer. */
  thought?: boolean
}

/** Map our message list onto Gemini's contents/systemInstruction split. */
function toGeminiPayload(messages: ChatMessage[]) {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n')

  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      // Gemini calls the assistant "model".
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  return { system, contents }
}

export async function* streamGemini(
  cfg: RagConfig,
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {},
): AsyncGenerator<StreamEvent> {
  const { maxTokens = 1600, temperature = 0.3, signal } = opts
  const { system, contents } = toGeminiPayload(messages)

  const body = {
    contents,
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    generationConfig: {
      // Covers thinking plus the reply; see the note at the top of the file.
      maxOutputTokens: maxTokens,
      temperature,
      // The answers here are lookups over five retrieved passages, not
      // problems to reason about, so the cheapest thinking tier is plenty.
      thinkingConfig: { thinkingLevel: 'low' },
    },
  }

  const url = `${GEMINI_BASE}/models/${encodeURIComponent(
    cfg.gemini.model,
  )}:streamGenerateContent?alt=sse`

  let res: Response | null = null
  let lastError = 'unknown error'

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(600 * 2 ** (attempt - 1))

    let attempted: Response
    try {
      attempted = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Header rather than ?key=, so the key stays out of URLs and logs.
          'x-goog-api-key': cfg.gemini.apiKey,
        },
        body: JSON.stringify(body),
        signal,
      })
    } catch (err) {
      if (signal?.aborted) throw err
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }

    if (attempted.ok) {
      res = attempted
      break
    }

    const detail = await attempted.text().catch(() => '')
    lastError = `${attempted.status} ${detail.slice(0, 200)}`

    // 429 is a quota window, not a blip — retrying inside a couple of seconds
    // cannot clear it, so fall through to the next provider immediately. 503
    // ("high demand") genuinely is transient and worth another try.
    if (attempted.status === 429) {
      lastError = '429 quota exceeded'
      break
    }
    if (attempted.status !== 503) break
  }

  if (!res || !res.body) {
    throw new Error(`Gemini ${cfg.gemini.model} failed: ${lastError}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let newline = buffer.indexOf('\n')
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      newline = buffer.indexOf('\n')

      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue

      let parsed: {
        candidates?: { content?: { parts?: GeminiPart[] } }[]
      }
      try {
        parsed = JSON.parse(payload)
      } catch {
        continue
      }

      for (const part of parsed.candidates?.[0]?.content?.parts ?? []) {
        if (!part.text) continue
        // Thought parts must never reach the panel as the answer.
        yield part.thought
          ? { type: 'reasoning', text: part.text }
          : { type: 'content', text: part.text }
      }
    }
  }
}
