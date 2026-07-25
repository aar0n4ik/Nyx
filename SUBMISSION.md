# Submission — QVAC: Unleash Edge AI I

**Project:** Nyx — On-Device AI Operator
**Track:** General Purpose
**Author:** aar0n4ik (solo)
**License:** Apache-2.0

---

## Mandatory requirements

| Requirement | Status | Where |
|---|---|---|
| QVAC SDK used for **all AI inference** | done | `src/qvac.js` (`chat`), `src/llm/engine.js` — QVAC is the only inference path; there is no cloud tier (`CLOUD_ENABLED() === false`) |
| QVAC SDK used for **RAG** | done | `src/qvac.js` (`embed`), `src/rag.js`; honest `local-hash` fallback only if no embedding model is present |
| Follow **one** track | done | General Purpose (declared in README + here) |
| Hardware constraints honored | done | Qwen3-4B Q4_K_M runs on consumer hardware; real specs via `npm run hwproof` |
| Full reproducibility | done | `npm install` -> `npm run model` -> `npm run setup` -> `npm start`; `.env.example` documents every switch |
| Hardware setup documented | done | README "Quick start" + auto `npm run hwproof` |
| Complete artifacts (logs, proof) | done | `npm run evidence` regenerates the full bundle |
| GitHub repository | done | https://github.com/aar0n4ik |
| Demo video | ACTION NEEDED | add the link in README + below before the deadline |

## Core judging criteria -> evidence

| Criterion | How Nyx addresses it |
|---|---|
| **Innovation** | Local model that not only chats but **authors and safely executes** real OS commands; a tamper-evident, signed Proof-of-Local-Inference chain |
| **Artifact quality** | Reproducible build, generated hardware/egress/attestation artifacts, signed inference chain |
| **Performance** | Tier-1 fast paths avoid the LLM entirely; honest TTFT + tokens/sec telemetry per response; runs on constrained devices |
| **Complexity & UX** | Clean multilingual chat UI, model status bar, one-click device scan, double-confirmation trading |
| **Model usage** | Qwen3-4B for reasoning + command authoring; QVAC embeddings for retrieval |
| **Safety / trust** | Static destructive/obfuscation validator (fast gate, not a sandbox), NetGuard egress blocking (on by default), single-UAC confirmation, execution off by default, nothing runs without user OK |

## Artifacts checklist

- [ ] `npm run hwproof` -> `evidence/hardware.json`
- [ ] `npm run evidence` -> `evidence/netguard.json`, `evidence/attestation.json`
- [ ] `npm run verify` -> "PoLI chain PASS"
- [ ] Demo video recorded and linked
- [ ] Repo pushed to GitHub (public)

## Honest notes for reviewers

- **No cloud inference path exists at all.** 100% of AI runs on-device through
  the QVAC SDK; `src/llm/engine.js` has no cloud provider and returns
  market API (plus the one-time model-weights download); every endpoint is
  declared in `remote-apis.json`, and NetGuard records all egress.
- **NetGuard scope (honest):** it hooks `net.Socket.prototype.connect`, so it
  covers Node's TCP/TLS/HTTP(S)/fetch traffic and blocks non-allowlisted egress
  by default (`NYX_STRICT=0` for log-only). It does not intercept UDP, OS-level
  DNS, child processes, or native addons — a strong in-process guard plus an
  audit log, not a kernel firewall.
- **PoLI scope (honest):** a tamper-evident, Ed25519-signed hash chain that
  proves the recorded inferences were not altered or reordered (integrity +
  ordering). Because the signing key is generated and held locally, it is not,
  by itself, a cryptographic proof that inference physically ran on this machine
  (that would require hardware/TEE attestation). The on-device guarantee comes
  from no-cloud-code-path + NetGuard's egress log, tied to the signed record.
- **Execution is off by default** (`NYX_ALLOW_EXEC=0`): Nyx proposes the exact
  command but runs nothing until you opt in *and* confirm; obfuscated/encoded
  commands can never auto-run.
- If the installed QVAC SDK exposes no embedding model on a given machine, RAG
  uses a deterministic local-hash embedding and labels itself `local-hash` in
  the index — it never falsely claims QVAC embeddings.
- Private keys (`.poli.key`), built indexes, `models.lock` and the real hardware
  report are intentionally **not** committed. On first run Nyx generates a fresh
  signing keypair and `evidence/poli.pub`, then hash-chains every inference so
  `npm run verify` passes on the judge's own machine.
