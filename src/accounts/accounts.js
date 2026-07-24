import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"

const DIR = process.env.NYX_ACCOUNT_DIR || path.join(process.cwd(), "data", "account")
const KEY = path.join(DIR, "key.pem")
const PUB = path.join(DIR, "pub.pem")
const PROFILE = path.join(DIR, "profile.json")

function ensureDir() { fs.mkdirSync(DIR, { recursive: true }) }

export function keys() {
  ensureDir()
  if (!fs.existsSync(KEY) || !fs.existsSync(PUB)) {
    const pair = crypto.generateKeyPairSync("ed25519")
    fs.writeFileSync(KEY, pair.privateKey.export({ type: "pkcs8", format: "pem" }))
    fs.writeFileSync(PUB, pair.publicKey.export({ type: "spki", format: "pem" }))
    try { fs.chmodSync(KEY, 0o600) } catch (e) {}
  }
  return { priv: crypto.createPrivateKey(fs.readFileSync(KEY)), pubPem: fs.readFileSync(PUB, "utf8") }
}
export function sign(dataStr) {
  return crypto.sign(null, Buffer.from(dataStr), keys().priv).toString("base64")
}
export function verify(dataStr, sigB64, pubPem) {
  try { return crypto.verify(null, Buffer.from(dataStr), crypto.createPublicKey(pubPem), Buffer.from(sigB64, "base64")) }
  catch (e) { return false }
}
export function accountId() {
  return crypto.createHash("sha256").update(keys().pubPem).digest("hex").slice(0, 16)
}
export function deviceFingerprint() {
  const raw = [os.hostname(), os.platform(), os.arch(), String(os.cpus().length), String(Math.round(os.totalmem() / 1e9))].join("|")
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 24)
}
export function getProfile() {
  ensureDir()
  if (!fs.existsSync(PROFILE)) return null
  try { return JSON.parse(fs.readFileSync(PROFILE, "utf8")) } catch (e) { return null }
}
export function createProfile(handle) {
  ensureDir(); keys()
  const existing = getProfile()
  if (existing) return existing
  const prof = {
    accountId: accountId(),
    handle: String(handle || "tester").slice(0, 40),
    device: deviceFingerprint(),
    createdAt: new Date().toISOString(),
    pubKey: keys().pubPem,
  }
  fs.writeFileSync(PROFILE, JSON.stringify(prof, null, 2))
  return prof
}
