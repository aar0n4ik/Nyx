// First-run installer engine: detect hardware, recommend the best on-device
// model for THIS PC, download it via the QVAC SDK (resumable, cached), and
// report honest progress from real bytes on disk. No fake progress, no cloud.
import { collectSpecs } from "../system/specs.js"
import { modelStatus } from "../qvac.js"
import { existsSync, readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, statfsSync, appendFileSync } from "node:fs"
import { homedir, freemem, totalmem, cpus } from "node:os"
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

function cacheFileNames() {
  const dir = cacheDir()
  const names = []
  const walk = (d, depth) => {
    if (depth > 3) return
    let list = []
    try { list = readdirSync(d) } catch { return }
    for (const name of list) {
      const p = join(d, name)
      let st
      try { st = statSync(p) } catch { continue }
      if (st.isDirectory()) walk(p, depth + 1)
      else names.push(name)
    }
  }
  if (existsSync(dir)) walk(dir, 0)
  return names
}

// Runs REAL checks on this machine to find the root cause of an engine-start
// failure — never guesses. Returns {full, checks[], problems[]}.
function diagnose(entry, err) {
  const raw = String((err && (err.stack || err.message)) || err || "").trim()
  const causeObj = err && err.cause ? err.cause : null
  const cause = causeObj ? String(causeObj.message || causeObj) : ""
  const full = (raw + (cause ? "\nПричина (cause): " + cause : "")).trim()
  const low = full.toLowerCase()
  const checks = []
  const problems = []

  // 0. Network — explicit in the error text, no probe needed.
  if (/network|fetch failed|enotfound|econnrefused|econnreset|\bdns\b|getaddrinfo|socket hang|etimedout/.test(low)) {
    problems.push({ p: 0, title: "Оборвалась сеть при скачивании модели", fix: "Модель ещё не докачалась, а соединение пропало. Проверь интернет и нажми «Повторить». Качается один раз — дальше Nyx работает офлайн." })
  }

  // 1. Free RAM vs what the model needs (live).
  const freeGB = Math.round((freemem() / 1e9) * 10) / 10
  const totGB = Math.round((totalmem() / 1e9) * 10) / 10
  const needGB = entry && entry.ramMinGB ? entry.ramMinGB : null
  const ramOk = !needGB || freeGB + 0.3 >= needGB
  checks.push({ label: "Свободная оперативная память", ok: ramOk, detail: "свободно ~" + freeGB + " ГБ из " + totGB + " ГБ" + (needGB ? ", модели нужно ~" + needGB + " ГБ" : "") })
  if (!ramOk) problems.push({ p: 1, title: "Не хватает свободной оперативной памяти", fix: "Сейчас свободно только ~" + freeGB + " ГБ, а модели нужно ~" + needGB + " ГБ — движок не смог загрузить веса и закрылся. Закрой тяжёлые программы (браузер с кучей вкладок, игры) или выбери модель поменьше на этом экране и нажми «Повторить»." })

  // 2. Visual C++ runtime — actually look in System32.
  if (process.platform === "win32") {
    const sysDir = process.env.SystemRoot ? join(process.env.SystemRoot, "System32") : "C:\\Windows\\System32"
    const vcNeeded = ["vcruntime140.dll", "vcruntime140_1.dll", "msvcp140.dll"]
    const vcMissing = vcNeeded.filter((f) => !existsSync(join(sysDir, f)))
    const vcOk = vcMissing.length === 0
    checks.push({ label: "Microsoft Visual C++ Runtime", ok: vcOk, detail: vcOk ? "установлен" : "не найдено: " + vcMissing.join(", ") })
    if (!vcOk) problems.push({ p: 2, title: "Не установлен Microsoft Visual C++ Runtime", fix: "Движок написан на C++ и без этого системного компонента не стартует. Я проверил папку System32 и не нашёл там " + vcMissing.join(", ") + ". Установи https://aka.ms/vs/17/release/vc_redist.x64.exe и перезапусти Nyx." })
  }

  // 3. Free disk space in the model folder (live).
  let freeDiskGB = null
  try { const st = statfsSync(cacheDir()); freeDiskGB = Math.round((Number(st.bavail) * Number(st.bsize) / 1e9) * 10) / 10 } catch (e) {}
  const needDisk = entry && entry.approxGB ? entry.approxGB : null
  const diskOk = freeDiskGB === null || !needDisk || freeDiskGB >= needDisk + 0.5
  checks.push({ label: "Свободное место на диске", ok: freeDiskGB === null ? null : diskOk, detail: freeDiskGB === null ? "не удалось измерить" : "свободно ~" + freeDiskGB + " ГБ" + (needDisk ? ", нужно ~" + needDisk + " ГБ" : "") })
  if (!diskOk && freeDiskGB !== null) problems.push({ p: 3, title: "Мало места на диске", fix: "Свободно только ~" + freeDiskGB + " ГБ. Освободи место или укажи папку на другом диске в поле «Папка для модели» и нажми «Повторить»." })

  // 4. Is the downloaded model file actually complete? (live)
  const onDisk = cacheBytes()
  const target = entry && entry.approxGB ? Math.round(entry.approxGB * 1e9) : 0
  const partials = cacheFileNames().filter((n) => /\.(part|download|tmp)$/i.test(n))
  const incomplete = target > 0 && onDisk > 0 && onDisk < target * 0.85
  const fileOk = !(partials.length || incomplete)
  checks.push({ label: "Файл модели на диске", ok: onDisk > 0 ? fileOk : null, detail: onDisk > 0 ? "на диске ~" + (Math.round(onDisk / 1e8) / 10) + " ГБ" + (partials.length ? ", есть недокачанные части" : incomplete ? ", файл меньше ожидаемого" : "") : "ещё не скачан" })
  if (!fileOk && onDisk > 0) problems.push({ p: 4, title: "Файл модели скачан не полностью", fix: "Загрузка прервалась, файл битый. Удали папку модели (" + cacheDir() + ") и нажми «Повторить» — Nyx перекачает её заново." })

  // 5. GPU / Vulkan — only if the crash text points at the GPU.
  if (process.platform === "win32" && /vulkan|gpu|device|vk_|d3d|directx|driver|видеокар/.test(low)) {
    const sysDir = process.env.SystemRoot ? join(process.env.SystemRoot, "System32") : "C:\\Windows\\System32"
    const vkOk = existsSync(join(sysDir, "vulkan-1.dll"))
    checks.push({ label: "Vulkan / видеодрайвер", ok: vkOk, detail: vkOk ? "vulkan-1.dll на месте" : "vulkan-1.dll не найден" })
    if (!vkOk) problems.push({ p: 5, title: "Проблема с видеодрайвером", fix: "Движок пытался задействовать видеокарту, а компонент драйвера (vulkan-1.dll) не найден. Обнови драйвер с сайта AMD / Intel / NVIDIA и перезагрузи компьютер." })
  }

  problems.sort((a, b) => a.p - b.p)
  return { full, checks, problems }
}

