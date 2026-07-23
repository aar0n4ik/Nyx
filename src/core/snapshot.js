// src/core/snapshot.js
// Nyx Snapshot — снимок и перенос системы.
// Модуль НЕ разговаривает: отдаёт только данные и выполняет действия.
// Все объяснения формирует Nyx Brain на языке пользователя.
//
// Снимок = компактный файл (килобайты): список приложений (winget export),
// настройки (WinGet Configuration / DSC), каталог папок данных (пути и размеры,
// БЕЗ самих файлов). Захват — read-only. Восстановление — только с подтверждением.

import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { writeFile, readFile, readdir, stat } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const MAGIC = "NYX-SNAPSHOT"
const pexec = promisify(execFile)
const isWin = () => process.platform === "win32"

async function run(cmd, args = [], { timeout = 60000 } = {}) {
  try {
    const { stdout, stderr } = await pexec(cmd, args, { timeout, windowsHide: true, maxBuffer: 32 * 1024 * 1024 })
    return { ok: true, code: 0, stdout: stdout ?? "", stderr: stderr ?? "" }
  } catch (e) {
    return { ok: false, code: e?.code ?? -1, stdout: e?.stdout ?? "", stderr: e?.stderr ?? String(e?.message || e) }
  }
}

// Размер папки с дедлайном — не вешаем слабый ПК.
async function dirSize(root, { deadlineMs = 700 } = {}) {
  const end = Date.now() + deadlineMs
  let bytes = 0, approx = false
  const stack = [root]
  while (stack.length) {
    if (Date.now() > end) { approx = true; break }
    const dir = stack.pop()
    let entries
    try { entries = await readdir(dir, { withFileTypes: true }) } catch { continue }
    for (const ent of entries) {
      const p = path.join(dir, ent.name)
      try {
        if (ent.isDirectory()) stack.push(p)
        else if (ent.isFile()) bytes += (await stat(p)).size
      } catch {}
    }
  }
  return { bytes, approx }
}

