/**
 * Picks the generation backend and degrades between them.
 *
 * Ordered fastest-first: Groq (~0.6 s to first token), then Gemini (~1.1 s),
 * then OpenRouter. Each is only tried if the one before it is unconfigured or
 * fails outright, so a throttled or overloaded provider costs a retry rather
 * than taking the assistant down — which is what happened during development
 * when a stealth model's shared pool started returning 429.
 */

import { geminiConfigured, streamGemini } from './gemini.ts'
import { groqConfigured, streamGroq } from './groq.ts'
import { streamChat, type ChatMessage, type StreamEvent } from './openrouter.ts'
import type { RagConfig } from './config.ts'

export interface GenerateOptions {
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
}

type Provider = {
  name: string
  enabled: (cfg: RagConfig) => boolean
  stream: (
    cfg: RagConfig,
    messages: ChatMessage[],
    opts: GenerateOptions,
  ) => AsyncGenerator<StreamEvent>
}

const PROVIDERS: Provider[] = [
  { name: 'groq', enabled: groqConfigured, stream: streamGroq },
  { name: 'gemini', enabled: geminiConfigured, stream: streamGemini },
  { name: 'openrouter', enabled: (cfg) => Boolean(cfg.apiKey), stream: streamChat },
]

export async function* generate(
  cfg: RagConfig,
  messages: ChatMessage[],
  opts: GenerateOptions = {},
): AsyncGenerator<StreamEvent> {
  const available = PROVIDERS.filter((p) => p.enabled(cfg))
  if (available.length === 0) {
    throw new Error('No generation backend is configured.')
  }

  let lastError: unknown = null

  for (const [index, provider] of available.entries()) {
    const isLast = index === available.length - 1
    // Only fall through if this provider produced nothing. Once tokens are on
    // screen, switching backends would restart the answer mid-sentence.
    let produced = false

    try {
      for await (const event of provider.stream(cfg, messages, opts)) {
        if (event.type === 'content') produced = true
        yield event
      }
      return
    } catch (err) {
      if (produced || opts.signal?.aborted || isLast) throw err
      lastError = err
      console.error(
        `[generate] ${provider.name} unavailable, trying next:`,
        err instanceof Error ? err.message : err,
      )
    }
  }

  throw lastError ?? new Error('All generation backends failed.')
}

/** The backend that would serve the next request, for the health endpoint. */
export function activeProvider(cfg: RagConfig): string {
  return PROVIDERS.find((p) => p.enabled(cfg))?.name ?? 'none'
}
