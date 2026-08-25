/**
 * Turns the resume .docx into retrieval-ready chunks.
 *
 * A CV is already structured, so splitting it on a fixed character window
 * would cut roles in half and strip bullets from their employer. Instead we
 * parse the document's own sections and emit one chunk per meaningful unit
 * (a role, a project, a skill group), then prefix each chunk with the context
 * a reader would need to understand it standalone — the retrieved passage is
 * read by the generator without its neighbours, so "Built a DSPy pipeline"
 * has to carry "at ASAL Technologies" with it.
 */

import { highlights, profile } from '../resume.ts'

export interface CvChunk {
  /** Stable across re-ingests so upserts replace rather than duplicate. */
  id: string
  /** Coarse bucket: profile | education | experience | projects | skills | certifications */
  section: string
  /** Human-readable label, shown as a citation chip in the UI. */
  title: string
  /** Secondary detail (period, location, stack). */
  meta: string
  /** The self-contained passage that gets embedded and shown to the model. */
  text: string
}

const KNOWN_SECTIONS = new Set([
  'EDUCATION',
  'EXPERIENCE',
  'PROJECTS',
  'SKILLS',
  'CERTIFICATIONS',
  'SUMMARY',
  'PROFILE',
  'AWARDS',
  'PUBLICATIONS',
  'LANGUAGES',
])

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Split a "Left<TAB>Right" line, tolerating documents without the tab. */
function splitRow(line: string): [string, string] {
  const parts = line.split('\t').map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(' · ')]
  return [line.trim(), '']
}

function isSectionHeading(line: string): boolean {
  if (line.includes('\t')) return false
  const clean = line.trim()
  if (clean.length > 40 || clean.length < 3) return false
  if (KNOWN_SECTIONS.has(clean.toUpperCase())) return clean === clean.toUpperCase()
  return false
}

/**
 * Group a section's lines into entries. An entry starts where two
 * consecutive tab-delimited rows appear (org/location then role/period);
 * every plain line after that belongs to the entry as a bullet.
 */
interface Entry {
  left: string
  right: string
  subLeft: string
  subRight: string
  bullets: string[]
}

function parseEntries(lines: string[]): Entry[] {
  const entries: Entry[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const next = lines[i + 1]
    const startsEntry = line.includes('\t') && next?.includes('\t')

    if (startsEntry) {
      const [left, right] = splitRow(line)
      const [subLeft, subRight] = splitRow(next)
      entries.push({ left, right, subLeft, subRight, bullets: [] })
      i++
      continue
    }

    if (entries.length > 0) {
      entries[entries.length - 1].bullets.push(line.trim())
    }
  }

  return entries
}

interface Role {
  company: string
  location: string
  role: string
  period: string
  bullets: string[]
  /** The period runs to "Present", so the role has not ended. */
  isCurrent: boolean
}

/** CVs list experience newest first, so document order is recency order. */
function parseRoles(lines: string[]): Role[] {
  return parseEntries(lines).map((entry) => ({
    company: entry.left,
    location: entry.right,
    role: entry.subLeft,
    period: entry.subRight,
    bullets: entry.bullets,
    isCurrent: /present|current|now|ongoing/i.test(entry.subRight),
  }))
}

function experienceChunks(roles: Role[]): CvChunk[] {
  return roles.map((entry, index) => {
    const where = [entry.location, entry.period].filter(Boolean).join(', ')

    const header = `${profile.name} — ${entry.role} at ${entry.company}${
      where ? ` (${where})` : ''
    }.`
    // Retrieval returns passages in relevance order, not chronological order,
    // so a passage has to say for itself whether the job is still going. Left
    // implicit, the model reads "Aug 2025 – May 2026" on a strong match and
    // reports a finished job as his current one.
    const standing = entry.isCurrent
      ? 'STATUS: current — this role is ongoing and has not ended.'
      : `STATUS: past — this role has ended. It is number ${
          index + 1
        } of ${roles.length}, counting back from the most recent.`
    const body = entry.bullets.map((b) => `- ${b}`).join('\n')

    return {
      id: `experience-${slug(entry.company)}`,
      section: 'experience',
      title: `${entry.company} — ${entry.role}`,
      meta: where,
      text: `${header}\n${standing}\n${body}`,
    }
  })
}

