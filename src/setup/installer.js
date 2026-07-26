// First-run installer engine: detect hardware, recommend the best on-device
// model for THIS PC, download it via the QVAC SDK (resumable, cached), and
// report honest progress from real bytes on disk. No fake progress, no cloud.
import { collectSpecs } from "../system/specs.js"
import { modelStatus } from "../qvac.js"
import { existsSync, readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { MODELS_DIR } from "../paths.js"

let sdk = null
try { sdk = await import("@qvac/sdk") } catch { sdk = null }

const CATALOG = [
  { key: "qwen3-8b", label: "Qwen3 8B Instruct", approxGB: 5.03, ramMinGB: 16, strict: true, re: [/QWEN_?3.*8B.*INST/i, /QWEN.*8B/i], note: "Максимум качества, для мощных ПК" },
  { key: "qwen3-4b", label: "Qwen3 4B Instruct", approxGB: 2.5, ramMinGB: 8, re: [/QWEN_?3.*4B.*INST/i, /QWEN.*4B/i], note: "Лучший баланс, сильный русский" },
  { key: "llama32-3b", label: "Llama 3.2 3B Instruct", approxGB: 2.02, ramMinGB: 6, re: [/LLAMA_?3[._]?2_?3B.*INST/i], note: "Легче и быстрее" },
  { key: "llama32-1b", label: "Llama 3.2 1B Instruct", approxGB: 0.81, ramMinGB: 3, re: [/LLAMA_?3[._]?2_?1B.*INST/i], note: "Для слабых ПК" },
]

const DEFAULT_DIR = MODELS_DIR
const LOC_FILE = join(homedir(), ".qvac", "nyx-location.json")

function readSavedDir() {
  try { if (existsSync(LOC_FILE)) { const j = JSON.parse(readFileSync(LOC_FILE, "utf8")); if (j && j.cacheDir) return String(j.cacheDir) } } catch (e) {}
  return null
}
function cacheDir() { return process.env.NYX_QVAC_CACHE || readSavedDir() || DEFAULT_DIR }

export function getLocation() {
  const saved = readSavedDir()
  const dir = cacheDir()
  return { cacheDir: dir, default: DEFAULT_DIR, home: homedir(), saved: !!saved, custom: dir !== DEFAULT_DIR }
}
export function setLocation(dir) {
  if (!dir || typeof dir !== "string" || !dir.trim()) return { ok: false, error: "Путь не указан" }
  const clean = dir.trim()
  try {
    mkdirSync(clean, { recursive: true })
    mkdirSync(join(homedir(), ".qvac"), { recursive: true })
    writeFileSync(LOC_FILE, JSON.stringify({ cacheDir: clean, savedAt: Date.now() }, null, 2))
    process.env.NYX_QVAC_CACHE = clean
    return { ok: true, cacheDir: clean }
  } catch (e) { return { ok: false, error: String((e && e.message) || e) } }
}

function cacheBytes() {
  const dir = cacheDir()
  let total = 0
  const walk = (d, depth) => {
    if (depth > 3) return
    let names = []
    try { names = readdirSync(d) } catch { return }
    for (const name of names) {
      const p = join(d, name)
      let st
      try { st = statSync(p) } catch { continue }
      if (st.isDirectory()) walk(p, depth + 1)
      else if (/\.(gguf|bin|onnx|task|part|download)$/i.test(name)) total += st.size
    }
  }
  if (existsSync(dir)) walk(dir, 0)
  return total
}

function pickForRam(ramGB) {
  const ram = Number(ramGB) || 0
  if (ram >= 16) return entryByKey("qwen3-8b") || entryByKey("qwen3-4b")
  if (ram >= 8) return entryByKey("qwen3-4b")
  if (ram >= 6) return entryByKey("llama32-3b")
  return entryByKey("llama32-1b")
}
function entryByKey(key) { return CATALOG.find((c) => c.key === key) || null }
function resolveConst(entry) {
  if (sdk === null) return null
  const names = Object.keys(sdk).filter((k) => /^[A-Z0-9_]+$/.test(k) && typeof sdk[k] !== "function")
  for (const re of entry.re) { const hit = names.find((n) => re.test(n)); if (hit) return hit }
  return null
}

let state = { phase: "idle", pct: 0, bytes: 0, targetBytes: 0, model: null, note: "", error: null, startedAt: null }
let poller = null

export function progress() {
  if (state.phase === "downloading") {
    const now = cacheBytes()
    state.bytes = now
    if (state.targetBytes > 0) state.pct = Math.min(99, Math.round((now / state.targetBytes) * 100))
  }
  return { ...state }
}

export async function status() {
  const specs = await collectSpecs().catch(() => ({}))
  const rec = pickForRam(specs.ramGB)
  const ms = modelStatus()
  return {
    ready: ms.ready,
    sdkInstalled: ms.sdkInstalled,
    cached: ms.cached,
    cachedModels: ms.cachedModels,
    cacheDir: cacheDir(),
    hardware: {
      cpu: specs.cpu || null,
      cores: specs.cores || null,
      ramGB: specs.ramGB || null,
      ramFreeGB: specs.ramFreeGB || null,
      gpu: Array.isArray(specs.gpu) ? specs.gpu : (specs.gpu ? [specs.gpu] : []),
      os: specs.osBuild || specs.platform || null,
      platform: specs.platform || null,
    },
    recommended: { key: rec.key, label: rec.label, approxGB: rec.approxGB, ramMinGB: rec.ramMinGB, note: rec.note },
    catalog: CATALOG.map((c) => ({ key: c.key, label: c.label, approxGB: c.approxGB, ramMinGB: c.ramMinGB, note: c.note, available: !!resolveConst(c) })),
    location: getLocation(),
    download: progress(),
  }
}

export async function startDownload(modelKey) {
  const ms = modelStatus()
  if (ms.ready) {
    state = { phase: "ready", pct: 100, bytes: cacheBytes(), targetBytes: 0, model: ms.modelConst, note: "Модель уже установлена", error: null, startedAt: Date.now() }
    return { ok: true, ...state }
  }
  if (state.phase === "downloading") return { ok: true, ...state }
  if (sdk === null) {
    state = { phase: "error", pct: 0, bytes: 0, targetBytes: 0, model: null, note: "", error: "QVAC SDK не установлен — выполните: npm i @qvac/sdk", startedAt: Date.now() }
    return { ok: false, ...state }
  }
  const specs = await collectSpecs().catch(() => ({}))
  const entry = entryByKey(modelKey) || pickForRam(specs.ramGB)
  let constName = resolveConst(entry)
  if (!constName && entry.strict) { state = { phase: "error", pct: 0, bytes: 0, targetBytes: 0, model: null, note: "", error: entry.label + " недоступна в этой версии QVAC SDK", startedAt: Date.now() }; return { ok: false, ...state } }
  if (!constName) constName = Object.keys(sdk).find((k) => /INST/i.test(k)) || null
  const modelSrc = constName ? (sdk[constName] ?? constName) : entry.key
  const modelType = process.env.NYX_QVAC_MODEL_TYPE || "llamacpp-completion"

  state = { phase: "downloading", pct: 0, bytes: cacheBytes(), targetBytes: Math.round(entry.approxGB * 1e9), model: entry.label, note: "Загрузка модели на ваш компьютер", error: null, startedAt: Date.now() }
  if (poller) clearInterval(poller)
  poller = setInterval(() => { try { progress() } catch {} }, 1500)
  if (poller.unref) poller.unref()

  ;(async () => {
    const friendly = (raw) => {
      const s = String(raw || "")
      if (/rpc|timed out|timeout|worker|initializ/i.test(s)) {
        return "Не удалось запустить движок модели на этом ПК. Чаще всего помогает: 1) установить Microsoft Visual C++ Redistributable x64 (aka.ms/vs/17/release/vc_redist.x64.exe); 2) обновить драйвер видеокарты; затем перезапустить Nyx. Технические детали: " + s
      }
      return s
    }
    const attempt = async () => {
      try { return await sdk.loadModel({ modelSrc, modelType }) }
      catch { return await sdk.loadModel({ modelSrc, modelType: "llm" }) }
    }
    let modelId = null
    let lastErr = null
    for (let i = 1; i <= 2; i++) {
      try { modelId = await attempt(); lastErr = null; break }
      catch (e) {
        lastErr = e
        if (i < 2) { state.note = "Первая попытка не удалась, повторяем..."; await new Promise((r) => setTimeout(r, 2000)) }
      }
    }
    try {
      if (lastErr) {
        state.phase = "error"; state.error = friendly((lastErr && lastErr.message) || lastErr)
      } else {
        state.phase = "ready"; state.pct = 100; state.bytes = cacheBytes(); state.note = "Готово"
        try { if (modelId) await sdk.unloadModel({ modelId }) } catch {}
      }
    } finally {
      if (poller) { clearInterval(poller); poller = null }
    }
  })()
  return { ok: true, ...state }
}
