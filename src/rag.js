// Local-first RAG — QVAC SDK embeddings, no cloud.
// Retrieval is semantic: we embed every note chunk through the QVAC SDK and
// rank by cosine similarity (blended with a small lexical signal for
// robustness). If the installed SDK exposes no embedding model, we transparently
// fall back to a deterministic, fully-local hashing embedding so RAG still works
// completely offline and never crashes. The active embedder is recorded in the
// index (`embedder`) and surfaced honestly — see src/qvac.js `embedSource()`.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { embed, embedSource } from "./qvac.js"
import { DATA_SUBDIR } from "./paths.js"

const DOCS = join(DATA_SUBDIR, "notes")
const INDEX = join(DATA_SUBDIR, "index.json")

function chunk(text, size = 400) {
	const words = text.split(/\s+/)
	const out = []
	for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size).join(" "))
	return out
}

// Build the on-device vector index. Embeddings run through the QVAC SDK.
export async function buildIndex() {
	mkdirSync(DOCS, { recursive: true })
	const files = readdirSync(DOCS).filter((f) => /\.(md|txt)$/.test(f))
	const raw = []
	for (const f of files) {
		const text = readFileSync(join(DOCS, f), "utf8")
		chunk(text).forEach((c, i) => raw.push({ id: `${f}#${i}`, source: f, text: c }))
	}
	const vectors = raw.length ? await embed(raw.map((c) => c.text)) : []
	const chunks = raw.map((c, i) => ({ ...c, vec: vectors[i] || [] }))
	writeFileSync(
		INDEX,
		JSON.stringify({
			built: new Date().toISOString(),
			embedder: embedSource(),
			dim: chunks[0]?.vec?.length || 0,
			chunks,
		}, null, 2),
	)
	console.log(`RAG index built: ${chunks.length} chunks from ${files.length} docs (embedder: ${embedSource()})`)
	return chunks.length
}

function cosine(a, b) {
	if (!a || !b || a.length !== b.length || !a.length) return 0
	let dot = 0, na = 0, nb = 0
	for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
	return dot / ((Math.sqrt(na) * Math.sqrt(nb)) || 1)
}

// Cheap lexical overlap, blended with vector similarity so retrieval stays
// robust even if an index predates embeddings.
function lexical(q, text) {
	const qs = new Set(q.toLowerCase().split(/\s+/).filter(Boolean))
	if (!qs.size) return 0
	let s = 0
	for (const w of text.toLowerCase().split(/\s+/)) if (qs.has(w)) s++
	return s / qs.size
}

// Semantic retrieval: embed the query through QVAC, rank chunks by similarity.
export async function retrieve(query, k = 3) {
	if (!existsSync(INDEX)) return []
	let parsed
	try { parsed = JSON.parse(readFileSync(INDEX, "utf8")) } catch { return [] }
	const chunks = parsed.chunks || []
	if (!chunks.length) return []
	let qvec = []
	try { qvec = (await embed([query]))[0] || [] } catch {}
	const scored = chunks.map((c) => {
		const sim = c.vec && c.vec.length ? cosine(qvec, c.vec) : 0
		const lex = lexical(query, c.text)
		return { ...c, _s: sim * 0.85 + lex * 0.15 }
	})
	return scored.sort((a, b) => b._s - a._s).slice(0, k).filter((c) => c._s > 0.01)
}