/**
 * One passage holding the whole career in order.
 *
 * "What is his current role?" is among the most common questions a recruiter
 * asks, and it cannot be answered from any single role passage — answering it
 * needs all of them at once, ranked by date. So the ordering is precomputed
 * here rather than left for the model to reconstruct from whatever subset
 * retrieval happens to surface.
 */
function timelineChunk(roles: Role[]): CvChunk[] {
  if (roles.length === 0) return []

  const rows = roles.map((r, i) => {
    const where = r.location ? ` (${r.location})` : ''
    const flag = r.isCurrent ? '  <-- CURRENT, ongoing' : ''
    return `${i + 1}. ${r.role} at ${r.company}${where}, ${r.period}${flag}`
  })

  const current = roles.filter((r) => r.isCurrent)
  const summary = current.length
    ? `His current position${current.length > 1 ? 's are' : ' is'} ${current
        .map((r) => `${r.role} at ${r.company} (${r.period})`)
        .join(', and ')}. The most recent role he started is ${roles[0].role} at ${
        roles[0].company
      }. Every other role listed above has ended.`
    : `His most recent role was ${roles[0].role} at ${roles[0].company} (${roles[0].period}).`

  return [
    {
      id: 'career-timeline',
      section: 'experience',
      title: 'Career timeline',
      meta: `${roles.length} roles, most recent first`,
      text: `${profile.name} — career timeline, most recent first. Use this to answer questions about his current, latest, or most recent job:\n${rows.join(
        '\n',
      )}\n\n${summary}`,
    },
  ]
}

function educationChunks(lines: string[]): CvChunk[] {
  return parseEntries(lines).map((entry) => {
    const school = entry.left
    const location = entry.right
    const degree = entry.subLeft
    const period = entry.subRight
    const where = [location, period].filter(Boolean).join(', ')

    return {
      id: `education-${slug(school)}`,
      section: 'education',
      title: school,
      meta: [degree, where].filter(Boolean).join(' · '),
      text: `${profile.name} — Education: ${degree} at ${school}${
        where ? ` (${where})` : ''
      }.`,
    }
  })
}

function projectChunks(lines: string[]): CvChunk[] {
  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const clean = line.trim()
      // "Name (stack) — description"
      const match = clean.match(/^(.+?)\s*\(([^)]*)\)\s*[—–-]\s*(.+)$/)
      const name = match ? match[1].trim() : clean.split(/[—–-]/)[0].trim()
      const stack = match ? match[2].trim() : ''
      const description = match ? match[3].trim() : clean

      return {
        id: `project-${slug(name)}`,
        section: 'projects',
        title: name,
        meta: stack,
        text: `${profile.name} — Personal project "${name}"${
          stack ? ` built with ${stack}` : ''
        }: ${description}`,
      }
    })
}

function skillChunks(lines: string[]): CvChunk[] {
  return lines
    .filter((line) => line.includes(':'))
    .map((line) => {
      const idx = line.indexOf(':')
      const group = line.slice(0, idx).trim()
      const items = line.slice(idx + 1).trim()

      return {
        id: `skills-${slug(group)}`,
        section: 'skills',
        title: `Skills — ${group}`,
        meta: '',
        text: `${profile.name} — ${group} skills and technologies: ${items}.`,
      }
    })
}

function certificationChunk(lines: string[]): CvChunk[] {
  const certs = lines.filter((line) => line.trim().length > 0)
  if (certs.length === 0) return []

  return [
    {
      id: 'certifications',
      section: 'certifications',
      title: 'Certifications',
      meta: `${certs.length} certifications`,
      // Certifications are one-liners; kept together they form a single
      // coherent passage instead of several near-empty ones.
      text: `${profile.name} — Certifications and credentials:\n${certs
        .map((c) => `- ${c.trim()}`)
        .join('\n')}`,
    },
  ]
}

