/**
 * Resolve a follow-up question into a standalone one before retrieval.
 *
 * The generator receives the conversation, but retrieval did not — it embedded
 * whatever the visitor just typed. So "what does he do there?" asked right
 * after an answer about ASAL Technologies carries no referent at all, matched
 * Fawri at a noise-level 0.01, and the generator then answered faithfully from
 * the wrong company. Grounding cannot rescue a question that lost its subject
 * before the search ran.
 *
 * Rewriting costs one small extra call. It is skipped entirely on the first
 * turn, and any failure falls back to the original text — a slightly worse
 * search beats no answer.
 */

import { generate } from './generate.ts'
import type { ChatMessage } from './openrouter.ts'
import type { RagConfig } from './config.ts'

/** Turns of context given to the rewriter. */
const REWRITE_HISTORY_TURNS = 4
/** A rewrite longer than this means the model started explaining itself. */
const MAX_REWRITE_CHARS = 300

const SYSTEM = `You rewrite follow-up questions so they can be understood on their own.

You are given a conversation about Mohab Haedarea's CV, then his visitor's latest message. Rewrite that message as a single standalone question, replacing pronouns and references ("there", "that job", "he", "it") with what they actually refer to earlier in the conversation.

Rules:
- Output ONLY the rewritten question. No preamble, no quotes, no explanation.
- Keep it short and keep the original intent. Do not answer it.
- If the message already stands on its own, output it unchanged.`

export async function rewriteQuery(
  cfg: RagConfig,
  question: string,
  history: ChatMessage[],
  signal?: AbortSignal,
): Promise<{ query: string; rewritten: boolean }> {
  const turns = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-REWRITE_HISTORY_TURNS)

  // First turn of a conversation has nothing to resolve against.
  if (turns.length === 0) return { query: question, rewritten: false }

  const transcript = turns
    .map((m) => `${m.role === 'user' ? 'Visitor' : 'Assistant'}: ${m.content}`)
    .join('\n')

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Conversation so far:\n${transcript}\n\nLatest message: ${question}\n\nStandalone question:`,
    },
  ]

  try {
    let out = ''
    for await (const event of generate(cfg, messages, {
      maxTokens: 120,
      temperature: 0,
      signal,
    })) {
      if (event.type === 'content') out += event.text
    }

    const cleaned = out
      .trim()
      // Models like to wrap the answer in quotes despite being told not to.
      .replace(/^["'`]|["'`]$/g, '')
      .split('\n')[0]
      .trim()

    if (!cleaned || cleaned.length > MAX_REWRITE_CHARS) {
      return { query: question, rewritten: false }
    }

    return { query: cleaned, rewritten: cleaned !== question }
  } catch {
    // Never let the rewrite block the answer.
    return { query: question, rewritten: false }
  }
}
