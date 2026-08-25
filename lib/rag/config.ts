/**
 * Central configuration for the CV RAG pipeline.
 *
 * Everything is read lazily from the environment so route handlers pick up
 * Vercel project env vars at request time rather than at module load.
 */

export const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

/**
 * Vector width per embedding provider. The Zilliz schema is built from the
 * active one, so changing provider means re-ingesting.
 */
export const OPENROUTER_EMBED_DIM = 2048
export const HF_EMBED_DIM = 1024

/**
 * Vector candidates pulled from Zilliz before reranking.
 *
 * The CV is ~21 passages, so the first stage is deliberately generous and the
 * cross-encoder does the precision work. Lower this as the corpus grows.
 */
export const RETRIEVE_K = 16
/** Passages kept after reranking and handed to the generator. */
export const RERANK_K = 5
/** Reranker scores below this are treated as noise and dropped. */
export const MIN_RERANK_SCORE = 0.01

export interface RagConfig {
  apiKey: string
  embedModel: string
  embedDim: number
  hf: {
    apiKey: string
    model: string
    dim: number
  }
  rerankModel: string
  chatModel: string
  /** Tried in order if the primary is throttled or down. */
  chatFallbacks: string[]
  siteUrl: string
  siteName: string
  groq: {
    apiKey: string
    model: string
  }
  gemini: {
    apiKey: string
    model: string
  }
  zilliz: {
    endpoint: string
    token: string
    collection: string
  }
}

export function ragConfig(): RagConfig {
  return {
    apiKey: process.env.OPENROUTER_API_KEY ?? '',
    embedModel:
      process.env.OPENROUTER_EMBED_MODEL ?? 'nvidia/nemotron-3-embed-1b:free',
    embedDim: Number(process.env.OPENROUTER_EMBED_DIM ?? OPENROUTER_EMBED_DIM),
    hf: {
      apiKey: (process.env.HF_API_KEY ?? '').trim(),
      // Beat the OpenRouter model on measured recall over this CV and is 8x
      // faster; see the table in lib/rag/huggingface.ts.
      model: (process.env.HF_EMBED_MODEL ?? 'BAAI/bge-large-en-v1.5').trim(),
      dim: Number(process.env.HF_EMBED_DIM ?? HF_EMBED_DIM),
    },
    rerankModel: process.env.OPENROUTER_RERANK_MODEL ?? 'qwen/qwen3-reranker-8b',
    chatModel: process.env.OPENROUTER_CHAT_MODEL ?? 'stealth/ox-alpha',
    /*
     * Stealth models run on a shared upstream pool and return 429 when it is
     * busy, which took the assistant down entirely during testing. OpenRouter
     * fails over to the next id server-side, so this costs no extra round trip.
     *
     * These must be instruction-tuned models, never reasoning ones. A reasoning
     * model that reports its thinking in the `reasoning` field is fine, but
     * several stream chain-of-thought as ordinary `content` — nemotron-3.5-
     * lightning answered "Here's a thinking process: 1. Analyze User Input..."
     * straight into the chat panel. There is no reliable way to strip that
     * after the fact, so the guard is in the choice of model.
     */
    chatFallbacks: (
      process.env.OPENROUTER_CHAT_FALLBACKS ??
      'google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free'
    )
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean),
    groq: {
      apiKey: (process.env.GROQ_API_KEY ?? '').trim(),
      // gpt-oss-120b is the most capable chat model on the key and still the
      // fastest backend measured. Swapping this is one line, but see the
      // think-filter note in groq.ts before picking a reasoning model.
      model: (process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b').trim(),
    },
    gemini: {
      apiKey: (process.env.GEMINI_API_KEY ?? '').trim(),
      model: (process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite').trim(),
    },
    siteUrl: process.env.OPENROUTER_SITE_URL ?? 'https://www.mohab.website',
    siteName: process.env.OPENROUTER_SITE_NAME ?? 'Mohab Haedarea Portfolio',
    zilliz: {
      // Trailing slashes would break the /v2/vectordb/... paths we append.
      endpoint: (process.env.ZILLIZ_ENDPOINT ?? '').trim().replace(/\/+$/, ''),
      token: (process.env.ZILLIZ_TOKEN ?? '').trim(),
      collection: (process.env.ZILLIZ_COLLECTION ?? 'mohab_cv').trim(),
    },
  }
}

export function zillizConfigured(cfg: RagConfig): boolean {
  return Boolean(cfg.zilliz.endpoint && cfg.zilliz.token)
}