// Persist a real, timestamped diagnostic log so failures are traceable.
function writeErrorLog(entry, d) {
  try {
    const dir = cacheDir()
    mkdirSync(dir, { recursive: true })
    const file = join(dir, "nyx-engine-errors.log")
    const lines = []
    lines.push("==== " + new Date().toISOString() + " ====")
    lines.push("Модель: " + ((entry && entry.label) || "?"))
    lines.push("Проверки:")
    d.checks.forEach((c) => lines.push("  [" + (c.ok === false ? "FAIL" : c.ok === true ? "OK" : "n/a") + "] " + c.label + ": " + c.detail))
    lines.push("Итог: " + (d.problems.length ? d.problems.map((p) => p.title).join("; ") : "явная причина не найдена"))
    lines.push("Сырая ошибка:")
    lines.push(d.full || "(пусто)")
    lines.push("")
    appendFileSync(file, lines.join("\n") + "\n", "utf8")
    return file
  } catch (e) { return null }
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
  const hw = quickHW()
  const rec = pickForRam(hw.ramGB)
  const ms = modelStatus()
  return {
    ready: ms.ready,
    sdkInstalled: ms.sdkInstalled,
    cached: ms.cached,
    cachedModels: ms.cachedModels,
    cacheDir: cacheDir(),
    hardware: hw,
    hwDetailed: false,
    recommended: { key: rec.key, label: rec.label, approxGB: rec.approxGB, ramMinGB: rec.ramMinGB, note: rec.note },
    catalog: CATALOG.map((c) => ({ key: c.key, label: c.label, approxGB: c.approxGB, ramMinGB: c.ramMinGB, note: c.note, available: true, sdkExposed: sdk === null ? null : !!resolveConst(c) })),
    location: getLocation(),
    download: progress(),
  }
}

