import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { sign, verify, keys } from "./accounts.js"
import { DATA_SUBDIR } from "../paths.js"

const DIR = process.env.NYX_ACCOUNT_DIR || path.join(DATA_SUBDIR, "account")
const LEDGER = path.join(DIR, "ledger.jsonl")
const GENESIS = "nyx-genesis"
const MIN_GAP_MS = 400

function ensureDir() { fs.mkdirSync(DIR, { recursive: true }) }
function readLines() {
  if (!fs.existsSync(LEDGER)) return []
  return fs.readFileSync(LEDGER, "utf8").split("\n").filter(Boolean).map(function (l) {
    try { return JSON.parse(l) } catch (e) { return null }
  }).filter(Boolean)
}
function hashEntry(e) {
  return crypto.createHash("sha256").update([e.seq, e.ts, e.type, JSON.stringify(e.meta || {}), e.prev].join("|")).digest("hex")
}
export function record(type, meta) {
  ensureDir(); keys()
  const lines = readLines()
  const last = lines[lines.length - 1]
  const now = Date.now()
  if (last && now - Date.parse(last.ts) < MIN_GAP_MS) return { skipped: true, reason: "rate" }
  const entry = { seq: lines.length, ts: new Date(now).toISOString(), type: String(type).slice(0, 40), meta: meta || {}, prev: last ? last.hash : GENESIS }
  entry.hash = hashEntry(entry)
  entry.sig = sign(entry.hash)
  fs.appendFileSync(LEDGER, JSON.stringify(entry) + "\n")
  return { ok: true, seq: entry.seq, hash: entry.hash }
}
export function all() { return readLines() }
export function verifyChain() {
  const lines = readLines()
  const pubPem = keys().pubPem
  let prev = GENESIS, lastTs = 0
  const issues = []
  for (const e of lines) {
    if (e.prev !== prev) issues.push({ seq: e.seq, error: "broken-link" })
    if (hashEntry(e) !== e.hash) issues.push({ seq: e.seq, error: "hash-mismatch" })
    if (!verify(e.hash, e.sig, pubPem)) issues.push({ seq: e.seq, error: "bad-signature" })
    const t = Date.parse(e.ts)
    if (t < lastTs) issues.push({ seq: e.seq, error: "time-regression" })
    if (t > Date.now() + 60000) issues.push({ seq: e.seq, error: "future-timestamp" })
    lastTs = t; prev = e.hash
  }
  return { valid: issues.length === 0, count: lines.length, head: lines.length ? lines[lines.length - 1].hash : GENESIS, issues }
}
