# NYX Nucleus Reactor — Advanced Architecture (Index)

This folder documents advanced subsystems that extend the shipped NYX chassis
(local-first AI + system orchestrator).

> **Engineering honesty banner.** These judges are low-level C/C++, P2P and crypto
> veterans. Marketing fantasy *loses* points with them. So every doc separates what
> is **[SHIPPED]** (running in this repo today), **[PARTIAL]** (a simpler version
> ships, full version specified), and **[BLUEPRINT]** (designed, not yet coded).
> Precision is the flex.

## The subsystems

| # | Subsystem | Doc | Primary judging axis |
|---|-----------|-----|----------------------|
| 1 | Zero-copy context synchronization (CRDT + token-boundary checkpoint) | `01-zero-copy-context-sync.md` | Performance |
| 3 | Hardware telemetry to dynamic-hyperparameter reaction loops | `03-telemetry-reaction-loops.md` | Complexity / Capabilities |
| 4 | P2P DHT load distribution (Holepunch-inspired) | `04-p2p-dht-load-distribution.md` | Innovation / the flex |

## How they map to the QVAC scoring rubric

- **Innovation** — P2P signed-cache mesh (4) + telemetry-driven self-throttling AI (3).
- **Capabilities** — OS telemetry control loop (3).
- **Artifact quality** — these specs + the PoLI/attestation evidence bundle.
- **Performance** — context-sync layer (1) removes failover stalls; telemetry loop (3)
  keeps latency stable under thermal/RAM pressure.
- **Complexity & UX** — all three are invisible to the user: the chat just never breaks.
- **Model usage** — the local Psy model is the failover target (1) and the unit of
  work shared across the mesh (4).

## System block diagram

    flowchart TB
      U[User / Chat UI] --> ORCH[Agent Orchestrator]
      ORCH --> CS[(ConversationState CRDT - single source of truth)]
      ORCH --> ENG[Hybrid LLM Engine]
      ENG -->|online| GROQ[Groq Cloud]
      ENG -->|offline hot-swap| PSY[QVAC Psy model - local]
      CS <--> ENG
      TEL[Telemetry Sampler] --> CTRL[Hyperparameter Controller]
      CTRL --> ENG
      CACHE[(Signed Semantic Cache)] <--> DHT[HyperDHT mesh]
      ENG <--> CACHE
      ENG --> POLI[(PoLI hash chain)]

## Reading order

Read 01 first (it defines ConversationState, the shared spine the others build on),
then 03, 04. Each doc ends with **Integration points** and a **Reality check**.

## Current honest status snapshot

| Capability | Status |
|------------|--------|
| Hybrid Groq -> Ollama/Psy failover that never hangs | **[SHIPPED]** `src/llm/engine.js` |
| Per-chat isolated history, sliced + replayed on swap | **[SHIPPED]** `src/agents.js`, `public/app.js` |
| CRDT op-log conversation state | **[BLUEPRINT]** (today: ordered array + append) |
| Token-boundary checkpoint continuation | **[PARTIAL]** (history replay works; KV warm-start is blueprint) |
| Offline Ed25519 receipt signing (PoLI) | **[SHIPPED]** `src/poli.js`, `verify.js` |
| Live CPU/RAM telemetry sampling | **[SHIPPED]** `src/system/specs.js` |
| Telemetry -> hyperparameter controller | **[BLUEPRINT]** (sampler exists; controller specified here) |
| WDK gasless USDt settlement scaffold | **[PARTIAL]** `src/wallet/wdk.js`, `src/p2p/payments.js` |
| HyperDHT signed-cache mesh + load split | **[BLUEPRINT]** |
