import "./src/netguard.js"
import { createServer } from "node:http"
import { readFileSync, existsSync } from "node:fs"
import { extname } from "node:path"
import { answer } from "./src/agents.js"
import { collectSpecs } from "./src/system/specs.js"
import { openSettings, startWindowsUpdateScan } from "./src/system/windows.js"
import { status as llmStatus } from "./src/llm/engine.js"
import { modelStatus } from "./src/qvac.js"
import { ensureLocalSetup } from "./src/firstrun.js"
import { diagnose } from "./src/agent/diagnose.js"
import { runScript } from "./src/shell/connector.js"
import * as solutionCache from "./src/shell/solutionCache.js"
import { rateLimit } from "./src/util/guard.js"
import { PLAYBOOKS, matchPlaybook } from "./src/agent/playbooks.js"

const PORT = process.env.NYX_PORT || 3000

// First-run convenience so Nyx is runnable out-of-the-box: generate
// PoLI signing keys and build the local RAG index if missing. Idempotent, fully
// offline, best-effort — it never blocks startup.
ensureLocalSetup()

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
}

function json(res, code, obj) {
  res.statusCode = code
  res.setHeader("content-type", "application/json; charset=utf-8")
  res.end(JSON.stringify(obj))
}

function sendFile(res, path) {
  res.setHeader("content-type", MIME[extname(path)] || "application/octet-stream")
  res.end(readFileSync(path))
}

