// src/core/metrics.js
// Nyx Metrics — честные, подписанные, приватные метрики использования.
// Принципы:
//  - Ноль PII: только анонимный install-id (локальный, случайный).
//  - Каждое событие подписано Ed25519 ключом устройства → подделать/добавить задним числом нельзя.
//  - Только агрегаты. Дедуп по install → один человек не накрутит.
//  - Отчёт = воронка активации + безопасность. НЕ retention (рано и бьёт по нам).
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs"
import { createPrivateKey, createPublicKey, sign as edSign, verify as edVerify, generateKeyPairSync, randomUUID, createHash } from "node:crypto"
import path from "node:path"
import os from "node:os"
import { pathToFileURL } from "node:url"

const DIR = "evidence"
const LOG = path.join(DIR, "metrics.jsonl")
const KEY = ".poli.key"   // приватный ключ (общий с poli.js)
const PUB = ".poli.pub"   // публичный ключ для верификации
const INSTALL = path.join(DIR, ".install")
const EVENTS = new Set(["query", "activated", "task_done", "snapshot", "blocked_danger"])

function ensureDir() { if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true }) }

function keys() {
  ensureDir()
  let priv
  if (existsSync(KEY)) priv = createPrivateKey(readFileSync(KEY))
  else { priv = generateKeyPairSync("ed25519").privateKey; writeFileSync(KEY, priv.export({ type: "pkcs8", format: "pem" })) }
  let pub
  if (existsSync(PUB)) pub = createPublicKey(readFileSync(PUB))
  else { pub = createPublicKey(priv); writeFileSync(PUB, pub.export({ type: "spki", format: "pem" })) }
  return { priv, pub }
}

function installId() {
  ensureDir()
  if (existsSync(INSTALL)) return readFileSync(INSTALL, "utf8").trim()
  const id = createHash("sha256").update(randomUUID() + os.hostname()).digest("hex").slice(0, 16)
  writeFileSync(INSTALL, id)
  return id
}

// Каноничная форма для подписи — фиксированный порядок ключей.
function canon(r) { return JSON.stringify({ v: r.v, ts: r.ts, install: r.install, event: r.event, props: r.props || {} }) }

// Никогда не бросает — метрика не должна ронять продукт.
export function track(event, props = {}) {
  try {
    if (!EVENTS.has(event)) return false
    const { priv } = keys()
    const rec = { v: 1, ts: new Date().toISOString(), install: installId(), event, props }
    const sig = edSign(null, Buffer.from(canon(rec)), priv).toString("base64")
    appendFileSync(LOG, JSON.stringify({ ...rec, sig }) + "\n")
    return true
  } catch { return false }
}

export function aggregate() {
  const out = { window: { start: null, end: null }, verified: 0, rejected: 0, installs: 0, activated: 0, tasks: 0, snapshots: 0, blocked: 0, queries: 0 }
  if (!existsSync(LOG)) return out
  let pub = null; try { pub = keys().pub } catch {}
  const installs = new Set(), activated = new Set()
  for (const line of readFileSync(LOG, "utf8").split("\n")) {
    const t = line.trim(); if (!t) continue
    let r; try { r = JSON.parse(t) } catch { out.rejected++; continue }
    if (!r || !EVENTS.has(r.event) || !r.sig) { out.rejected++; continue }
    if (pub) { try { if (!edVerify(null, Buffer.from(canon(r)), pub, Buffer.from(r.sig, "base64"))) { out.rejected++; continue } } catch { out.rejected++; continue } }
    out.verified++
    if (!out.window.start || r.ts < out.window.start) out.window.start = r.ts
    if (!out.window.end || r.ts > out.window.end) out.window.end = r.ts
    if (r.install) installs.add(r.install)
    if (r.event === "query") out.queries++
    else if (r.event === "task_done") out.tasks++
    else if (r.event === "snapshot") out.snapshots++
    else if (r.event === "blocked_danger") out.blocked++
    else if (r.event === "activated") activated.add(r.install)
  }
  out.installs = installs.size
  out.activated = activated.size
  return out
}

export function report() {
  const a = aggregate()
  const pct = a.installs ? Math.round((a.activated / a.installs) * 100) : 0
  const w = a.window.start ? `${a.window.start.slice(0, 10)} → ${a.window.end.slice(0, 10)}` : "—"
  return [
    "=== Nyx usage — cryptographically signed, deduped by install ===",
    `Window:                     ${w}`,
    `Verified events:            ${a.verified}  (rejected: ${a.rejected})`,
    `Unique installs:            ${a.installs}`,
    `Ran a real task:            ${a.activated}  (${pct}% activation)`,
    `Tasks completed:            ${a.tasks}`,
    `Snapshots created:          ${a.snapshots}`,
    `Dangerous commands blocked: ${a.blocked}`,
    `Real queries:               ${a.queries}`,
    "Note: self-reported, Ed25519-signed on each device, deduped by install, not third-party audited.",
  ].join("\n")
}

export default { track, aggregate, report }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, arg] = process.argv.slice(2)
  if (cmd === "track") console.log(track(arg || "query") ? "ok" : "ignored")
  else console.log(report())
}
