# Submission — QVAC: Unleash Edge AI I

**Project:** Nyx — On-Device AI Operator
**Track:** General Purpose
**Author:** aar0n4ik (solo)
**License:** Apache-2.0

---

## Mandatory requirements

| Requirement | Status | Where |
|---|---|---|
| QVAC SDK used for **all AI inference** | ✅ | `src/qvac.js` (`chat`), `src/llm/engine.js` — QVAC is the only inference path; there is no cloud tier |
| QVAC SDK used for **RAG** | ✅ | `src/qvac.js` (`embed`), `src/rag.js` (semantic vector retrieval); honest `local-hash` fallback only if no embedding model is present |
| Follow **one** track | ✅ | General Purpose (declared in README + here) |
| Hardware constraints honored | ✅ | Qwen3-4B Q4_K_M runs on consumer hardware; real specs generated locally via `npm run hwproof` (repo ships a sanitized sample in `evidence/hardware.json`) |
| Full reproducibility | ✅ | `npm install` → `npm run model` → `npm run setup` → `npm start`; `.env.example` documents every switch |
| Hardware setup documented | ✅ | README "Quick start" + auto `npm run hwproof` |
| Complete artifacts (logs, proof) | ✅ | `npm run evidence` regenerates the full bundle |
| GitHub repository | ✅ | https://github.com/aar0n4ik |
| Demo video | ⚠️ **action needed** | add the link in README + below before the deadline |

## Core judging criteria → evidence

| Criterion | How Nyx addresses it |
|---|---|
| **Innovation** | Local model that not only chats but **authors and safely executes** real OS commands; verifiable Proof-of-Local-Inference |
| **Capabilities** (orchestration + tool calling) | Hybrid router: instant fast-path, action pipeline (plan→validate→exec→self-correct), Bitfinex broker, RAG — all driven by the local model |
| **Artifact quality** | Reproducible build, generated hardware/egress/attestation artifacts, signed inference chain |
| **Performance** | Tier-1 fast paths avoid the LLM entirely; honest TTFT + tokens/sec telemetry per response; runs on constrained devices |
| **Complexity & UX** | Clean multilingual chat UI, model status bar, one-click device scan, double-confirmation trading |
| **Model usage** | Qwen3-4B for reasoning + command authoring; QVAC embeddings for retrieval |
| **Safety / trust** | Static destructive-command validator, NetGuard egress firewall, single-UAC confirmation, nothing runs without user OK |

## Artifacts checklist

- [ ] `npm run hwproof` → `evidence/hardware.json`
- [ ] `npm run evidence` → `evidence/netguard.json`, `evidence/attestation.json`
- [ ] `npm run verify` → "PoLI chain PASS"
- [ ] Demo video recorded and linked
- [ ] Repo pushed to GitHub (public)

## Honest notes for reviewers

- There is **no cloud inference path at all** — 100% of AI runs on-device through
  the QVAC SDK. The only network skill is the **public** Bitfinex market API
  (plus the one-time model-weights download), every endpoint is declared in
  `remote-apis.json`, and NetGuard records all egress.
- If the installed QVAC SDK exposes no embedding model on a given machine, RAG
  uses a deterministic local-hash embedding and labels itself `local-hash` in
  the index — it never falsely claims QVAC embeddings.
- Private keys (`.poli.key`), built indexes, `models.lock` and the real hardware
  report are intentionally **not** committed (the shipped `evidence/hardware.json`
  is a sanitized sample). On first run Nyx generates a fresh signing keypair and
  `evidence/poli.pub`, then hash-chains every inference so `npm run verify`
  passes on the judge's own machine.
