// One-command evidence bundle for reviewers. Offline-safe.
// Generates the real hardware proof, flushes the NetGuard egress report, writes
// the model attestation (if a model was set up), and verifies the PoLI chain.
// Run:  npm run evidence
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { execFileSync } from "node:child_process"

mkdirSync("evidence", { recursive: true })

// 1) Hardware proof (real, from this machine).
try {
	const { collectSpecs } = await import("../src/system/specs.js")
	const specs = await collectSpecs()
	writeFileSync("evidence/hardware.json", JSON.stringify({ generatedAt: new Date().toISOString(), node: process.version, specs }, null, 2))
	console.log("\u2713 evidence/hardware.json")
} catch (e) { console.log("\u2022 hardware proof skipped:", e.message) }

// 2) NetGuard egress report (zero non-loopback by default).
try {
	const ng = await import("../src/netguard.js")
	ng.flush()
	console.log("\u2713 evidence/netguard.json")
} catch (e) { console.log("\u2022 netguard report skipped:", e.message) }

// 3) Model attestation (meaningful once a model was downloaded -> models.lock).
try {
	const { attest } = await import("../src/attestation.js")
	const a = attest()
	console.log(`\u2713 evidence/attestation.json (${a.length} model${a.length === 1 ? "" : "s"})`)
} catch (e) { console.log("\u2022 attestation skipped:", e.message) }

// 4) Verify the PoLI chain if a log exists.
if (existsSync("evidence/poli.jsonl")) {
	try { execFileSync(process.execPath, ["verify.js"], { stdio: "inherit" }) }
	catch { console.log("\u2022 PoLI verify reported an issue (see above)") }
} else {
	console.log('\u2022 No PoLI log yet — run an inference (node cli.js "...") to populate it.')
}
console.log("Evidence bundle refreshed in /evidence.")
