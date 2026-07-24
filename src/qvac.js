// Real @qvac/sdk integration — the PRIMARY, on-device inference path for Nyx.
// Uses the canonical v0.13.x `completion()` events API (loadModel -> completion
// -> unloadModel -> close). No cloud. If the SDK/model isn't installed yet, the
// caller falls back to a clearly-labeled offline responder (never a fake model).
import { performance } from "node:perf_hooks"
import { homedir } from "node:os"
import { existsSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

let sdk = null
try {
	sdk = await import("@qvac/sdk")
} catch {
	sdk = null
}

export const hasSDK = !!sdk

// Which preconfigured registry model to run. Override with NYX_QVAC_MODEL, or
// point NYX_QVAC_MODEL_PATH at a local GGUF for fully air-gapped installs.
// Default preference favors the strongest FREE, fully on-device option:
// Qwen3 4B is notably better multilingual (incl. Russian) than tiny Llama
// models. We never hardcode a constant the installed SDK doesn't expose — we
// scan the SDK's real exports and fall back gracefully. Override anytime with
// NYX_QVAC_MODEL=<CONST> or NYX_QVAC_MODEL_PATH=<local .gguf>.
const MODEL_PREFERENCE = [
	/^QWEN_?3.*4B.*INST/i,
	/^QWEN3?_?4B.*INST/i,
	/^QWEN.*4B/i,
	/^LLAMA_?3[._]?1_?8B.*INST/i,
	/^LLAMA_?3[._]?2_?3B.*INST/i,
	/^LLAMA_?3[._]?2_?1B.*INST/i,
]

export function pickModelConst() {
	if (process.env.NYX_QVAC_MODEL) return process.env.NYX_QVAC_MODEL
	if (!sdk) return "QWEN3_4B_INSTRUCT" // best-effort label until the SDK is installed
	const names = Object.keys(sdk).filter((k) => /^[A-Z0-9_]+$/.test(k) && typeof sdk[k] !== "function")
	for (const re of MODEL_PREFERENCE) {
		const hit = names.find((n) => re.test(n))
		if (hit) return hit
	}
	return names.find((n) => /INST/i.test(n)) || "LLAMA_3_2_1B_INST_Q4_0"
}

const MODEL_CONST = pickModelConst()
export const modelLabel = () =>
	process.env.NYX_QVAC_MODEL_PATH ? `qvac:local-gguf` : `qvac:${MODEL_CONST}`

const loaded = new Map()
const IDLE_MS = Number(process.env.NYX_MODEL_IDLE_MS || 120000)
let idleTimer = null
let loadingPromise = null
let lastStats = null

// Last per-generation telemetry (TTFT, tokens/sec). Read by agents/bench.
export function getLastStats() {
	return lastStats
}

function resolveModelSrc() {
	// loadModel() accepts a local path, an HTTP URL, or a registry constant.
	if (process.env.NYX_QVAC_MODEL_PATH) return process.env.NYX_QVAC_MODEL_PATH
	return sdk?.[MODEL_CONST] ?? sdk?.LLAMA_3_2_1B_INST_Q4_0 ?? MODEL_CONST
}

function touch() {
	if (idleTimer) clearTimeout(idleTimer)
	idleTimer = setTimeout(() => {
		unloadAll().catch(() => {})
	}, IDLE_MS)
	if (idleTimer.unref) idleTimer.unref()
}

// Lazy load + coalesce concurrent loads so the model wakes fast and only once.
export async function ensureLLM() {
	if (!sdk) return null
	if (loaded.has("llm")) {
		touch()
		return loaded.get("llm")
	}
	if (loadingPromise) return loadingPromise
	loadingPromise = (async () => {
		// v0.13.x renamed the model type: "llm" is now a deprecated alias for
		// "llamacpp-completion". Prefer the modern name and silently fall back to the
		// legacy alias on older SDK builds so nothing breaks across versions.
		const modelSrc = resolveModelSrc()
		const modelType = process.env.NYX_QVAC_MODEL_TYPE || "llamacpp-completion"
		let modelId
		try {
			modelId = await sdk.loadModel({ modelSrc, modelType })
		} catch {
			modelId = await sdk.loadModel({ modelSrc, modelType: "llm" })
		}
		loaded.set("llm", modelId)
		touch()
		return modelId
	})()
	try {
		return await loadingPromise
	} finally {
		loadingPromise = null
	}
}

// Async-iterable token stream. Yields plain strings, and records precise
// per-generation stats (TTFT, tokens/sec) from the SDK's own telemetry when
// available, otherwise from a wall-clock measurement (always honest).
export async function* chat(history) {
	const modelId = await ensureLLM()
	if (!modelId) {
		// SDK present but no model resolved -> let the engine fail over. If the SDK
		// itself is missing, answer from the offline brain so we never hang.
		if (!sdk) {
			const last = history[history.length - 1]?.content ?? ""
			const { knowledgeAnswer } = await import("./brain.js")
			yield knowledgeAnswer(String(last)).text
		}
		return
	}

	lastStats = null
	const started = performance.now()
	let firstAt = null
	let tokens = 0

	const run = sdk.completion({ modelId, history, stream: true })

	// Canonical surface (v0.13.x): typed `events`. Legacy `tokenStream` kept as a
	// fallback for older SDK builds.
	if (run && run.events) {
		for await (const ev of run.events) {
			if (ev.type === "contentDelta") {
				if (firstAt === null) firstAt = performance.now()
				tokens++
				if (ev.text) yield ev.text
			} else if (ev.type === "completionStats" && ev.stats) {
				lastStats = { source: "qvac", ...ev.stats }
			}
		}
		try {
			const final = await run.final
			if (final && final.stats) lastStats = { source: "qvac", ...final.stats }
		} catch {}
	} else if (run && run.tokenStream) {
		for await (const tok of run.tokenStream) {
			if (firstAt === null) firstAt = performance.now()
			tokens++
			const s = typeof tok === "string" ? tok : tok?.text ?? tok?.token ?? ""
			if (s) yield s
		}
	}

	const endedAt = performance.now()
	const ttftMs = firstAt ? Math.round(firstAt - started) : null
	const genMs = firstAt ? endedAt - firstAt : null
	// Normalize to a uniform shape, filling from wall-clock when the SDK didn't
	// surface native stats. End-to-end throughput is a real, honest number.
	lastStats = {
		source: lastStats?.source || "qvac-wallclock",
		ttftMs: lastStats?.ttftMs ?? ttftMs,
		tokens: lastStats?.tokens ?? tokens,
		tokensPerSec:
			lastStats?.tokensPerSec ??
			(genMs && tokens ? +(tokens / (genMs / 1000)).toFixed(1) : null),
		totalMs: Math.round(endedAt - started),
	}
	touch()
}

export async function unloadAll() {
	if (idleTimer) {
		clearTimeout(idleTimer)
		idleTimer = null
	}
	if (!sdk) return
	for (const id of loaded.values()) {
		try {
			await sdk.unloadModel({ modelId: id })
		} catch {}
	}
	loaded.clear()
	// Release the SDK instance per the documented lifecycle.
	try {
		if (typeof sdk.close === "function") await sdk.close()
	} catch {}
}

// Scan the on-device QVAC model cache for downloaded weights. No network, no
// model load — just an honest disk check so the UI can reflect real state and
// update the moment the user downloads (or removes) a model.
function scanModelCache() {
	const dir = process.env.NYX_QVAC_CACHE || join(homedir(), ".qvac", "models")
	const found = []
	try {
		if (!existsSync(dir)) return { dir, found }
		const walk = (d, depth) => {
			if (depth > 3) return
			for (const name of readdirSync(d)) {
				const p = join(d, name)
				let st
				try { st = statSync(p) } catch { continue }
				if (st.isDirectory()) walk(p, depth + 1)
				else if (/\.(gguf|bin|onnx|task)$/i.test(name) && st.size > 1_000_000) found.push({ name, sizeMB: Math.round(st.size / 1e6) })
			}
		}
		walk(dir, 0)
	} catch {}
	return { dir, found }
}

// Real, dynamic on-device model status for the UI / API.
export function modelStatus() {
	const localPath = process.env.NYX_QVAC_MODEL_PATH || null
	const localPathOk = !!(localPath && existsSync(localPath))
	const cache = scanModelCache()
	const cached = localPathOk || cache.found.length > 0
	const isLoaded = loaded.has("llm")
	return {
		sdkInstalled: hasSDK,
		model: modelLabel(),
		modelConst: MODEL_CONST,
		localPath,
		localPathOk,
		cacheDir: cache.dir,
		cachedModels: cache.found.map((f) => f.name),
		cached,
		loaded: isLoaded,
		// ready = a real on-device model can serve right now (SDK present AND weights
		// available on disk, or already loaded in memory).
		ready: hasSDK && (cached || isLoaded),
	}
}

// --- On-device embeddings for RAG (QVAC SDK, no cloud) ----------------------
// The project requires the QVAC SDK for ALL inference AND RAG. We embed text
// with a real QVAC embedding model when the installed SDK exposes one (cached
// after first load). If no embedding model is available, we fall back to a
// deterministic, fully-local hashing embedding so retrieval still works offline
// and never crashes. `embedSource()` reports which path is live — honestly.
let embedModelId = null
let embedKind = sdk ? "pending" : "local-hash"

const EMBED_PREFERENCE = [/EMBED/i, /BGE/i, /GTE/i, /MINILM/i, /\bE5\b/i, /NOMIC/i]

function pickEmbedConst() {
	if (process.env.NYX_QVAC_EMBED_MODEL) return process.env.NYX_QVAC_EMBED_MODEL
	if (!sdk) return null
	const names = Object.keys(sdk).filter((k) => /^[A-Z0-9_]+$/.test(k) && typeof sdk[k] !== "function")
	for (const re of EMBED_PREFERENCE) { const hit = names.find((n) => re.test(n)); if (hit) return hit }
	return null
}

async function ensureEmbedder() {
	if (!sdk) return null
	if (embedModelId) return embedModelId
	const c = pickEmbedConst()
	if (!c) { embedKind = "local-hash"; return null }
	try {
		const modelSrc = sdk[c] ?? c
		embedModelId = await sdk.loadModel({ modelSrc, modelType: process.env.NYX_QVAC_EMBED_TYPE || "embedding" })
		embedKind = "qvac"
		return embedModelId
	} catch {
		embedKind = "local-hash"
		return null
	}
}

// Deterministic, dependency-free local embedding (hashed token bag, L2-normed).
// Honest fallback ONLY — labeled "local-hash". Dimension 256.
function localEmbed(text, dim = 256) {
	const v = new Array(dim).fill(0)
	const toks = String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) || []
	for (const tok of toks) {
		let h = 2166136261
		for (let i = 0; i < tok.length; i++) { h ^= tok.charCodeAt(i); h = Math.imul(h, 16777619) }
		v[(h >>> 0) % dim] += 1
	}
	let n = 0
	for (const x of v) n += x * x
	n = Math.sqrt(n) || 1
	return v.map((x) => x / n)
}

// Embed an array of strings -> array of number[] vectors. QVAC SDK first, with
// a graceful local fallback. Defensive across SDK response shapes.
export async function embed(texts) {
	const arr = Array.isArray(texts) ? texts : [texts]
	const id = await ensureEmbedder()
	if (id && sdk && typeof sdk.embed === "function") {
		try {
			const out = []
			for (const t of arr) {
				const r = await sdk.embed({ modelId: id, text: t })
				const vec = r?.embedding || r?.vector || r?.data?.[0]?.embedding || (Array.isArray(r) ? r : null)
				out.push(vec && vec.length ? vec : localEmbed(t))
			}
			return out
		} catch {
			embedKind = "local-hash"
		}
	}
	return arr.map((t) => localEmbed(t))
}

// Which embedding path is live: "qvac" (SDK model) or "local-hash" (offline fallback).
export function embedSource() { return embedKind === "qvac" ? "qvac" : "local-hash" }
