// Central data-location resolver (#13). All user data (evidence, data, Models)
// lives under ONE writable base chosen at install time — never hardcoded to C:.
// Packaged: electron/main.cjs sets NYX_DATA_DIR to the install dir (exe folder).
// Dev: falls back to the repo cwd so `npm start` keeps writing in place.
import { homedir } from "node:os"
import path from "node:path"
import { existsSync, readFileSync, mkdirSync } from "node:fs"

function resolveBase() {
  const env = process.env.NYX_DATA_DIR
  if (env && String(env).trim()) return String(env).trim()
  try {
    const loc = path.join(homedir(), ".qvac", "nyx-location.json")
    if (existsSync(loc)) {
      const j = JSON.parse(readFileSync(loc, "utf8"))
      if (j && j.dataDir && String(j.dataDir).trim()) return String(j.dataDir).trim()
    }
  } catch (e) {}
  return process.cwd()
}

export const DATA_DIR = resolveBase()
export const EVIDENCE_DIR = path.join(DATA_DIR, "evidence")
export const DATA_SUBDIR = path.join(DATA_DIR, "data")
export const MODELS_DIR = path.join(DATA_DIR, "Models")
export const POLI_KEY = path.join(DATA_DIR, ".poli.key")
export const POLI_PUB = path.join(DATA_DIR, ".poli.pub")

export function ensureDataDirs() {
  for (const d of [EVIDENCE_DIR, DATA_SUBDIR, MODELS_DIR]) {
    try { mkdirSync(d, { recursive: true }) } catch (e) {}
  }
  return DATA_DIR
}
