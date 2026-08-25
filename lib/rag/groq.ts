/**
 * Groq generation.
 *
 * Groq runs on LPUs rather than GPUs and is by a wide margin the fastest
 * backend measured here: ~647 ms to first token for gpt-oss-120b, against
 * ~1.1 s for gemini-3.1-flash-lite and ~16 s for gemini-3.7-flash. On a
 * portfolio chat that lead is the whole experience.
 *
 * The API is OpenAI-compatible, so this is the same SSE shape as the
 * OpenRouter client.
 */

import type { RagConfig } from './config.ts'
import type { ChatMessage, StreamEvent } from './openrouter.ts'

const GROQ_BASE = 'https://api.groq.com/openai/v1'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function groqConfigured(cfg: RagConfig): boolean {
  return Boolean(cfg.groq.apiKey)
}

/**
 * Suppress a `<think>…</think>` block that arrives inside `content`.
 *
 * The chosen model reports reasoning out of band and never needs this. It
 * exists because swapping GROQ_MODEL is a one-line change and some models on
 * the same endpoint do stream their chain-of-thought as ordinary content —
 * qwen3.6-27b answers with 3.6 KB of "Here's a thinking process:" — which would
 * land in the chat panel as the answer. The tags can split across chunks, so
 * this filters the stream rather than the finished string.
 */
function createThinkFilter() {
  let inside = false
  let carry = ''

  return (chunk: string): { content: string; reasoning: string } => {
    let text = carry + chunk
    carry = ''
    let content = ''
    let reasoning = ''

    while (text.length > 0) {
      if (inside) {
        const close = text.indexOf('</think>')
        if (close === -1) {
          reasoning += text
          break
        }
        reasoning += text.slice(0, close)
        text = text.slice(close + '</think>'.length)
        inside = false
        continue
      }

      const open = text.indexOf('<think>')
      if (open === -1) {
        // A trailing partial tag must wait for the next chunk to be resolved.
        const partial = text.lastIndexOf('<')
        if (partial !== -1 && '<think>'.startsWith(text.slice(partial))) {
          content += text.slice(0, partial)
          carry = text.slice(partial)
        } else {
          content += text
        }
        break
      }

      content += text.slice(0, open)
      text = text.slice(open + '<think>'.length)
      inside = true
    }

    return { content, reasoning }
  }
}

export async function* streamGroq(
  cfg: RagConfig,
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {},
): AsyncGenerator<StreamEvent> {
  const { maxTokens = 900, temperature = 0.4, signal } = opts

  const isGptOss = cfg.groq.model.includes('gpt-oss')

  const body = {
    model: cfg.groq.model,
    messages,
    stream: true,
    max_tokens: maxTokens,
    temperature,
    // gpt-oss models reason before answering. "low" is ample for a lookup over
    // five retrieved passages, and "hidden" keeps the analysis channel out of
    // `content` entirely. Both are rejected by models that do not reason, so
    // they are only sent when they apply.
    ...(isGptOss
      ? { reasoning_effort: 'low', reasoning_format: 'hidden' }
      : {}),
  }

  let res: Response | null = null
  let lastError = 'unknown error'

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(500 * 2 ** (attempt - 1))

    let attempted: Response
    try {
      attempted = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.groq.apiKey}`,
          'Content-Type': 'application/json',
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
    if (attempted.status !== 429 && attempted.status < 500) break
  }

  if (!res || !res.body) {
    throw new Error(`Groq ${cfg.groq.model} failed: ${lastError}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  const filterThink = createThinkFilter()
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
        choices?: { delta?: { content?: string; reasoning?: string } }[]
      }
      try {
        parsed = JSON.parse(payload)
      } catch {
        continue
      }

      const delta = parsed.choices?.[0]?.delta
      if (delta?.reasoning) yield { type: 'reasoning', text: delta.reasoning }
      if (delta?.content) {
        const { content, reasoning } = filterThink(delta.content)
        if (reasoning) yield { type: 'reasoning', text: reasoning }
        if (content) yield { type: 'content', text: content }
      }
    }
  }
}
