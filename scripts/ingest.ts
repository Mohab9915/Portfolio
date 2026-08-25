/**
 * Ingest the resume into the vector store.
 *
 *   pnpm rag:ingest          parse -> chunk -> embed -> Zilliz + local index
 *   pnpm rag:ingest --dry    parse and print chunks, no network calls
 *   pnpm rag:ingest --local  embed and write data/cv-index.json, skip Zilliz
 *
 * Re-running is safe: the collection is recreated and ids are deterministic.
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import mammoth from 'mammoth'

import { ragConfig, zillizConfigured } from '../lib/rag/config.ts'
import { embedDocuments, embeddingDim, embeddingModel, embeddingProvider } from '../lib/rag/embeddings.ts'
import { buildChunks, embedTextFor, type CvChunk } from '../lib/rag/chunk.ts'

import { encodeVectors, type LocalIndex } from '../lib/rag/local-index.ts'
import {
  createCollection,
  dropCollection,
  listCollections,
  upsert,
  type CvRecord,
} from '../lib/rag/zilliz.ts'

const CV_PATH = path.join(process.cwd(), 'data', 'Resume-Mohab-AI.docx')
const INDEX_PATH = path.join(process.cwd(), 'data', 'cv-index.json')

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry')
const localOnly = args.has('--local')

function log(message: string) {
  process.stdout.write(`${message}\n`)
}

function fail(message: string): never {
  process.stderr.write(`\n  ✗ ${message}\n\n`)
  process.exit(1)
}

async function main() {
  const cfg = ragConfig()

  log('\n  ── CV ingestion ─────────────────────────────────────────\n')

  // 1. Parse the .docx -------------------------------------------------
  const buffer = await readFile(CV_PATH).catch(() =>
    fail(`Could not read ${CV_PATH}`),
  )
  const { value: rawText } = await mammoth.extractRawText({ buffer })
  const chunks: CvChunk[] = buildChunks(rawText)

  if (chunks.length === 0) fail('Parsed 0 chunks — the CV layout may have changed.')

  log(`  parsed   ${chunks.length} chunks from ${path.basename(CV_PATH)}`)
  const bySection = chunks.reduce<Record<string, number>>((acc, c) => {
    acc[c.section] = (acc[c.section] ?? 0) + 1
    return acc
  }, {})
  log(
    `           ${Object.entries(bySection)
      .map(([s, n]) => `${s}:${n}`)
      .join('  ')}\n`,
  )

  if (dryRun) {
    for (const c of chunks) {
      log(`  ── ${c.title} ${c.meta ? `(${c.meta})` : ''}`)
      log(`${c.text.replace(/^/gm, '     ')}\n`)
    }
    log('  dry run — nothing embedded or written.\n')
    return
  }

  if (!cfg.apiKey) fail('OPENROUTER_API_KEY is not set.')

  // 2. Embed -----------------------------------------------------------
  log(`  embedding via ${embeddingModel(cfg)} (${embeddingProvider(cfg)}) ...`)
  const started = Date.now()
  const vectors = await embedDocuments(cfg, chunks.map(embedTextFor))
  const elapsed = ((Date.now() - started) / 1000).toFixed(1)

  if (vectors.length !== chunks.length) {
    fail(`Expected ${chunks.length} vectors, got ${vectors.length}.`)
  }
  const dim = vectors[0].length
  const expectedDim = embeddingDim(cfg)
  if (dim !== expectedDim) {
    fail(
      `Model returned ${dim}-d vectors but the configured width is ${expectedDim}. ` +
        'Fix HF_EMBED_DIM / OPENROUTER_EMBED_DIM in the env, then re-ingest.',
    )
  }
  log(`  embedded ${vectors.length} × ${dim}-d in ${elapsed}s\n`)

  // 3. Write the offline replica ---------------------------------------
  const index: LocalIndex = {
    model: embeddingModel(cfg),
    dim,
    builtAt: new Date().toISOString(),
    chunks: chunks.map(({ id, section, title, meta, text }) => ({
      id,
      section,
      title,
      meta,
      text,
    })),
    vectors: encodeVectors(vectors),
  }
  await writeFile(INDEX_PATH, JSON.stringify(index))
  const kb = (JSON.stringify(index).length / 1024).toFixed(0)
  log(`  wrote    data/cv-index.json (${kb} KB fallback index)`)

  // 4. Push to Zilliz ---------------------------------------------------
  if (localOnly) {
    log('\n  --local given — skipped Zilliz.\n')
    return
  }
  if (!zillizConfigured(cfg)) {
    log(
      '\n  ! ZILLIZ_ENDPOINT / ZILLIZ_TOKEN not set — skipped Zilliz.\n' +
        '    The site will serve answers from the local index until you set them.\n',
    )
    return
  }

  const records: CvRecord[] = chunks.map((c, i) => ({
    id: c.id,
    vector: vectors[i],
    text: c.text,
    section: c.section,
    title: c.title,
    meta: c.meta,
  }))

  const existing = await listCollections(cfg)
  if (existing.includes(cfg.zilliz.collection)) {
    // Recreate rather than upsert-in-place so removed CV lines do not linger
    // as orphaned vectors.
    log(`  dropping existing collection "${cfg.zilliz.collection}"`)
    await dropCollection(cfg)
  }
  await createCollection(cfg)
  log(`  created  collection "${cfg.zilliz.collection}" (dim ${expectedDim}, COSINE)`)

  const written = await upsert(cfg, records)
  log(`  upserted ${written} vectors to Zilliz\n`)
  log('  ✓ done\n')
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)))
