/**
 * Shared streaming client for OpenAI-compatible chat endpoints.
 *
 * Groq and LLM7 both speak the same wire format, so the SSE parsing, the retry
 * policy and the chain-of-thought guard live here once rather than in each
 * provider file. Providers supply only what differs: base URL, key, model, and
 * any body extras their backend understands.
 */

import type { ChatMessage, StreamEvent } from './openrouter.ts'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Suppress a `<think>…</think>` block that arrives inside `content`.
 *
 * Well-behaved models report reasoning out of band. Several on these endpoints
 * do not — qwen3.6-27b streams 3.6 KB of "Here's a thinking process:" as the
 * answer — and swapping a model is a one-line env change, so the guard belongs
 * in the shared path. Tags can split across chunks, so this filters the stream
 * rather than the finished string.
 */
export function createThinkFilter() {
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

export interface CompatProvider {
  /** Human name, used in error messages. */
  label: string
  /** Full chat-completions URL. */
  url: string
  apiKey: string
  model: string
  /** Provider-specific body fields (reasoning effort, formats, …). */
  extraBody?: Record<string, unknown>
}

export async function* streamOpenAICompat(
  provider: CompatProvider,
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {},
): AsyncGenerator<StreamEvent> {
  const { maxTokens = 900, temperature = 0.4, signal } = opts

  const body = {
    model: provider.model,
    messages,
    stream: true,
    max_tokens: maxTokens,
    temperature,
    ...(provider.extraBody ?? {}),
  }

  let res: Response | null = null
  let lastError = 'unknown error'

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(500 * 2 ** (attempt - 1))

    let attempted: Response
    try {
      attempted = await fetch(provider.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
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

    /*
     * 429 is a quota window and 402 means the account is out of credit —
     * neither clears in the couple of seconds a retry would cost, so hand
     * straight over to the next provider. Retrying a rate limit burned ~1.5s
     * before failing anyway.
     */
    if (attempted.status === 429) {
      const retryAfter = attempted.headers.get('retry-after')
      lastError = `429 rate limited${retryAfter ? ` (retry after ${retryAfter}s)` : ''}`
      break
    }
    if (attempted.status === 402) {
      lastError = '402 out of credit'
      break
    }
    if (attempted.status < 500) break
  }

  if (!res || !res.body) {
    throw new Error(`${provider.label} (${provider.model}) failed: ${lastError}`)
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
