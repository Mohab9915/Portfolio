/**
 * A compact copy of the embedded CV that ships with the app.
 *
 * Zilliz is the primary store, but a portfolio site should never answer with
 * a 500 because a free-tier vector cluster is asleep, rate-limited, or has
 * been rotated. The ingest step already has every vector in hand, so writing
 * them to `data/cv-index.json` costs nothing and gives the API route an exact
 * offline replica to fall back to. The corpus is ~25 passages, so a brute
 * force cosine scan is microseconds.
 *
 * Vectors are stored as base64 Float32 rather than JSON number arrays — the
 * same data as text runs ~1.4 MB, this runs ~275 KB.
 */

export interface LocalIndexChunk {
  id: string
  section: string
  title: string
  meta: string
  text: string
}

export interface LocalIndex {
  model: string
  dim: number
  builtAt: string
  chunks: LocalIndexChunk[]
  /** base64 of a Float32Array holding chunks.length * dim values, row-major. */
  vectors: string
}

export function encodeVectors(vectors: number[][]): string {
  const dim = vectors[0]?.length ?? 0
  const flat = new Float32Array(vectors.length * dim)
  vectors.forEach((v, i) => flat.set(v, i * dim))
  return Buffer.from(flat.buffer).toString('base64')
}

export function decodeVectors(base64: string, dim: number): Float32Array[] {
  const bytes = Buffer.from(base64, 'base64')
  // Copy into a fresh buffer: Buffer instances are views into a shared pool
  // and are not guaranteed to be 4-byte aligned for a Float32Array view.
  const floats = new Float32Array(bytes.byteLength / 4)
  Buffer.from(floats.buffer).set(bytes)

  const rows: Float32Array[] = []
  for (let i = 0; i + dim <= floats.length; i += dim) {
    rows.push(floats.subarray(i, i + dim))
  }
  return rows
}

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

export interface LocalHit extends LocalIndexChunk {
  distance: number
}

export function searchLocal(
  index: LocalIndex,
  query: number[],
  limit: number,
): LocalHit[] {
  const rows = decodeVectors(index.vectors, index.dim)

  return index.chunks
    .map((chunk, i) => ({ ...chunk, distance: cosine(query, rows[i]) }))
    .sort((a, b) => b.distance - a.distance)
    .slice(0, limit)
}
