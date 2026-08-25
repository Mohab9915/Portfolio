/**
 * LLM7 generation.
 *
 * Sits second in the chain, behind Groq. It is not faster — measured ~970 ms to
 * first token on the real prompt against Groq's ~450 ms — but it draws on a
 * completely separate quota. Groq's free tier runs out of tokens per minute
 * well before a busy page runs out of visitors, and before this existed the
 * fallback was a slower path. Now a rate-limited primary costs almost nothing.
 *
 * Note on billing: the account can report a $0.00 balance and still serve some
 * models (gemini-3.1-flash-lite works), while others refuse with 402
 * "Insufficient balance" (gemma4:31b). Anything unavailable fails fast and the
 * chain moves on, so an empty balance degrades rather than breaks.
 */

import { streamOpenAICompat } from './openai-compat.ts'
import type { RagConfig } from './config.ts'
import type { ChatMessage, StreamEvent } from './openrouter.ts'

const LLM7_URL = 'https://api.llm7.io/v1/chat/completions'

export function llm7Configured(cfg: RagConfig): boolean {
  return Boolean(cfg.llm7.apiKey)
}

export function streamLlm7(
  cfg: RagConfig,
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {},
): AsyncGenerator<StreamEvent> {
  return streamOpenAICompat(
    {
      label: 'LLM7',
      url: LLM7_URL,
      apiKey: cfg.llm7.apiKey,
      model: cfg.llm7.model,
    },
    messages,
    opts,
  )
}
