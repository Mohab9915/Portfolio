# Portfolio

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_9hlzeDr2dJTGuKwx4k8lk8N6dqMs)

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

---

## Ask Rick — the CV assistant

A sprite mascot walks along the bottom of the page. Clicking him waves and opens
a chat panel that answers questions about the CV through a retrieval pipeline.

### Pipeline

| Stage | Model / service | Notes |
| --- | --- | --- |
| Chunking | — | `lib/rag/chunk.ts` parses the `.docx` by section |
| Query rewrite | same model as generation | resolves follow-ups; skipped on the first turn |
| Embedding | `BAAI/bge-large-en-v1.5` via Hugging Face | 1024-d; OpenRouter is the fallback |
| Vector store | Zilliz Cloud (Milvus REST v2) | `COSINE`, AUTOINDEX |
| Reranking | `qwen/qwen3-reranker-8b` via OpenRouter | cross-encoder, top 5 of 16 |
| Generation | `openai/gpt-oss-120b` via Groq | streamed as SSE; Gemini then OpenRouter are fallbacks |
| Speech | `s2.1-pro-free` via Fish Audio | Rick Sanchez voice, streamed as MP3 |

The CV is chunked by structure rather than by character window — one passage per
role, project, and skill group — and each passage is prefixed with the context
needed to stand alone. The text shown to the generator and the text sent to the
embedder differ deliberately; see the comments in `lib/rag/chunk.ts`.

The embedding model was picked by measurement, not reputation — same probe set,
same chunks (see the table in `lib/rag/huggingface.ts`). `BAAI/bge-large-en-v1.5`
led on recall@1 (10/12 vs 8/12 for the previous OpenRouter model) and was ~8x
faster per query, which matters because retrieval, not generation, is the
latency floor here. It also takes embeddings off OpenRouter's free-model daily
quota, which every question was consuming.

It is English-only. If the site ever needs Arabic, `BAAI/bge-m3` is also 1024-d
and multilingual, so switching `HF_EMBED_MODEL` and re-ingesting is the whole
change — at some cost to recall.

The first stage is deliberately generous (`RETRIEVE_K = 16`) and the
cross-encoder does the precision work.

**Follow-up questions are rewritten before retrieval** (`lib/rag/rewrite.ts`).
Passing the conversation to the generator is not enough on its own: retrieval
only ever saw the latest message, so "what does he do there?" asked after an
answer about ASAL carried no referent, matched Fawri at a noise-level 0.01, and
the generator then answered faithfully from the wrong company. Grounding cannot
rescue a question that lost its subject before the search ran. The rewrite turns
it into "What does Mohab Haedarea do at ASAL Technologies?", which retrieves
ASAL at 1.00. It is skipped on the first turn and falls back to the raw question
on any failure.

### Setup