/**
 * A synthesised overview. The positioning statement and headline metrics live
 * in the site copy rather than the .docx, and they answer the single most
 * common question a visitor asks ("who is this and what is he good at").
 */
function profileChunks(contactLine: string): CvChunk[] {
  const metrics = highlights.map((h) => `- ${h.value} ${h.label}`).join('\n')
  const article = /^[aeiou]/i.test(profile.title) ? 'an' : 'a'

  return [
    {
      id: 'profile-overview',
      section: 'profile',
      title: 'Profile — who Mohab is',
      meta: profile.title,
      text: [
        `${profile.name} is ${article} ${profile.title}.`,
        profile.tagline,
        'Headline results:',
        metrics,
      ].join('\n'),
    },
    {
      id: 'profile-contact',
      section: 'profile',
      title: 'Contact & links',
      meta: 'email, phone, GitHub, LinkedIn',
      text: [
        `How to contact ${profile.name}:`,
        `- Email: ${profile.email}`,
        `- Phone: ${profile.phone}`,
        `- LinkedIn: ${profile.linkedin}`,
        `- GitHub: ${profile.github}`,
        contactLine ? `As listed on the CV: ${contactLine}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    },
  ]
}

/**
 * The text actually sent to the embedding model.
 *
 * Every chunk's display text opens with "Mohab Haedarea — " so the generator
 * always knows who a passage is about. For the embedder that repetition is
 * dead weight: twenty passages sharing identical leading tokens sit closer
 * together in vector space and separate worse. Stripping the lead moved
 * recall@3 from 8/10 to 9/10 on a hand-written probe set, so the display text
 * and the embedded text are deliberately not the same string.
 */
export function embedTextFor(chunk: CvChunk): string {
  const name = profile.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return chunk.text.replace(new RegExp(`^${name}\\s*[—–-]\\s*`), '')
}

/** Parse the raw text of the resume .docx into chunks. */
export function buildChunks(rawText: string): CvChunk[] {
  const lines = rawText
    .split('\n')
    .map((line) => line.replace(/ /g, ' ').trimEnd())
    .filter((line) => line.trim().length > 0)

  // Everything before the first section heading is the letterhead.
  const sections = new Map<string, string[]>()
  const preamble: string[] = []
  let current: string | null = null

  for (const line of lines) {
    if (isSectionHeading(line)) {
      current = line.trim().toUpperCase()
      sections.set(current, [])
      continue
    }
    if (current) sections.get(current)!.push(line)
    else preamble.push(line)
  }

  const contactLine = preamble.find((l) => l.includes('@')) ?? ''

  const roles = parseRoles(sections.get('EXPERIENCE') ?? [])

  const chunks: CvChunk[] = [
    ...profileChunks(contactLine),
    ...timelineChunk(roles),
    ...educationChunks(sections.get('EDUCATION') ?? []),
    ...experienceChunks(roles),
    ...projectChunks(sections.get('PROJECTS') ?? []),
    ...skillChunks(sections.get('SKILLS') ?? []),
    ...certificationChunk(sections.get('CERTIFICATIONS') ?? []),
  ]

  // Any section we do not have a dedicated handler for still gets indexed
  // rather than silently dropped.
  for (const [name, body] of sections) {
    const handled = [
      'EDUCATION',
      'EXPERIENCE',
      'PROJECTS',
      'SKILLS',
      'CERTIFICATIONS',
    ]
    if (handled.includes(name) || body.length === 0) continue
    chunks.push({
      id: `section-${slug(name)}`,
      section: name.toLowerCase(),
      title: name.charAt(0) + name.slice(1).toLowerCase(),
      meta: '',
      text: `${profile.name} — ${name.toLowerCase()}:\n${body.join('\n')}`,
    })
  }

  return chunks.filter((c) => c.text.trim().length > 0)
}
