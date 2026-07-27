// src/engine/semanticCache.js
// ─────────────────────────────────────────────────────────────────────────────
// Nyx Engine — Semantic Answer Cache.
// Repeated or *reworded* questions are returned INSTANTLY, with zero model
// compute. We embed the query through the SAME on-device QVAC embedder the RAG
// uses (src/qvac.js `embed`) — no new dependency, no cloud — and if a previous
// question is close enough by MEANING (cosine >= threshold), we return the
// stored answer in ~0 ms. On a cache hit the model (Qwen3-4B) is never woken up,
// saving 100% of the CPU/GPU/time that generation would have cost.
//
// Fully defensive: every method swallows its own errors and degrades to "miss",
// so the cache can only ever speed Nyx up — it can never break answering.
// ─────────────────────────────────────────────────────────────────────────────
import { embed } from "../qvac.js"

const THRESHOLD = Number(process.env.NYX_CACHE_THRESHOLD || 0.9) // meaning-match, not exact text
const MAX_ENTRIES = Number(process.env.NYX_CACHE_MAX || 300)     // LRU cap -> flat memory
const MIN_LEN = 8                                                // skip ultra-short/ambiguous queries

const entries = [] // { q, vec, answer, sources, hits, at }
let hitCount = 0
let missCount = 0

function cosine(a, b) {
  if (!a || !b || a.length !== b.length || !a.length) return 0
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return dot / ((Math.sqrt(na) * Math.sqrt(nb)) || 1)
}

async function embedOne(text) {
  const out = await embed([String(text)])
  const vec = out && out[0]
  return vec && vec.length ? vec : null
}

// Find a semantically-equivalent answered question. Returns the cached answer
// object or null. Never throws.
export async function find(query) {
  try {
    const q = String(query || "").trim()
    if (q.length < MIN_LEN || !entries.length) { missCount++; return null }
    const vec = await embedOne(q)
    if (!vec) { missCount++; return null }
    let best = null, score = -1
    for (const e of entries) { const s = cosine(vec, e.vec); if (s > score) { score = s; best = e } }
    if (best && score >= THRESHOLD) {
      best.hits++; best.at = Date.now(); hitCount++
      return { answer: best.answer, sources: best.sources || [], score: +score.toFixed(3), matchedQuery: best.q }
    }
    missCount++
    return null
  } catch { return null }
}

// Store a freshly-generated answer. Never throws.
export async function add(query, answer, sources = []) {
  try {
    const q = String(query || "").trim()
    const a = String(answer || "").trim()
    if (q.length < MIN_LEN || !a) return
    const vec = await embedOne(q)
    if (!vec) return
    for (const e of entries) {
      if (cosine(vec, e.vec) >= 0.985) { e.answer = a; e.sources = sources; e.at = Date.now(); return }
    }
    entries.push({ q, vec, answer: a, sources, hits: 0, at: Date.now() })
    if (entries.length > MAX_ENTRIES) {
      let oldest = 0
      for (let i = 1; i < entries.length; i++) if (entries[i].at < entries[oldest].at) oldest = i
      entries.splice(oldest, 1)
    }
  } catch { /* best-effort only */ }
}

// Honest live stats for the UI / metrics / benchmarks.
export function stats() {
  const total = hitCount + missCount
  return { entries: entries.length, hits: hitCount, misses: missCount, hitRate: total ? +(hitCount / total).toFixed(3) : 0, threshold: THRESHOLD }
}

export function clear() { entries.length = 0; hitCount = 0; missCount = 0 }

export const semanticCache = { find, add, stats, clear }
export default semanticCache
