/**
 * Minimal Zilliz Cloud client over the Milvus REST v2 API.
 *
 * Only four operations are needed, so a hand-rolled client beats pulling in
 * the full SDK (which targets gRPC and does not run on serverless edge-ish
 * runtimes cleanly).
 */

import { embeddingDim } from './embeddings.ts'
import type { RagConfig } from './config.ts'

export interface CvRecord {
  id: string
  vector: number[]
  text: string
  section: string
  title: string
  meta: string
}

export interface SearchHit {
  id: string
  distance: number
  text: string
  section: string
  title: string
  meta: string
}

/** Fields returned by a search — the vector itself is never worth shipping back. */
const OUTPUT_FIELDS = ['id', 'text', 'section', 'title', 'meta']

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Milvus error codes worth another attempt.
 *
 * A serverless cluster suspends when idle, and the first request after that
 * can come back as a 408 "request timeout" while it wakes — which is exactly
 * the request an ingest makes. Retrying turns a hard failure into a pause.
 */
const RETRYABLE_HTTP = new Set([408, 429, 500, 502, 503, 504])
const RETRYABLE_CODE = new Set([10001])

async function call<T>(
  cfg: RagConfig,
  path: string,
  body: unknown,
  signal?: AbortSignal,
  retries = 4,
): Promise<T> {
  if (!cfg.zilliz.endpoint) {
    throw new Error(
      'ZILLIZ_ENDPOINT is not set — copy the cluster Public Endpoint from the Zilliz console.',
    )
  }

  let lastError = 'unknown error'

  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) await sleep(Math.min(8000, 700 * 2 ** (attempt - 1)))

    let res: Response
    try {
      res = await fetch(`${cfg.zilliz.endpoint}/v2/vectordb${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.zilliz.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal,
      })
    } catch (err) {
      if (signal?.aborted) throw err
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }

    const raw = await res.text()

    if (!res.ok) {
      lastError = `HTTP ${res.status}: ${raw.slice(0, 300)}`
      if (RETRYABLE_HTTP.has(res.status)) continue
      break
    }

    let json: { code?: number; message?: string; data?: T }
    try {
      json = JSON.parse(raw)
    } catch {
      throw new Error(`Zilliz ${path} returned non-JSON: ${raw.slice(0, 200)}`)
    }

    // Milvus reports application errors in the body with a non-zero code, so a
    // 200 is not on its own a success.
    if (json.code !== undefined && json.code !== 0 && json.code !== 200) {
      lastError = `error ${json.code}: ${json.message ?? ''}`
      if (RETRYABLE_CODE.has(json.code)) continue
      break
    }

    return json.data as T
  }

  throw new Error(`Zilliz ${path} failed after ${retries} attempts — ${lastError}`)
}

export async function listCollections(
  cfg: RagConfig,
  signal?: AbortSignal,
): Promise<string[]> {
  return (await call<string[]>(cfg, '/collections/list', {}, signal)) ?? []
}

export async function dropCollection(
  cfg: RagConfig,
  signal?: AbortSignal,
): Promise<void> {
  await call(
    cfg,
    '/collections/drop',
    { collectionName: cfg.zilliz.collection },
    signal,
  )
}

/**
 * Create the collection with an explicit schema.
 *
 * An explicit schema (rather than Milvus "quick setup" plus a dynamic field)
 * keeps the metadata columns typed and makes `outputFields` behaviour
 * predictable across Milvus versions.
 */
export async function createCollection(
  cfg: RagConfig,
  signal?: AbortSignal,
): Promise<void> {
  await call(
    cfg,
    '/collections/create',
    {
      collectionName: cfg.zilliz.collection,
      schema: {
        autoID: false,
        enableDynamicField: false,
        fields: [
          {
            fieldName: 'id',
            dataType: 'VarChar',
            isPrimary: true,
            elementTypeParams: { max_length: 128 },
          },
          {
            fieldName: 'vector',
            dataType: 'FloatVector',
            elementTypeParams: { dim: embeddingDim(cfg) },
          },
          {
            fieldName: 'text',
            dataType: 'VarChar',
            elementTypeParams: { max_length: 8192 },
          },
          {
            fieldName: 'section',
            dataType: 'VarChar',
            elementTypeParams: { max_length: 64 },
          },
          {
            fieldName: 'title',
            dataType: 'VarChar',
            elementTypeParams: { max_length: 256 },
          },
          {
            fieldName: 'meta',
            dataType: 'VarChar',
            elementTypeParams: { max_length: 512 },
          },
        ],
      },
      indexParams: [
        {
          fieldName: 'vector',
          indexName: 'vector_index',
          // AUTOINDEX lets Zilliz pick the index for the tier; COSINE matches
          // how the embeddings are compared at query time.
          indexType: 'AUTOINDEX',
          metricType: 'COSINE',
        },
      ],
    },
    signal,
  )
}

export async function upsert(
  cfg: RagConfig,
  records: CvRecord[],
  signal?: AbortSignal,
): Promise<number> {
  let written = 0
  // Each record carries a full vector; batching keeps request bodies sane.
  const batchSize = 20

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    await call(
      cfg,
      '/entities/upsert',
      { collectionName: cfg.zilliz.collection, data: batch },
      signal,
    )
    written += batch.length
  }

  return written
}

export async function search(
  cfg: RagConfig,
  vector: number[],
  limit: number,
  signal?: AbortSignal,
): Promise<SearchHit[]> {
  const data = await call<Record<string, unknown>[]>(
    cfg,
    '/entities/search',
    {
      collectionName: cfg.zilliz.collection,
      data: [vector],
      annsField: 'vector',
      limit,
      outputFields: OUTPUT_FIELDS,
    },
    signal,
  )

  return (data ?? []).map((row) => ({
    id: String(row.id ?? ''),
    distance: Number(row.distance ?? 0),
    text: String(row.text ?? ''),
    section: String(row.section ?? ''),
    title: String(row.title ?? ''),
    meta: String(row.meta ?? ''),
  }))
}
