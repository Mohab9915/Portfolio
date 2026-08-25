/**
 * Query pipeline: embed -> vector search -> cross-encoder rerank.
 *
 * Every external hop degrades rather than throws. If Zilliz is unreachable we
 * fall back to the bundled index; if the reranker is unreachable we keep the
 * vector ordering. A visitor asking about Mohab's experience should never see
 * an error page because a free-tier dependency blinked.
 */

import cvIndex from '../../data/cv-index.json'

import {
  MIN_RERANK_SCORE,
  RERANK_K,
  RETRIEVE_K,
  zillizConfigured,
  type RagConfig,
} from './config.ts'
import { rerank } from './openrouter.ts'
import { embedQuery } from './embeddings.ts'
import { searchLocal, type LocalIndex } from './local-index.ts'
import { search as zillizSearch } from './zilliz.ts'

export interface Passage {
  id: string
  title: string
  section: string
  meta: string
  text: string
  /** Cosine similarity from the vector store. */
  vectorScore: number
  /** Cross-encoder relevance, or null when reranking was skipped. */
  rerankScore: number | null
}

export interface RetrieveResult {
  passages: Passage[]
  source: 'zilliz' | 'local'
  reranked: boolean
  /** Non-fatal problems, surfaced by /api/chat/health rather than to visitors. */
  notes: string[]
}

const localIndex = cvIndex as LocalIndex

export async function retrieve(
  cfg: RagConfig,
  query: string,
  signal?: AbortSignal,
): Promise<RetrieveResult> {
  const notes: string[] = []

  const queryVector = await embedQuery(cfg, query, { signal })
  if (!queryVector) throw new Error('Embedding the query returned no vector.')

  // 1. Vector search -----------------------------------------------------
  let candidates: Passage[] = []
  let source: 'zilliz' | 'local' = 'local'

  if (zillizConfigured(cfg)) {
    try {
      const hits = await zillizSearch(cfg, queryVector, RETRIEVE_K, signal)
      if (hits.length > 0) {
        source = 'zilliz'
        candidates = hits.map((h) => ({
          id: h.id,
          title: h.title,
          section: h.section,
          meta: h.meta,
          text: h.text,
          vectorScore: h.distance,
          rerankScore: null,
        }))
      } else {
        notes.push('Zilliz returned 0 hits — is the collection ingested?')
      }
    } catch (err) {
      notes.push(
        `Zilliz search failed, using local index: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  } else {
    notes.push('ZILLIZ_ENDPOINT/ZILLIZ_TOKEN not set — using local index.')
  }

  if (candidates.length === 0) {
    candidates = searchLocal(localIndex, queryVector, RETRIEVE_K).map((h) => ({
      id: h.id,
      title: h.title,
      section: h.section,
      meta: h.meta,
      text: h.text,
      vectorScore: h.distance,
      rerankScore: null,
    }))
  }

  // 2. Rerank ------------------------------------------------------------
  let reranked = false
  let ordered = candidates

  try {
    const hits = await rerank(
      cfg,
      query,
      candidates.map((c) => c.text),
      RETRIEVE_K,
      signal,
    )
    if (hits.length > 0) {
      reranked = true
      ordered = hits
        .map((h): Passage | null => {
          // Guard against an out-of-range index rather than trusting it.
          const base = candidates[h.index]
          return base ? { ...base, rerankScore: h.score } : null
        })
        .filter((p): p is Passage => p !== null)
    }
  } catch (err) {
    notes.push(
      `Rerank failed, keeping vector order: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }

  // 3. Select ------------------------------------------------------------
  const strong = reranked
    ? ordered.filter((p) => (p.rerankScore ?? 0) >= MIN_RERANK_SCORE)
    : ordered

  // Keep a couple of passages even when nothing scores well. The generator is
  // instructed to decline when the context does not support an answer, and it
  // does that far more gracefully with something to look at than with nothing.
  const selected = (strong.length > 0 ? strong : ordered).slice(0, RERANK_K)

  return { passages: selected, source, reranked, notes }
}