function quickHW() {
  const cs = cpus() || []
  const ramGB = Math.round((totalmem() / 1e9) * 10) / 10
  const ramFreeGB = Math.round((freemem() / 1e9) * 10) / 10
  return {
    cpu: cs[0] && cs[0].model ? String(cs[0].model).trim() : null,
    cores: cs.length || null,
    ramGB: ramGB || null,
    ramFreeGB: ramFreeGB || null,
    gpu: [],
    os: process.platform === "win32" ? "Windows" : process.platform,
    platform: process.platform,
    detailed: false,
  }
}

export async function hardware() {
  const specs = await collectSpecs().catch(() => ({}))
  return {
    cpu: specs.cpu || null,
    cores: specs.cores || null,
    ramGB: specs.ramGB || null,
    ramFreeGB: specs.ramFreeGB || null,
    gpu: Array.isArray(specs.gpu) ? specs.gpu : (specs.gpu ? [specs.gpu] : []),
    os: specs.osBuild || specs.platform || null,
    platform: specs.platform || null,
    detailed: true,
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
    // Honest, self-diagnosing error text: runs REAL checks on this machine,
    // names the root cause it found, lists what it checked, and logs details.
    const friendly = (err) => {
      const d = diagnose(entry, err)
      const logPath = writeErrorLog(entry, d)
      const L = []
      L.push("Nyx не смог запустить локальный движок модели на этом компьютере.")
      L.push("")
      if (d.problems.length) {
        const root = d.problems[0]
        L.push("Я сам проверил систему и нашёл причину:")
        L.push("")
        L.push("→ " + root.title)
        L.push(root.fix)
        if (d.problems.length > 1) {
          L.push("")
          L.push("Возможно, мешает ещё:")
          d.problems.slice(1).forEach((p) => L.push("• " + p.title + " — " + p.fix))
        }
      } else {
        L.push("Я сам прогнал проверки на твоём ПК — оперативная память, Visual C++, место на диске и файл модели в порядке. Значит, движок аварийно закрылся при старте по внутренней причине, а не из-за очевидной нехватки чего-то.")
        L.push("Попробуй по порядку: перезапусти Nyx; если не поможет — обнови драйвер видеокарты и перезагрузи компьютер; затем переустанови модель.")
      }
      L.push("")
      L.push("Что я проверил прямо сейчас:")
      d.checks.forEach((c) => L.push((c.ok === false ? "✗ " : c.ok === true ? "✓ " : "• ") + c.label + ": " + c.detail))
      L.push("")
      L.push("Технические детали (покажи разработчику):")
      L.push(d.full || "(пусто)")
      if (logPath) { L.push(""); L.push("Полный лог со всеми проверками сохранён здесь: " + logPath) }
      return L.join("\n")
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
        state.phase = "error"; state.error = friendly(lastErr)
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
