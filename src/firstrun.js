// One-time, idempotent local setup so `npm install && npm start` just works for
// judges — no separate bootstrap step required. Everything here is offline and
// best-effort: any failure is logged and skipped, never fatal.
import { generateKeyPairSync } from "node:crypto"
import { writeFileSync, existsSync, mkdirSync, chmodSync } from "node:fs"
import { buildIndex } from "./rag.js"
import { join } from "node:path"
import { EVIDENCE_DIR, DATA_SUBDIR, POLI_KEY, ensureDataDirs } from "./paths.js"

export function ensureLocalSetup() {
  ensureDataDirs()
	// 1) PoLI signing keypair — enables the signed Proof-of-Local-Inference log.
	try {
		if (!existsSync(join(EVIDENCE_DIR, "poli.pub")) || !existsSync(POLI_KEY)) {
			mkdirSync(EVIDENCE_DIR, { recursive: true })
			const { publicKey, privateKey } = generateKeyPairSync("ed25519")
			writeFileSync(join(EVIDENCE_DIR, "poli.pub"), publicKey.export({ type: "spki", format: "pem" }))
			writeFileSync(POLI_KEY, privateKey.export({ type: "pkcs8", format: "pem" }))
			try { chmodSync(POLI_KEY, 0o600) } catch {}
			console.log("[firstrun] generated PoLI signing keypair")
		}
	} catch (e) {
		console.log("[firstrun] key generation skipped:", e?.message || e)
	}

	// 2) Local RAG index — empty notes are fine; this just avoids a missing file.
	try {
		if (!existsSync(join(DATA_SUBDIR, "index.json"))) {
			buildIndex()
			console.log("[firstrun] built local RAG index")
		}
	} catch (e) {
		console.log("[firstrun] RAG index skipped:", e?.message || e)
	}
}