export function human(b = 0) {
  const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0, n = b
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`
}

async function captureApps() {
  if (!isWin()) return { source: null, packages: [] }
  const tmp = path.join(os.tmpdir(), `nyx-apps-${Date.now()}.json`)
  const r = await run("winget", ["export", "-o", tmp, "--accept-source-agreements", "--include-versions"], { timeout: 120000 })
  if (!r.ok) return { source: "winget", packages: [], error: r.stderr.slice(0, 400) }
  try {
    const json = JSON.parse(await readFile(tmp, "utf8"))
    return {
      source: "winget",
      packages: (json?.Sources ?? []).flatMap(s => (s.Packages ?? []).map(p => ({
        id: p.PackageIdentifier, version: p.Version ?? null, source: s?.SourceDetails?.Name ?? "winget",
      }))),
    }
  } catch (e) { return { source: "winget", packages: [], error: String(e?.message || e) } }
}

async function captureConfig() {
  if (!isWin()) return null
  const tmp = path.join(os.tmpdir(), `nyx-dsc-${Date.now()}.yaml`)
  for (const args of [["configure", "export", "--all", "-o", tmp], ["configure", "export", "-o", tmp]]) {
    const r = await run("winget", [...args, "--accept-configuration-agreements"], { timeout: 60000 }).catch(() => ({ ok: false }))
    if (r.ok) { try { return { format: "dsc-v3", yaml: await readFile(tmp, "utf8") } } catch {} }
  }
  return null
}

function dataTargets() {
  const home = os.homedir(), A = process.env.APPDATA, L = process.env.LOCALAPPDATA
  const t = [
    ["desktop", path.join(home, "Desktop")], ["documents", path.join(home, "Documents")],
    ["downloads", path.join(home, "Downloads")], ["pictures", path.join(home, "Pictures")],
    ["videos", path.join(home, "Videos")], ["music", path.join(home, "Music")],
  ]
  if (A) t.push(["appdata-roaming", A])
  if (L) t.push(["appdata-local", L])
  return t
}

async function captureData({ sizes = true } = {}) {
  const out = []
  for (const [key, p] of dataTargets()) {
    let exists = false
    try { await stat(p); exists = true } catch {}
    const item = { key, path: p, exists }
    if (exists && sizes) { const s = await dirSize(p); item.bytes = s.bytes; item.approx = s.approx; item.human = human(s.bytes) }
    out.push(item)
  }
  return out
}

// Подпись Ed25519 через node:crypto по ключу .poli.key (как в src/poli.js). Нет ключа — null.
async function sign(data) {
  try {
    const { createPrivateKey, sign: edSign } = await import("node:crypto")
    const key = createPrivateKey(await readFile(".poli.key"))
    return { alg: "ed25519", sig: edSign(null, Buffer.from(JSON.stringify(data)), key).toString("base64") }
  } catch { return null }
}

export async function capture({ out, sizes = true } = {}) {
  const name = `nyx-snapshot-${os.hostname()}-${new Date().toISOString().slice(0, 10)}.json`
  const target = out || path.join(os.homedir(), name)
  const [apps, config, userData] = await Promise.all([captureApps(), captureConfig(), captureData({ sizes })])
  const body = {
    _magic: MAGIC, _type: "nyx.snapshot", version: "1", name,
    createdAt: new Date().toISOString(), machine: os.hostname(),
    os: { platform: process.platform, release: os.release(), arch: os.arch() },
    apps, config, userData,
  }
  body.signature = await sign(body)
  await writeFile(target, JSON.stringify(body, null, 2), "utf8")
  const size = (await stat(target)).size
  return { path: target, blueprint: body, size, human: human(size) }
}

// Чистые данные для мозга — без человеческих фраз.
export function summarize(s) {
  const apps = s?.apps?.packages ?? []
  const data = (s?.userData ?? []).filter(d => d.exists)
  return {
    machine: s?.machine, createdAt: s?.createdAt,
    appCount: apps.length, apps: apps.map(a => ({ id: a.id, version: a.version })),
    hasSettings: !!s?.config,
    dataFolders: data.map(d => ({ key: d.key, path: d.path, bytes: d.bytes, human: d.human, approx: d.approx })),
    totalDataBytes: data.reduce((x, d) => x + (d.bytes || 0), 0),
  }
}

// Опознание входящего файла.
export async function identify(input) {
  let obj = null
  try {
    if (input && typeof input === "object") obj = input
    else if (typeof input === "string") {
      let text = input
      if (!input.trimStart().startsWith("{")) { try { text = await readFile(input, "utf8") } catch {} }
      obj = JSON.parse(text)
    }
  } catch { return { recognized: false } }
  if (!obj || obj._magic !== MAGIC) return { recognized: false }
  return { recognized: true, kind: "nyx.snapshot", version: obj.version, ...summarize(obj), snapshot: obj }
}

// План — ничего не выполняет.
export function plan(s, { select } = {}) {
  const apps = s?.apps?.packages ?? []
  const chosenApps = select?.apps ? apps.filter(a => select.apps.includes(a.id)) : apps
  const steps = [{ kind: "restore-point", risk: "low" }]
  if (chosenApps.length) steps.push({ kind: "apps", risk: "medium", count: chosenApps.length })
  if (s?.config) steps.push({ kind: "settings", risk: "medium" })
  const data = (s?.userData ?? []).filter(d => d.exists && (!select?.data || select.data.includes(d.path)))
  if (data.length) steps.push({ kind: "data", risk: "high", folders: data.map(d => ({ key: d.key, path: d.path, human: d.human })) })
  return steps
}

async function ensureRestorePoint() {
  if (!isWin()) return { ok: false, skipped: true }
  return run("powershell", ["-NoProfile", "-Command",
    "Checkpoint-Computer -Description 'Nyx' -RestorePointType MODIFY_SETTINGS"], { timeout: 120000 })
}

export async function restore(s, { confirm = false, select, dataDir, onStep } = {}) {
  if (!confirm) return { type: "proposal", steps: plan(s, { select }) }
  if (!isWin()) return { type: "error", error: "windows-only" }
  const results = []
  const report = (kind, r) => { onStep?.({ kind, result: r }); results.push({ kind, ...r }) }

  report("restore-point", await ensureRestorePoint())

  const apps = s?.apps?.packages ?? []
  const chosen = select?.apps ? apps.filter(a => select.apps.includes(a.id)) : apps
  if (chosen.length) {
    const tmp = path.join(os.tmpdir(), `nyx-import-${Date.now()}.json`)
    await writeFile(tmp, JSON.stringify({
      "$schema": "https://aka.ms/winget-packages.schema.2.0.json",
      Sources: [{ SourceDetails: { Name: "winget", Argument: "https://cdn.winget.microsoft.com/cache", Type: "Microsoft.PreIndexed.Package" },
        Packages: chosen.map(a => ({ PackageIdentifier: a.id })) }],
    }, null, 2), "utf8")
    report("apps", await run("winget", ["import", "-i", tmp, "--accept-package-agreements", "--accept-source-agreements", "--ignore-versions", "--no-upgrade"], { timeout: 30 * 60000 }))
  }
  if (s?.config?.yaml) {
    const tmp = path.join(os.tmpdir(), `nyx-config-${Date.now()}.yaml`)
    await writeFile(tmp, s.config.yaml, "utf8")
    report("settings", await run("winget", ["configure", "-f", tmp, "--accept-configuration-agreements", "--disable-interactivity"], { timeout: 30 * 60000 }))
  }
  const data = (s?.userData ?? []).filter(d => d.exists && (!select?.data || select.data.includes(d.path)))
  if (data.length && dataDir) {
    for (const d of data)
      report("data:" + d.key, await run("robocopy", [path.join(dataDir, d.key), d.path, "/E", "/R:1", "/W:1", "/NFL", "/NDL"], { timeout: 60 * 60000 }))
  }
  return { type: "done", results }
}

export default { capture, summarize, identify, plan, restore, human }