1. Copy the env template and fill it in:

   ```bash
   cp .env.example .env.local
   ```

   - `OPENROUTER_API_KEY` — from [openrouter.ai/keys](https://openrouter.ai/keys);
     used for reranking, and as the last generation fallback
   - `GROQ_API_KEY` — from [console.groq.com](https://console.groq.com/keys)
   - `HF_API_KEY` — from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens),
     with the `inference.serverless.write` scope
   - `GEMINI_API_KEY` — from [aistudio.google.com](https://aistudio.google.com/apikey) (fallback)
   - `ZILLIZ_ENDPOINT` — the cluster **Public Endpoint** in the Zilliz console,
     e.g. `https://in03-xxxxxxxx.serverless.gcp-us-west1.cloud.zilliz.com`
   - `ZILLIZ_TOKEN` — `username:password`, or a Zilliz API key
   - `FISH_API_KEY` — from [fish.audio/app/developers](https://fish.audio/app/developers)
   - `FISH_VOICE_ID` — the voice's model id (currently the Rick Sanchez voice)

2. Ingest the CV:

   ```bash
   pnpm rag:ingest
   ```

   | Flag | Effect |
   | --- | --- |
   | *(none)* | parse → chunk → embed → Zilliz **and** local index |
   | `--dry` | print the parsed chunks, no network calls |
   | `--local` | embed and write the local index only, skip Zilliz |

   Re-running is safe: chunk ids are deterministic and the collection is
   recreated, so edits to the CV never leave orphaned vectors behind.

3. Check the wiring:

   ```bash
   curl localhost:3000/api/chat
   ```

### Updating the CV

Replace `data/Resume-Mohab-AI.docx` and re-run `pnpm rag:ingest`. If the
document's layout changes significantly, check `pnpm rag:ingest --dry` first —
the parser keys off the section headings and the tab-separated
`Organisation<TAB>Location` / `Role<TAB>Period` rows.

### Graceful degradation

Ingestion also writes `data/cv-index.json`, a 121 KB replica of the embedded
corpus that ships with the app. If Zilliz is unreachable, asleep, or not yet
configured, `/api/chat` answers from that instead of erroring. `GET /api/chat`
reports which backend is actually live.

The public endpoint is rate limited to 8 questions per minute per IP
(`lib/rag/ratelimit.ts`), in-memory and per instance — a speed bump, not a
guarantee. Swap the `Map` for Vercel KV if it ever needs to be one.

### Voice

Replies are spoken in a Rick Sanchez voice via Fish Audio. The key stays
server-side; the browser posts text to `/api/tts` and gets MP3 back. Speech is
on by default and the choice is remembered in `localStorage` — flip the
`useState(true)` for `voiceOn` in `components/pet/ask-rick.tsx` to make it
opt-in instead.

**Text and speech advance together.** Synthesising the whole reply after it
finished streaming meant reading the answer and then hearing it again several
seconds later. Instead `components/pet/speech-queue.ts` cuts the reply into
sentences as it streams, sends each one for synthesis the moment it is complete,
and reveals its text at the instant its audio starts. Measured in the browser,
each reveal lands within ~100–180 ms of its audio. Sentences longer than 180
characters are broken at a clause boundary, because the model writes run-on
sentences that would otherwise become one 23-second utterance.

Audio is an enhancement, never a dependency. If a chunk fails to synthesise its
text is still revealed, so silence never costs the reader the answer. A 402 (no
Fish API credit) or 503 (not configured) retires the speaker button for the
session rather than retrying.

Markdown is flattened before synthesis (`plainForSpeech`) so the model does not
read "asterisk asterisk" or "dash" aloud — only the markers are stripped, not
the words between them, since the model uses `*emphasis*` on real content.
Replies are capped at 700 characters: the free tier has no hard character limit,
but it is governed by a Fair Use policy and nobody wants a two-minute monologue.

> **The `-free` suffix in `FISH_MODEL` is load-bearing.** `s2.1-pro-free` is
> the free tier of S2.1 Pro. The paid strings (`s2.1-pro`, `s1`) draw on Fish
> *API* credit, which is billed separately from fish.audio platform credit — on
> an account without it they return 402 for every request, including a
> deliberately invalid model name, because the credit check runs first.

### Generation

`lib/rag/generate.ts` holds an ordered provider list — Groq, then Gemini, then
OpenRouter — and falls through only when a provider yields no content at all.
Once tokens are on screen, switching backends would restart the answer
mid-sentence. The chain exists because a single free provider is not dependable
enough to front a public site: during development a stealth model's shared pool
began returning 429 and took the assistant down completely.

Model choice is worth measuring rather than assuming. Time to first token, same
prompt each time:

| backend / model | first token |
| --- | --- |
| Groq `openai/gpt-oss-120b` | **~0.45 s** |
| Groq `openai/gpt-oss-20b` | ~0.46 s (terser answers) |
| Google `gemini-3.1-flash-lite` | ~1.1 s |
| Google `gemini-3.5-flash` | ~3.9 s |
| Google `gemini-3.7-flash` | ~16 s |

Groq runs on LPUs and is fast enough that **retrieval, not generation, is now
the floor**: about 1.1–4.0 s for embed → Zilliz → rerank, then a further
0.2–0.4 s for the answer. Two of those three hops are OpenRouter round trips,
so free-tier throttling shows up as latency variance.

Some notes that cost real debugging time:

- `gemini-3.1-flash` (without `-lite`) does not exist — the API returns 404.
- Gemini charges thinking tokens against `maxOutputTokens`, so it is set well
  above what the reply needs. Too low and the answer truncates mid-sentence
  with no error explaining why.
- **Never point a generator at a model that streams its chain-of-thought as
  ordinary content.** `nemotron-3.5-lightning` replied "Here's a thinking
  process: 1. Analyze User Input…" into the chat panel, and `qwen/qwen3.6-27b`
  emits a 3.6 KB `<think>` block. `gpt-oss` reports reasoning out of band and
  is sent `reasoning_format: "hidden"`, but since swapping `GROQ_MODEL` is a
  one-line change, `groq.ts` also filters `<think>…</think>` out of the stream
  as a backstop.

### Tone

Rick answers in character — cocky, sarcastic, dry. The system prompt in
`lib/rag/prompt.ts` puts the grounding rules *under* a heading saying they beat
the bit every time, because a persona that invents an employer or a metric to
land a joke is worse than no persona at all. Recency is handled there too: the
prompt points at the `Career timeline` passage and the `STATUS:` markers,
because retrieval returns passages by relevance, not by date — without it the
model read a finished job off a strong match and reported it as his current
one. If the tone needs dialling up or down, that prompt is the only place to
touch.

### The pet

The sprite comes from [codex-pets](https://codex-pets.net) (`npx codex-pets add
rick`, by *kidolata*) and lives in `public/pet/`. The package ships a
spritesheet but no animation manifest, so the grid in
`components/pet/sprite.ts` was measured off the atlas: 8×9 cells of 192×208,
with exact per-row frame counts. Playing past a row's real frame count renders
an empty cell and the pet blinks out.

States: he wanders and occasionally runs or stops to play guitar, waves when
clicked, thinks while the model works, talks while the answer streams and plays, and
falls asleep after 45 s with no input. `prefers-reduced-motion` keeps him still.

He walks over to the panel when the chat opens, but stops moving the moment he
starts speaking — crossing the page mid-sentence reads as walking away from his
own answer.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
