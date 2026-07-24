# Nyx Zero-Trust AI Broker — architecture & security

## 1. Verdict: why this wins QVAC Project I

The QVAC track is "Unleash Edge AI" — judges reward **useful, private, on-device** AI, not cloud wrappers. Nyx's Zero-Trust AI Broker hits every nerve:

1. **Real money, real stakes, zero cloud.** Inference runs 100% on-device (QVAC). The only network call is an explicit, user-approved, allowlisted request to Bitfinex (Tether's iFinex sister company). Everything else is provably local (PoLI hash-chain + NetGuard egress log).
2. **Tether-native by design.** Bitfinex for live market data + execution, USD₮ as the settlement currency, and on-device USD₮ fee accounting (full WDK micro-settlement is scaffolded and on the roadmap). It demonstrates the Tether stack as a product direction, not a logo.
3. **Safety is the feature.** A psychological + technical Zero-Trust protocol (multi-stage consent, masked keys, dry-run default, explicit "are you absolutely sure" barrier) is exactly what a regulated, money-moving AI must show. Judges trust what they can verify.
4. **Edge hardware awareness.** The agent reads the trader's machine (CPU/GPU/RAM/latency/thermals) and warns before a trade if the device could lag or overheat — a genuinely novel edge-AI use case.

## 2. Security architecture for API keys (local-only)

**Threat model:** keys must never leak to cloud, logs, telemetry, or the LLM context. The model must be able to *act* with keys without ever *seeing* them.

- **Vault isolation (`src/security/vault.js`).** Keys are encrypted at rest with AES-256-GCM. The encryption key is derived (scrypt) from a local passphrase (`NYX_VAULT_PASS`) + a per-install random salt. Ciphertext lives in `data/.vault.json` (git-ignored). Plaintext keys exist only in process memory, only for the moment a request is signed.
- **Keys never enter the LLM.** The broker passes an opaque `keyRef` (a vault handle) to the model, never the secret. The model reasons about *masked* keys (`abcd…wxyz`).
- **No-log guarantee.** Vault accessors strip secrets from all serialization; NetGuard/PoLI hash only request *metadata*, never key material.
- **Egress allowlist (`src/netguard.js`).** Default-deny on all sockets. Only `api.bitfinex.com` (+ loopback) is allowed, and every allowed call is recorded in `evidence/netguard.json` with host + timestamp. The privacy claim becomes precise and honest: *"no egress except the user-approved exchange endpoint, fully logged."*
- **Read-only verification.** Keys are validated with an authenticated *read* endpoint (wallets) before any write/trade capability is unlocked.
- **Dry-run by default.** Orders are simulated unless `NYX_LIVE_TRADING=1` AND the user passes the double Zero-Trust confirmation. This makes the demo safe and the production path explicit.

## 3. Zero-Trust order state machine (mirrors the required dialogue)

```
idle
 -> intent_trade            ("осуществить сделку" / button)
 -> choose_mode             ask: auto vs manual
     -> manual: calculator   (leverage under stop, fees in USD₮, R:R) -> idle
     -> auto: need_keys       show Bitfinex API-create link
         -> verifying         local ping (read wallets) -> mask key
         -> keys_ok           ask for trade params
         -> draft_order       build order struct, echo params, ask confirm
         -> confirm_1         user "да"
         -> confirm_final     "Вы абсолютно уверены ... на аккаунте abcd…wxyz?"
         -> confirm_2         user "да" -> submit (dry-run unless live enabled)
         -> submitted -> idle
```

Every transition is explicit, reversible ("отмена" -> idle), and logged. No order is ever sent without two independent affirmative confirmations.
