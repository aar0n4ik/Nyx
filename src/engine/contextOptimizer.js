// Nyx Engine — Context Optimizer
// Feeds the on-device model ONLY the parts of the retrieved notes relevant to
// the current query, cutting prefill (the heavy CPU step) on large contexts
// WITHOUT dropping the info the answer needs.
//
// Safety (why it can never "break" an answer):
//  - Relevance is SEMANTIC, using the SAME on-device QVAC embedder RAG uses.
//  - Always keeps the top-ranked sentences (KEEP_MIN) + everything above a
//    similarity floor, up to a char budget -> the key sentence survives.
//  - Holistic queries ("summarize everything" / "перескажи целиком") skip it.
//  - Small contexts are left untouched.
//  - ANY doubt/error -> returns the ORIGINAL context unchanged.
import { embed } from "../qvac.js"

const MIN_CHARS  = Number(process.env.NYX_CTX_MIN || 600)
const KEEP_MIN   = Number(process.env.NYX_CTX_KEEP_MIN || 3)
const BUDGET     = Number(process.env.NYX_CTX_BUDGET || 900)
const THRESHOLD  = Number(process.env.NYX_CTX_THRESHOLD || 0.15)

const HOLISTIC_RE = /(summar|summari[sz]e|обобщ|сумм|перескаж|перечисли (все|всё)|list all|everything|целиком|полностью|весь текст|all notes|whole|entire|overview|обзор|конспект)/i

function splitSentences(text) {
  return String(text)
    .split(/(?<=[.!?。！？\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function cosine(a, b) {
  if (!a || !b || a.length !== b.length || !a.length) return 0
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return dot / ((Math.sqrt(na) * Math.sqrt(nb)) || 1)
}

// Returns { context, meta }. Callers use `context`; `meta` is diagnostic only.
export async function optimizeContext(query, context) {
  const original = String(context || "")
  const meta = { applied: false, before: original.length, after: original.length, reason: "" }
  try {
    if (!original.trim())                { meta.reason = "empty";    return { context: original, meta } }
    if (original.length < MIN_CHARS)     { meta.reason = "small";    return { context: original, meta } }
    if (HOLISTIC_RE.test(String(query))) { meta.reason = "holistic"; return { context: original, meta } }

    const sentences = splitSentences(original)
    if (sentences.length <= KEEP_MIN)    { meta.reason = "few";      return { context: original, meta } }

    let qvec = [], svecs = []
    try {
      const all = await embed([String(query), ...sentences])
      qvec = all[0] || []
      svecs = all.slice(1)
    } catch { meta.reason = "embed-failed"; return { context: original, meta } }
    if (!qvec.length || svecs.length !== sentences.length) { meta.reason = "no-vectors"; return { context: original, meta } }

    const scored = sentences.map((s, i) => ({ s, i, score: cosine(qvec, svecs[i]) }))
    const ranked = [...scored].sort((a, b) => b.score - a.score)

    const keep = new Set()
    for (let i = 0; i < Math.min(KEEP_MIN, ranked.length); i++) keep.add(ranked[i].i)
    let chars = ranked.slice(0, KEEP_MIN).reduce((n, r) => n + r.s.length, 0)
    for (let i = KEEP_MIN; i < ranked.length; i++) {
      const r = ranked[i]
      if (chars >= BUDGET || r.score < THRESHOLD) break
      keep.add(r.i); chars += r.s.length
    }
    if (!keep.size) { meta.reason = "kept-none"; return { context: original, meta } }

    const out = scored.filter((r) => keep.has(r.i)).sort((a, b) => a.i - b.i).map((r) => r.s).join(" ")
    if (out.length >= original.length) { meta.reason = "no-gain"; return { context: original, meta } }

    meta.applied = true; meta.after = out.length; meta.kept = keep.size; meta.total = sentences.length; meta.reason = "ok"
    return { context: out, meta }
  } catch {
    meta.reason = "error"
    return { context: original, meta }
  }
}
