# Nyx — On-Device AI Operator

> A fully local, autonomous AI operator for Windows that **fixes your PC** and
> **trades on Bitfinex** — powered end-to-end by the **QVAC SDK**, running
> **Qwen3-4B on-device** with **zero cloud calls**.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
![Edge AI](https://img.shields.io/badge/AI-100%25%20on--device-success)
![QVAC](https://img.shields.io/badge/QVAC-inference%20%2B%20RAG-purple)

**Track:** General Purpose · **Submission:** QVAC — Unleash Edge AI I

---

## Why Nyx

Everyone ships a cloud chatbot. Nyx is the opposite: a private operator that
lives **on your machine**, sees your **real hardware**, and can **act** — with a
hard safety boundary and your explicit confirmation before anything runs. No
telemetry, no API keys leaving the device, no data exhaust. The same Qwen3-4B
model that answers your questions also writes the exact shell command to fix a
problem, then hands it to a validator and to **you** for approval.

- **100% on-device inference** via the QVAC SDK (Qwen3-4B, llama.cpp backend).
- **On-device RAG** — retrieval embeddings also run through the QVAC SDK.
- **Real autonomy, real safety** — the model authors commands; a static
  validator blocks destructive operations; you confirm via a single UAC prompt.
- **NetGuard** — a runtime egress firewall proves Nyx makes **zero** unapproved
  (non-allowlisted) network calls. The only allowed egress is loopback and, when
  you opt into trading, the Bitfinex endpoint — and every socket is logged.
- **PoLI** — every inference is hash-chained and signed (Proof-of-Local-Inference)
  so the "it ran locally" claim is **verifiable**, not marketing.

## What it does

| Capability | How |
|---|---|
| Diagnose & fix PC issues | Model authors a script, grounded by expert playbooks, validated, then executed with your OK and self-corrected on failure |
| Live device telemetry | Real CPU/RAM/GPU/disk/uptime via OS calls (no fabrication) |
| Zero-Trust Bitfinex trading | Double-confirmation broker over the public Bitfinex API |
| Multilingual | Detects and replies in the user's language (RU/UK/EN/ES/DE/FR), UI language syncs across pages |
| Offline-first | Works with no internet; **there is no cloud-AI path at all** — 100% of inference is on-device via the QVAC SDK |

## Architecture (high level)

```
 Browser UI (public/)  ─►  server.js  ─►  src/agents.js (hybrid router)
                                          ├─ Tier 1  instant fast-path (specs/uptime/ping, no LLM)
                                          ├─ Tier 1b action pipeline  ─► diagnose ─► validator ─► exec (your OK)
                                          └─ Tier 2  QVAC LLM + RAG (unconstrained reasoning)
   QVAC SDK  ◄─ src/qvac.js (chat + embeddings)      RAG ◄─ src/rag.js (on-device vectors)
   Safety    ◄─ src/shell/validator.js, src/netguard.js, src/poli.js, src/attestation.js
```

Detailed notes live in `docs/architecture.md`, `docs/offline-autonomy.md`,
`docs/zero-trust-broker.md`.

## Quick start

Requirements: **Node ≥ 22.17** (a QVAC SDK requirement) and **npm ≥ 10.9**,
Windows 10/11 (the action pipeline targets PowerShell). macOS/Linux run in
chat + RAG mode.

```bash
# 1) install dependencies (this also installs the QVAC SDK)
npm install

# 2) download the on-device model (Qwen3-4B) and build the RAG index
npm run model      # installs @qvac/sdk + fetches the model into ~/.qvac/models
npm run setup      # builds the local vector index from data/notes

# 3) start — autonomous execution is ON by default (one confirm + Windows UAC).
#    Set NYX_ALLOW_EXEC=0 if you ever want pure dry-run.
npm start          # -> open http://localhost:3000/app
```

Nyx runs fully offline. If the QVAC model isn't present yet, the app stays up
and the model bar shows how to install it; chat falls back to the offline brain.

## Reproducibility & artifacts

Everything a judge needs is generated **from your own machine** — nothing is
pre-baked or fabricated:

```bash
npm run hwproof    # -> evidence/hardware.json  (REAL specs from THIS device)
npm run evidence   # -> hardware.json + netguard.json + attestation.json + PoLI verify
npm run verify     # -> verifies the Proof-of-Local-Inference chain
```

| Artifact | File | Proves |
|---|---|---|
| Hardware proof | `evidence/hardware.json` | the device it ran on (repo ships a sanitized sample; `npm run hwproof` writes your real one locally) |
| Egress report | `evidence/netguard.json` | zero unapproved egress (allowlist: loopback + Bitfinex) |
| Model attestation | `evidence/attestation.json` | which local model + SHA-256 |
| Inference log | `evidence/poli.jsonl` + `npm run verify` | every inference ran on-device |

> The repo ships `evidence/poli.pub` (the public key) so anyone can verify the
> chain. Private keys, built indexes, machine-specific lock files and the real
> hardware report are git-ignored and never committed — the committed
> `evidence/hardware.json` is a sanitized sample, regenerated per machine.

> **Remote APIs (full disclosure):** every outbound endpoint Nyx can ever touch is
> declared in [`remote-apis.json`](remote-apis.json) — Bitfinex public/auth
> endpoints and the one-time QVAC model-weights download. There are no
> undisclosed calls and **no remote AI inference**.

See `SUBMISSION.md` for a requirement-by-requirement mapping to evidence.

## Model usage

- **Inference:** Qwen3-4B-Instruct (Q4_K_M) via the QVAC SDK, llama.cpp
  completion backend. Falls back automatically to **Llama 3.2 3B Instruct** if the
  Qwen weights aren't present. Configurable with `NYX_QVAC_MODEL` /
  `NYX_QVAC_MODEL_TYPE`.
- **RAG embeddings:** QVAC SDK embedding model when available; deterministic
  local-hash fallback otherwise (the active path is reported honestly in the
  index and never claimed as QVAC when it isn't).

## Demo video

🎥 **Demo:** [_<add your unlisted YouTube link here before submitting>_](https://youtu.be/FG19aIasp4E?si=KK5oqtJb0WalE-Jh)

## Configuration

Copy `.env.example` to `.env`. Key switches: `NYX_OFFLINE` (default on),
`NYX_ALLOW_EXEC` (autonomous execution — **on by default**; set `0` for pure
dry-run), `NYX_QVAC_MODEL`, `NYX_QVAC_EMBED_MODEL`, `NYX_PORT`,
`NYX_ALLOW_HOSTS`, `NYX_LIVE_TRADING` (off by default). There is **no cloud-AI
switch** — inference is QVAC-only by design.

## Built by

Solo build by **aar0n4ik**.

- GitHub: https://github.com/aar0n4ik
- X: https://x.com/_AARON4IK_
- Instagram: https://www.instagram.com/bohdan.aaron4ik/

This is a project I care about deeply — built to show that real, useful,
*trustworthy* AI can run entirely on the edge. Feedback welcome.

## License

Apache-2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