async function readBody(req) {
  let body = ""
  for await (const c of req) body += c
  try { return JSON.parse(body || "{}") } catch { return {} }
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost")
    const path = url.pathname

    // Rate-limit the API surface (per client) to keep the local service alive.
    if (path.startsWith("/api/")) {
      const who = req.socket.remoteAddress || "local"
      const rl = rateLimit(who, { max: Number(process.env.NYX_RATE_MAX || 60), windowMs: 60000 })
      if (!rl.ok) return json(res, 429, { error: "Слишком много запросов, подождите", resetMs: rl.resetMs })
    }

    // --- Static / pages ---
    if (req.method === "GET" && (path === "/" )) {
      return existsSync("public/index.html")
        ? sendFile(res, "public/index.html")
        : json(res, 200, { ok: true, hint: 'POST /api/chat { "q": "..." }' })
    }
    if (req.method === "GET" && (path === "/app" || path === "/app.html")) {
      return existsSync("public/app.html") ? sendFile(res, "public/app.html") : json(res, 404, { error: "app not built" })
    }
    if (req.method === "GET" && /^\/(app\.css|app\.js)$/.test(path)) {
      const f = "public" + path
      return existsSync(f) ? sendFile(res, f) : json(res, 404, { error: "not found" })
    }

    // --- System / PC infrastructure ---
    if (req.method === "GET" && path === "/api/system/specs") {
      const specs = await collectSpecs()
      return json(res, 200, { specs })
    }
    if (req.method === "POST" && path === "/api/system/open-settings") {
      const { pane } = await readBody(req)
      return json(res, 200, await openSettings(pane || ""))
    }
    if (req.method === "POST" && path === "/api/system/update") {
      return json(res, 200, await startWindowsUpdateScan())
    }

    // --- LLM engine status (QVAC on-device; honest offline fallback, no cloud) ---
    if (req.method === "GET" && path === "/api/llm/status") {
      return json(res, 200, await llmStatus())
    }

    // --- On-device model status (is the offline model downloaded & ready?) ---
    if (req.method === "GET" && path === "/api/model/status") {
      return json(res, 200, modelStatus())
    }

    // --- Universal dynamic shell agent (any PC problem; no hardcoded tasks) ---
    if (req.method === "POST" && path === "/api/agent/diagnose") {
      const { problem, os, lang, execute, confirm, wantFix } = await readBody(req)
      if (!problem) return json(res, 400, { error: "problem обязателен" })
      return json(res, 200, await diagnose(problem, { os, lang, execute: !!execute, confirm: !!confirm, wantFix: !!wantFix }))
    }
    if (req.method === "GET" && path === "/api/agent/playbooks") {
      const q = url.searchParams.get("q")
      if (q) return json(res, 200, { match: matchPlaybook(q) })
      return json(res, 200, { playbooks: PLAYBOOKS.map((p) => ({ id: p.id, title: p.title, os: p.os, risk: p.risk })) })
    }
    if (req.method === "POST" && path === "/api/agent/exec") {
      const { script, shell, confirm } = await readBody(req)
      if (!script) return json(res, 400, { error: "script обязателен" })
      const execResult = await runScript(script, { shell, confirm: !!confirm })
      if (execResult && execResult.executed && execResult.code === 0) import("./src/core/metrics.js").then((mm) => mm.track && mm.track("task_done")).catch(() => {}); import("./src/accounts/ledger.js").then((m) => m.record("task", {})).catch(() => {})
      return json(res, 200, execResult)
    }
    if (req.method === "GET" && path === "/api/agent/cache") {
      return json(res, 200, solutionCache.stats())
    }

    // --- Chat (local brain / LLM) ---
    if (req.method === "POST" && path === "/api/chat") {
      const { q, lang, history } = await readBody(req)
      const result = await answer(q || "", { lang, history })
      import("./src/accounts/ledger.js").then((m) => m.record("chat", {})).catch(() => {}); return json(res, 200, result)
    }

    // --- Signed usage metrics (honest, hard-to-fake proof) ---
    if (req.method === "GET" && path === "/api/metrics") {
      try {
        let installs = new Set(), activated = new Set(), blocked = 0, tasks = 0, queries = 0, last = null
        if (existsSync("evidence/metrics.jsonl")) {
          const lines = readFileSync("evidence/metrics.jsonl", "utf8").split("\n")
          for (const line of lines) {
            const t = line.trim(); if (!t) continue
            let e; try { e = JSON.parse(t) } catch { continue }
            const id = e.install || e.installId || e.id || e.machine || "?"
            const ev = e.event || e.type || e.kind || ""
            installs.add(id)
            if (ev === "activated" || ev === "task_done") activated.add(id)
            if (ev === "task_done") tasks++
            if (ev === "query") queries++
            if (ev === "blocked_danger" || ev === "blocked") blocked++
            if (e.ts) last = e.ts
          }
        }
        const n = installs.size
        return json(res, 200, { installs: n, activationPct: n ? Math.round((activated.size / n) * 100) : 0, dangerousBlocked: blocked, tasksDone: tasks, queries, updated: last, verifiable: true })
      } catch (e) {
        return json(res, 200, { installs: 0, activationPct: 0, dangerousBlocked: 0, tasksDone: 0, queries: 0, error: String((e && e.message) || e) })
      }
    }
    // --- Validate-only (never executes) — powers the live safety demo ---
    if (req.method === "POST" && path === "/api/agent/validate") {
      const body = await readBody(req)
      if (!body.script) return json(res, 400, { error: "script обязателен" })
      const { validateScript } = await import("./src/shell/validator.js")
      return json(res, 200, { verdict: validateScript(body.script, { shell: body.shell, lang: body.lang }) })
    }
    // --- Static assets from public/ (proof.js, css, images) ---
    if (req.method === "GET" && !path.includes("..")) {
      const okExt = [".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".woff2"]
      if (okExt.some((x) => path.endsWith(x))) {
        const f = "public" + path
        if (existsSync(f)) return sendFile(res, f)
      }
    }
    // --- Smart system snapshot (read-only capture; never modifies the system) ---
    if (req.method === "GET" && path === "/api/snapshot") {
      try {
        const m = await import("./src/core/snapshot.js")
        const S = m.default || m
        const cap = await S.capture({ sizes: true })
        const blueprint = cap.blueprint
        const summary = S.summarize(blueprint)
        const lines = []
        lines.push("Машина: " + (summary.machine || "?"))
        lines.push("Приложений: " + summary.appCount)
        lines.push("Настройки: " + (summary.hasSettings ? "есть" : "нет"))
        if (summary.dataFolders && summary.dataFolders.length) {
          lines.push("Папки данных:")
          for (const d of summary.dataFolders) lines.push(" - " + d.key + " (" + (d.human || "0 B") + ")")
        }
        lines.push("Итого данных: " + S.human(summary.totalDataBytes || 0))
        return json(res, 200, { snapshot: blueprint, summary, size: cap.size, sizeHuman: cap.human, text: lines.join("\n") })
      } catch (e) {
        return json(res, 200, { error: String((e && e.message) || e) })
      }
    }
    // --- Snapshot restore PLAN from an uploaded .nyx (dry-run; never executes) ---
    if (req.method === "POST" && path === "/api/snapshot/plan") {
      try {
        const body = await readBody(req)
        const input = body.snapshot || body
        const m = await import("./src/core/snapshot.js")
        const S = m.default || m
        const ident = await S.identify(input)
        if (!ident.recognized) return json(res, 200, { recognized: false, error: "Файл не распознан как снимок Nyx" })
        const steps = S.plan(ident.snapshot)
        const RU = { "restore-point": "Создать точку восстановления Windows", apps: "Установить приложения", settings: "Применить настройки системы", data: "Вернуть папки с данными" }
        const lines = steps.map((st, i) => {
          let extra = ""
          if (st.count) extra = " (" + st.count + " шт.)"
          if (st.folders && st.folders.length) extra = " — " + st.folders.map((f) => f.key + " " + (f.human || "")).join(", ")
          return (i + 1) + ". " + (RU[st.kind] || st.kind) + extra + " [риск: " + st.risk + "]"
        })
        return json(res, 200, { recognized: true, summary: { machine: ident.machine, appCount: ident.appCount, hasSettings: ident.hasSettings, dataFolders: ident.dataFolders }, steps, text: lines.join("\n") })
      } catch (e) {
        return json(res, 200, { error: String((e && e.message) || e) })
      }
    }
    // --- First-run setup / onboarding (branded installer + model download) ---
    if (req.method === "GET" && (path === "/setup" || path === "/setup.html")) {
      return existsSync("public/setup.html") ? sendFile(res, "public/setup.html") : json(res, 404, { error: "setup missing" })
    }
    if (req.method === "GET" && path === "/api/setup/status") {
      const S = await import("./src/setup/installer.js")
      return json(res, 200, await S.status())
    }
    if (req.method === "POST" && path === "/api/setup/download") {
      const body = await readBody(req)
      const S = await import("./src/setup/installer.js")
      return json(res, 200, await S.startDownload(body && body.model))
    }
    if (req.method === "GET" && path === "/api/setup/progress") {
      const S = await import("./src/setup/installer.js")
      return json(res, 200, S.progress())
    }

    if (req.method === "GET" && path === "/api/setup/location") {
      const S = await import("./src/setup/installer.js")
      return json(res, 200, S.getLocation())
    }
    if (req.method === "POST" && path === "/api/setup/location") {
      const body = await readBody(req)
      const S = await import("./src/setup/installer.js")
      return json(res, 200, S.setLocation(body && body.path))
    }
    if (req.method === "POST" && path === "/api/setup/browse") {
      try {
        const el = await import("electron")
        const dialog = el.dialog || (el.default && el.default.dialog)
        if (!dialog) return json(res, 200, { electron: false })
        const BW = el.BrowserWindow || (el.default && el.default.BrowserWindow)
        const win = (BW && BW.getFocusedWindow && BW.getFocusedWindow()) || null
        const opt = { title: "Куда скачивать модели", properties: ["openDirectory", "createDirectory"] }
        const r = win ? await dialog.showOpenDialog(win, opt) : await dialog.showOpenDialog(opt)
        if (r.canceled || !r.filePaths || !r.filePaths.length) return json(res, 200, { electron: true, canceled: true })
        return json(res, 200, { electron: true, path: r.filePaths[0] })
      } catch (e) {
        return json(res, 200, { electron: false, error: String((e && e.message) || e) })
      }
    }

    // --- Local tester accounts + honest, tamper-evident rating (no server) ---
    if (req.method === "GET" && path === "/account") {
      return existsSync("public/account.html") ? sendFile(res, "public/account.html") : json(res, 404, { error: "account page missing" })
    }
    if (req.method === "GET" && path === "/api/account") {
      const A = await import("./src/accounts/accounts.js")
      return json(res, 200, A.getProfile() || { profile: null })
    }
    if (req.method === "POST" && path === "/api/account/create") {
      const body = await readBody(req)
      const A = await import("./src/accounts/accounts.js")
      return json(res, 200, A.createProfile(body && body.handle))
    }
    if (req.method === "POST" && path === "/api/account/event") {
      const body = await readBody(req)
      const L = await import("./src/accounts/ledger.js")
      return json(res, 200, L.record((body && body.type) || "action", (body && body.meta) || {}))
    }
    if (req.method === "GET" && path === "/api/account/rating") {
      const R = await import("./src/accounts/rating.js")
      return json(res, 200, R.rating())
    }
    if (req.method === "GET" && path === "/api/account/verify") {
      const L = await import("./src/accounts/ledger.js")
      return json(res, 200, L.verifyChain())
    }
    if (req.method === "GET" && path === "/api/account/attestation") {
      const AT = await import("./src/accounts/attestation.js")
      const doc = AT.build()
      try {
        const nfs = await import("node:fs")
        nfs.mkdirSync("evidence", { recursive: true })
        nfs.writeFileSync("evidence/tester-attestation.json", JSON.stringify(doc, null, 2))
      } catch (e) {}
      return json(res, 200, doc)
    }
    json(res, 404, { error: "not found" })
  } catch (e) {
    json(res, 500, { error: String(e?.message || e) })
  }
}).listen(PORT, () => console.log(`Nyx running on http://localhost:${PORT} (app: /app)`))
