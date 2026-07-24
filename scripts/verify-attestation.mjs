import crypto from "node:crypto"
import fs from "node:fs"

const file = process.argv[2]
if (!file) { console.error("usage: node scripts/verify-attestation.mjs <attestation.json>"); process.exit(1) }
const att = JSON.parse(fs.readFileSync(file, "utf8"))
const digest = crypto.createHash("sha256").update(JSON.stringify(att.body)).digest("hex")
const pub = crypto.createPublicKey(att.pubKey)
const ok = crypto.verify(null, Buffer.from(digest), pub, Buffer.from(att.signature, "base64"))
console.log("signature:", ok ? "VALID" : "INVALID")
console.log("chain:", att.body.chain.valid ? "intact" : "BROKEN")
console.log("account:", att.body.accountId, "| level:", att.body.rating.level, "| score:", att.body.rating.score)
console.log("events:", att.body.chain.count, "| active days:", att.body.stats.activeDays, "| streak:", att.body.stats.streak)
process.exit(ok && att.body.chain.valid ? 0 : 2)
