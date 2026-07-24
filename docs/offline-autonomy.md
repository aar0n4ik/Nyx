# Nyx — Offline Autonomy Architecture (QVAC Edge AI)

## 1. Verdict: is "no internet" a problem?

No — it is our advantage. The project is "Unleash Edge AI". Judges expect the
brain (LLM), the data, and the execution to live **on the device**. We close the
question technically:

- **Local model**: inference runs entirely through the **QVAC SDK** (`@qvac/sdk`,
  llama.cpp completion backend) on a local GGUF model. No cloud call to think.
- **Local data**: RAG index + solution cache are plain files on disk.
- **NetGuard default-deny**: all egress is blocked except an explicit allowlist.
- **Airplane-mode demo**: turn off Wi-Fi on stage — the app keeps answering,
  diagnosing the PC, and assisting trades (orders stay simulated).

## 2. How the model runs offline + how Node.js talks to it

The model weights are a local GGUF file. The **QVAC SDK** loads them into
RAM/VRAM and produces tokens on CPU/GPU with zero network. Node.js talks to the
engine **in-process** — there is no local HTTP server and no external daemon:

- `loadModel({ modelSrc, modelType: "llamacpp-completion" })` — load the LLM.
- `completion({ modelId, history, stream: true })` — streamed token events
  (`contentDelta`) plus `completionStats` (TTFT, tokens/s) for the auditable log.
- `embed({ modelId, text })` — on-device retrieval embeddings for RAG.
- `unloadModel({ modelId })` — release the model.

All of this is wrapped in `src/qvac.js`. There is **no Ollama, no Groq, no cloud
provider** in this build — the only inference path is the QVAC SDK.

## 3. Model selection + graceful fallback

- **Primary**: `Qwen3-4B-Instruct` (Q4_K_M, ~2.5 GB) via the QVAC SDK.
- **Fallback model**: `Llama 3.2 3B Instruct` (Q4_K_M) — used automatically if the
  primary weights are not present. Both are configurable via
  `NYX_QVAC_MODEL` / `NYX_QVAC_MODEL_PATH`.

Provider selection in `src/llm/engine.js` is intentionally simple and honest:

1. **QVAC SDK** model loaded → the canonical, verifiable, no-cloud path.
2. Else **deterministic offline brain** (`knowledgeAnswer`) — a grounded, rule-based
   responder so the service never hangs and **never poses as the model**. It is
   clearly reported as the fallback in status and never logged as QVAC inference.

There is no tier that leaves the device. Offline mode needs no allowlist at all.

### Setup (offline)

```
# one-time, with network:
npm run model       # fetches the GGUF weights into ~/.qvac/models
# then run fully offline:
NYX_OFFLINE=1 npm start
```

## 4. Dynamic shell (no if/else hardcoding)

The model generates a diagnostic/fix script (PowerShell on Windows, bash on Unix)
for *any* unpredictable problem (BSOD, lag, wrong system time, UI language, a game
crash log). The backend:

1. **Validates** the script (static safety analysis, deny destructive ops).
2. **Executes** it itself in a sandboxed child process with timeout + output caps.
   Autonomous execution is **ON by default** (`NYX_ALLOW_EXEC=1`); set
   `NYX_ALLOW_EXEC=0` to force dry-run. On Windows, elevated actions trigger a
   single native UAC prompt — the only thing the user clicks.
3. **Feeds OS output back** into the model so it interprets results and continues.
4. **Caches** successful `[problem -> script]` patterns for instant reuse.

The user never has to copy a command or open a terminal: Nyx writes the command,
shows it, asks for one confirmation, then runs it.

## 5. Commercial-grade engineering

- **Code validator / sandbox** (`src/shell/validator.js`): blocks `rm -rf /`,
  `mkfs`, `format`, registry wipes, fork-bombs, `curl|bash`, shutdown, etc.
- **Solution cache**: token-similarity file cache; instant recall, no model spend
  on repeats.
- **Execution gate**: autonomous exec on by default behind explicit confirmation;
  `NYX_ALLOW_EXEC=0` forces dry-run (Zero-Trust).
- **Rate limiting**: per-client token bucket to keep the service alive under load.
- **Timeouts & output caps**: every spawned process is killed after `timeoutMs`;
  stdout/stderr truncated to protect memory.
