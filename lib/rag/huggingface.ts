/**
 * Hugging Face serverless inference — embeddings.
 *
 * Chosen over the OpenRouter embedding model on measured retrieval quality
 * over this CV, not on reputation. Same 12-question probe set, same chunks:
 *
 *   BAAI/bge-large-en-v1.5      recall@1 10/12   recall@3 12/12    43 ms/query
 *   BAAI/bge-m3                 recall@1  9/12   recall@3 11/12   957 ms/query
 *   nvidia/nemotron-3-embed-1b  recall@1  8/12   recall@3 12/12   361 ms/query
 *   intfloat/multilingual-e5-l  recall@1  8/12   recall@3 10/12    40 ms/query
 *   all-MiniLM-L6-v2            recall@1  7/12   recall@3 10/12    21 ms/query
 *
 * It also moves embeddings off OpenRouter's free-model daily quota, which the
 * assistant was burning through on every single question.
 *
 * Trade-off worth knowing: bge-large-en-v1.5 is English-only. If the site ever
 * needs to answer in Arabic, switch HF_EMBED_MODEL to BAAI/bge-m3 (also 1024-d,
 * multilingual, so only a re-ingest is needed) and accept the recall drop.
 */

import type { RagConfig } from './config.ts'

const HF_BASE = 'https://router.huggingface.co/hf-inference/models'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * bge retrieval models are asymmetric: passages are embedded bare, queries get
 * this instruction. Using it on both sides, or neither, measurably degrades
 * ranking. Applied in exactly one place so ingest and query cannot drift apart.
 */
const BGE_QUERY_INSTRUCTION =
  'Represent this sentence for searching relevant passages: '

export function huggingfaceConfigured(cfg: RagConfig): boolean {
  return Boolean(cfg.hf.apiKey)
}

/** Prefix a query when the configured model expects one. */
export function hfQueryText(cfg: RagConfig, query: string): string {
  return cfg.hf.model.includes('bge') && cfg.hf.model.includes('en')
    ? `${BGE_QUERY_INSTRUCTION}${query}`
    : query
}

export async function hfEmbed(
  cfg: RagConfig,
  inputs: string[],
  opts: { batchSize?: number; signal?: AbortSignal } = {},
): Promise<number[][]> {
  const { batchSize = 16, signal } = opts
  const url = `${HF_BASE}/${cfg.hf.model}/pipeline/feature-extraction`
  const out: number[][] = []

  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize)
    let lastError = 'unknown error'
    let done = false

    for (let attempt = 0; attempt < 4 && !done; attempt++) {
      if (attempt > 0) await sleep(800 * 2 ** (attempt - 1))

      let res: Response
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfg.hf.apiKey}`,
            'Content-Type': 'application/json',
          },
          // wait_for_model rides out the cold start instead of 503-ing, which
          // serverless inference does whenever a model has gone idle.
          body: JSON.stringify({
            inputs: batch,
            options: { wait_for_model: true },
          }),
          signal,
        })
      } catch (err) {
        if (signal?.aborted) throw err
        lastError = err instanceof Error ? err.message : String(err)
        continue
      }

      if (!res.ok) {
        lastError = `${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`
        if (res.status !== 429 && res.status !== 503 && res.status < 500) break
        continue
      }

      const json = (await res.json()) as number[][] | number[]
      // A single string comes back as a flat vector; a batch as an array of them.
      const vectors = Array.isArray(json[0])
        ? (json as number[][])
        : [json as number[]]

      if (vectors.length !== batch.length) {
        throw new Error(
          `Hugging Face returned ${vectors.length} vectors for ${batch.length} inputs.`,
        )
      }
      out.push(...vectors)
      done = true
    }

    if (!done) {
      throw new Error(`Hugging Face ${cfg.hf.model} failed: ${lastError}`)
    }
  }

  return out
}
