import crypto from "node:crypto"
import { keys, getProfile, deviceFingerprint, sign } from "./accounts.js"
import { verifyChain } from "./ledger.js"
import { rating } from "./rating.js"

export function build() {
  const prof = getProfile()
  const chain = verifyChain()
  const r = rating()
  const body = {
    kind: "nyx-tester-attestation", v: 1,
    accountId: prof ? prof.accountId : null,
    handle: prof ? prof.handle : null,
    device: deviceFingerprint(),
    createdAt: prof ? prof.createdAt : null,
    issuedAt: new Date().toISOString(),
    chain: { valid: chain.valid, count: chain.count, head: chain.head },
    rating: { score: r.score, level: r.level, honest: r.honest },
    stats: r.stats,
    disclosure: "Local device attestation. Tamper-evident hash chain signed by the device key. Proves on-device usage and integrity, not identity. No server involved.",
  }
  const digest = crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex")
  return { body, signature: sign(digest), pubKey: keys().pubPem }
}
