/**
 * Single entry point for embeddings, so ingest and query can never disagree.
 *
 * Two things have to stay in lockstep or retrieval silently degrades: which
 * provider produced the vectors, and whether a query was given the model's
 * retrieval instruction. Both live here rather than at each call site.
 */

import { embed as openrouterEmbed } from './openrouter.ts'
import { hfEmbed, hfQueryText, huggingfaceConfigured } from './huggingface.ts'
import type { RagConfig } from './config.ts'

export type EmbeddingProvider = 'huggingface' | 'openrouter'

export function embeddingProvider(cfg: RagConfig): EmbeddingProvider {
  return huggingfaceConfigured(cfg) ? 'huggingface' : 'openrouter'
}

export function embeddingModel(cfg: RagConfig): string {
  return embeddingProvider(cfg) === 'huggingface' ? cfg.hf.model : cfg.embedModel
}

/**
 * Vector width of the active provider.
 *
 * The Zilliz collection is created with this, so changing provider or model
 * requires a re-ingest — `pnpm rag:ingest` recreates the collection, and the
 * script fails loudly if the model returns a different width than expected.
 */
export function embeddingDim(cfg: RagConfig): number {
  return embeddingProvider(cfg) === 'huggingface' ? cfg.hf.dim : cfg.embedDim
}

/** Embed passages for storage. */
export async function embedDocuments(
  cfg: RagConfig,
  texts: string[],
  opts: { signal?: AbortSignal } = {},
): Promise<number[][]> {
  return embeddingProvider(cfg) === 'huggingface'
    ? hfEmbed(cfg, texts, opts)
    : openrouterEmbed(cfg, texts, opts)
}

/**
 * Small cache of query vectors.
 *
 * Visitors to a portfolio ask the same handful of things — "where does he work
 * now", "is he good with RAG" — and a warm embed still costs ~390ms, a cold one
 * over 5s. Keyed by provider+model+text so switching either cannot serve a
 * vector of the wrong width or the wrong meaning.
 */
const QUERY_CACHE_MAX = 64
const queryCache = new Map<string, number[]>()

/** Embed a search query, applying the model's retrieval instruction if it has one. */
export async function embedQuery(
  cfg: RagConfig,
  query: string,
  opts: { signal?: AbortSignal } = {},
): Promise<number[]> {
  const key = `${embeddingProvider(cfg)}:${embeddingModel(cfg)}:${query.trim().toLowerCase()}`
  const cached = queryCache.get(key)
  if (cached) {
    // Refresh recency: re-inserting moves it to the end of the Map order.
    queryCache.delete(key)
    queryCache.set(key, cached)
    return cached
  }

  const vector =
    embeddingProvider(cfg) === 'huggingface'
      ? (await hfEmbed(cfg, [hfQueryText(cfg, query)], opts))[0]
      : (await openrouterEmbed(cfg, [query], opts))[0]

  if (vector) {
    queryCache.set(key, vector)
    // Map preserves insertion order, so the first key is the least recent.
    if (queryCache.size > QUERY_CACHE_MAX) {
      queryCache.delete(queryCache.keys().next().value as string)
    }
  }
  return vector
}
