/**
 * Groq generation.
 *
 * Groq runs on LPUs and is the fastest backend measured here: ~450 ms to first
 * token against ~1.0 s for the next best. It is the primary for that reason.
 *
 * The catch is the free tier's budget of 8000 tokens per minute. At roughly
 * 2000 tokens a request that is about four answers a minute before it starts
 * returning 429, which is why the provider chain in generate.ts matters and why
 * the system prompt is kept short.
 */

import { streamOpenAICompat } from './openai-compat.ts'
import type { RagConfig } from './config.ts'
import type { ChatMessage, StreamEvent } from './openrouter.ts'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export function groqConfigured(cfg: RagConfig): boolean {
  return Boolean(cfg.groq.apiKey)
}

export function streamGroq(
  cfg: RagConfig,
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {},
): AsyncGenerator<StreamEvent> {
  const isGptOss = cfg.groq.model.includes('gpt-oss')

  return streamOpenAICompat(
    {
      label: 'Groq',
      url: GROQ_URL,
      apiKey: cfg.groq.apiKey,
      model: cfg.groq.model,
      // gpt-oss models reason before answering. "low" is ample for a lookup
      // over a handful of retrieved passages, and "hidden" keeps the analysis
      // channel out of `content` entirely. Models that do not reason reject
      // both, so they are only sent when they apply.
      extraBody: isGptOss
        ? { reasoning_effort: 'low', reasoning_format: 'hidden' }
        : undefined,
    },
    messages,
    opts,
  )
}
