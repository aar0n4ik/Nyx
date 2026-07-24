#!/usr/bin/env bash
# apply-nyx-fixes.sh
# Honesty + safety fixes for aar0n4ik/Nyx.
# Run from anywhere inside the repo:  bash apply-nyx-fixes.sh
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
echo "==> Repo root: $(pwd)"

# ─────────────────────────────────────────────────────────────────────────────
# 1) NetGuard — block egress by default + honest scope
# ─────────────────────────────────────────────────────────────────────────────
cat > src/netguard.js <<'NYX_EOF'
// NetGuard: runtime egress auditor for THIS Node process.
// DEFAULT-DENY, and blocking is ON by default (set NYX_STRICT=0 for log-only):
// every non-loopback socket is blocked UNLESS its host is on an explicit
// allowlist (the user-approved exchange endpoint). Allowed calls are still
// recorded, so the privacy claim stays precise and honest:
//   "no egress except the allowlisted, user-approved endpoints — fully logged."
//
// Scope & limits (stated honestly, not marketing): this hooks
// net.Socket.prototype.connect, so it covers Node's TCP/TLS/HTTP(S)/fetch
// traffic. It does NOT intercept UDP, OS-level DNS resolvers, child processes,
// or native addons that open their own sockets. It is a strong in-process guard
// plus a tamper-evident audit log — not a kernel/OS firewall.
import net from "node:net"
import { writeFileSync, mkdirSync } from "node:fs"

// Hosts the trader explicitly opted into. Bitfinex is Tether's iFinex sister co.
const ALLOWLIST = [
	"api.bitfinex.com",
	"api-pub.bitfinex.com",
	...(process.env.NYX_ALLOW_HOSTS || "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean),
]

const report = {
	// Block by default; opt out explicitly with NYX_STRICT=0 (log-only mode).
	strict: process.env.NYX_STRICT !== "0",
	allowlist: ALLOWLIST,
	nonLoopback: 0, // blocked / unexpected egress
	allowed: 0, // allowlisted egress (counted, not a violation)
	connections: [], // blocked attempts
	allowedConnections: [], // permitted exchange calls
}

const isLocal = (h) =>
	!h ||
	h === "localhost" ||
	h === "::1" ||
	h.startsWith("127.") ||
	h.startsWith("/") // unix socket

const isAllowed = (h) => ALLOWLIST.some((a) => h === a || h.endsWith("." + a))

const origConnect = net.Socket.prototype.connect
net.Socket.prototype.connect = function (...args) {
	const opts = typeof args[0] === "object" ? args[0] : { host: args[1], port: args[0] }
	const host = String(opts.host || opts.path || "localhost")
	if (!isLocal(host)) {
		if (isAllowed(host)) {
			report.allowed++
			report.allowedConnections.push({ host, ts: new Date().toISOString() })
		} else {
			report.nonLoopback++
			report.connections.push({ host, ts: new Date().toISOString() })
			if (report.strict) {
				flush()
				throw new Error(`NetGuard: blocked egress to ${host}`)
			}
		}
	}
	return origConnect.apply(this, args)
}

export function flush() {
	mkdirSync("evidence", { recursive: true })
	writeFileSync("evidence/netguard.json", JSON.stringify(report, null, 2))
}

process.on("exit", flush)
export default report
NYX_EOF
echo "==> 1/8 src/netguard.js"

# ─────────────────────────────────────────────────────────────────────────────
# 2) PoLI — honest wording (integrity + ordering, not TEE locality)
# ─────────────────────────────────────────────────────────────────────────────
cat > src/poli.js <<'NYX_EOF'
// Proof-of-Local-Inference (PoLI): a tamper-evident, Ed25519-signed hash chain.
// Every inference appends an entry whose hash chains to the previous one, so a
// verifier can prove the log was NOT altered or reordered, and that each entry
// was produced by the holder of the local signing key.
//
// Honest scope (important — do NOT overstate this):
//   PoLI proves INTEGRITY + ORDERING of the recorded inferences. Because the
//   signing key is generated and kept locally, this is NOT, by itself, a
//   cryptographic proof that inference physically ran on this machine (that
//   would require hardware/TEE remote attestation). The "on-device" guarantee
//   comes from the COMBINATION of: (1) there being no cloud inference code path
//   at all (see src/llm/engine.js — QVAC SDK only), and (2) NetGuard's full
//   egress log showing no AI endpoint was ever contacted. PoLI ties those facts
//   to a signed, append-only record.
//
// Each entry also records which engine produced the answer and (optionally) its
// performance telemetry (TTFT, tokens/sec) so the metrics are part of the
// signed evidence.
import { createHash, createPrivateKey, sign } from "node:crypto"
import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs"

const LOG = "evidence/poli.jsonl"

function lastHash() {
	if (!existsSync(LOG)) return "GENESIS"
	const lines = readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean)
	if (!lines.length) return "GENESIS"
	return JSON.parse(lines[lines.length - 1]).hash
}

export function recordInference({ model, prompt, output, metrics = null }) {
	mkdirSync("evidence", { recursive: true })
	const prev = lastHash()
	const entry = {
		ts: new Date().toISOString(),
		model,
		promptSha256: createHash("sha256").update(prompt).digest("hex"),
		outputSha256: createHash("sha256").update(output).digest("hex"),
		...(metrics ? { metrics } : {}),
		prev,
	}
	const body = JSON.stringify(entry)
	const hash = createHash("sha256").update(prev + body).digest("hex")
	let signature = null
	if (existsSync(".poli.key")) {
		const key = createPrivateKey(readFileSync(".poli.key"))
		signature = sign(null, Buffer.from(hash), key).toString("base64")
	}
	appendFileSync(LOG, JSON.stringify({ ...entry, hash, signature }) + "\n")
	return hash
}
NYX_EOF
echo "==> 2/8 src/poli.js"

# ─────────────────────────────────────────────────────────────────────────────
# 3) Validator — not a sandbox + obfuscation/base64 guard (never auto-run)
# ─────────────────────────────────────────────────────────────────────────────
cat > src/shell/validator.js <<'NYX_EOF'
// Static safety analysis for AI-generated shell scripts (PowerShell / bash).
// Zero-Trust, DENY-BY-DEFAULT: auto-run (risk "low") is granted ONLY to proven
// read-only diagnostics. Anything unrecognized requires explicit confirmation
// (risk "medium"); state-changing needs elevation; destructive is hard-blocked;
// obfuscated/encoded commands are never allowed to auto-run.
// NOTE (honest): this is a FAST *static* gate that runs BEFORE execution. It
// meaningfully reduces risk, but it is NOT a sandbox and cannot fully contain a
// determined adversary — real isolation still relies on the confirm step + UAC.

const DESTRUCTIVE = [
	{ re: /\brm\s+(-[a-z]*\s+)*-[a-z]*r[a-z]*f?[a-z]*\s+(\/|~|\$HOME|\*|\.)/i, code: "rmrf_root" },
	{ re: /\brm\s+-[a-z]*\b.*\/(etc|bin|usr|boot|var|lib|sys|proc|dev)\b/i, code: "rm_sysdirs" },
	{ re: /\bmkfs\b|\bdd\s+if=.*of=\/dev\//i, code: "mkfs_dd" },
	{ re: /\b(format)\s+[a-z]:/i, code: "format_vol_win" },
	{ re: /\bdiskpart\b|\bclean\s+all\b/i, code: "diskpart" },
	{ re: /\b(Remove-Item|ri|del|erase|rmdir|rd)\b[\s\S]*(C:\\Windows|C:\\Program Files|C:\\ProgramData|System32|SysWOW64|\$env:SystemRoot|\$env:windir|\$env:ProgramFiles|%SystemRoot%|%windir%|%ProgramFiles%)/i, code: "del_win_sys" },
	{ re: /\bRemove-Item\b[\s\S]*(\$env:USERPROFILE(\s|"|'|$)|\$env:SystemDrive(\s|"|'|$)|[A-Za-z]:\\(\s|"|'|\*|$))/i, code: "del_root_profile" },
	{ re: /\b(del|erase)\s+\/[a-z]\b.*(C:\\Windows|%SystemRoot%|%windir%|System32)/i, code: "del_sys_files" },
	{ re: /\bRemove-Item(Property)?\b[\s\S]*\bHK(LM|CU|EY_LOCAL_MACHINE):/i, code: "del_registry" },
	{ re: /\b(Format-Volume|Clear-Disk|Remove-Partition|Initialize-Disk)\b/i, code: "format_disk_ps" },
	{ re: /\breg\s+delete\s+HK(LM|EY_LOCAL_MACHINE)/i, code: "reg_delete_hklm" },
	{ re: /\b(shutdown|Restart-Computer|Stop-Computer|halt|poweroff|reboot)\b/i, code: "shutdown" },
	{ re: /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:/, code: "forkbomb" },
	{ re: /\b(curl|wget|iwr|Invoke-WebRequest|Invoke-RestMethod)\b[\s\S]*\|\s*(bash|sh|zsh|powershell|cmd|iex|Invoke-Expression)/i, code: "net_exec" },
	{ re: /\b(iex|Invoke-Expression)\b/i, code: "iex" },
	{ re: /Set-ExecutionPolicy\s+(Unrestricted|Bypass)\s+-Scope\s+(LocalMachine|CurrentUser)/i, code: "exec_policy" },
	{ re: /\bchmod\s+-R\s+777\s+\//, code: "chmod777" },
	{ re: />\s*\/dev\/sd[a-z]/i, code: "write_dev" },
	{ re: /\bnetsh\b.*\b(disable|delete)\b/i, code: "netsh_disable" },
	{ re: /\bbcdedit\b|\bvssadmin\s+delete\b|\bcipher\s+\/w/i, code: "boot_shadow" },
	{ re: /\b(net\s+user)\b.*\/(add|delete)/i, code: "net_user" },
]

const ELEVATION = [/\bsudo\b/i, /Start-Process\b.*-Verb\s+RunAs/i, /\brunas\b/i]
const NETWORK = [/\b(curl|wget|Invoke-WebRequest|iwr|Invoke-RestMethod|nc|ncat|telnet|ssh|scp)\b/i]
const WRITES = [/\b(Remove-Item|rm|del|rmdir|rd|mv|move|Move-Item|Set-Content|Add-Content|Out-File|>>?)\b/i, /\b(New-Item|mkdir|cp|copy|Copy-Item|robocopy|xcopy)\b/i]
const SYSTEM_CONFIG = [/\bSet-Date\b/i, /\bSet-TimeZone\b/i, /\btzutil\b\s+\/s/i, /\bSet-WinUserLanguageList\b/i, /\bSet-WinUILanguageOverride\b/i, /\bSet-ItemProperty\b/i, /\bNew-ItemProperty\b/i, /\b(Set|Stop|Start)-Service\b/i, /Microsoft\.Update\./i, /\bCreateUpdateInstaller\b/i, /\bInstall-WindowsUpdate\b/i, /\bAdd-WindowsCapability\b/i, /\bEnable-WindowsOptionalFeature\b/i, /\bDISM(\.exe)?\b/i, /\bwinget\s+(install|upgrade|uninstall|configure|import)\b/i]

// Obfuscated / encoded commands hide their real intent from a static gate, so
// they must NEVER auto-run — force at least "elevated" (explicit confirm).
const OBFUSCATION = [
	/-e(nc|ncodedcommand)?\b\s*[A-Za-z0-9+\/=]{16,}/i,
	/\bpowershell(\.exe)?\b[^\n]*\s-e\b/i,
	/FromBase64String/i,
	/\[Convert\]::FromBase64/i,
	/\[System\.Text\.Encoding\]/i,
	/\[char\[\]\]/i,
]

// Proven read-only diagnostics — the ONLY class allowed to auto-run (risk "low").
// A script qualifies only if EVERY non-empty statement matches a read-only verb
// and it triggers no write/network/elevation/system-config/destructive rule.
const READONLY_LINE = /^\s*(Get-[A-Za-z]+|Test-Path|Resolve-Path|Split-Path|Join-Path|Measure-Object|Select-Object|Select-String|Where-Object|Sort-Object|ForEach-Object|Format-Table|Format-List|Out-String|Write-Output|Write-Host|echo|Get-Content|Get-ChildItem|dir|ls|cat|type|pwd|hostname|whoami|systeminfo|ver|uptime|date|ipconfig|ifconfig|ping|tracert|traceroute|nslookup|getmac|arp|netstat|tasklist|wmic|vol|\$[A-Za-z_]|\[|\}|\{|#|"|'|\||&&|;)?\s*(\|.*)?$/i

function isReadOnly(script) {
	const lines = String(script).split(/\r?\n|;/).map((l) => l.trim()).filter(Boolean)
	if (!lines.length) return false
	return lines.every((l) => READONLY_LINE.test(l))
}

const REASONS = {
	rmrf_root: { en: "Recursive filesystem deletion", ru: "Рекурсивное удаление файловой системы", uk: "Рекурсивне видалення файлової системи" },
	rm_sysdirs: { en: "Deleting system directories", ru: "Удаление системных каталогов", uk: "Видалення системних каталогів" },
	mkfs_dd: { en: "Disk format/wipe", ru: "Форматирование/затирание диска", uk: "Форматування/затирання диска" },
	format_vol_win: { en: "Volume format (Windows)", ru: "Форматирование тома (Windows)", uk: "Форматування тому (Windows)" },
	diskpart: { en: "Dangerous disk operations", ru: "Опасные операции с диском", uk: "Небезпечні операції з диском" },
	del_win_sys: { en: "Deleting Windows system files/folders", ru: "Удаление системных файлов/каталогов Windows", uk: "Видалення системних файлів/каталогів Windows" },
	del_root_profile: { en: "Deleting drive root or the entire user profile", ru: "Удаление корня диска или всего профиля пользователя", uk: "Видалення кореня диска або всього профілю користувача" },
	del_sys_files: { en: "Deleting system files", ru: "Удаление системных файлов", uk: "Видалення системних файлів" },
	del_registry: { en: "Deleting registry keys", ru: "Удаление веток реестра", uk: "Видалення гілок реєстру" },
	format_disk_ps: { en: "Disk format/clear (PowerShell)", ru: "Форматирование/очистка диска (PowerShell)", uk: "Форматування/очищення диска (PowerShell)" },
	reg_delete_hklm: { en: "Deleting HKLM registry keys", ru: "Удаление веток реестра HKLM", uk: "Видалення гілок реєстру HKLM" },
	shutdown: { en: "System shutdown/restart", ru: "Выключение/перезагрузка СИСТЕМЫ", uk: "Вимкнення/перезавантаження СИСТЕМИ" },
	forkbomb: { en: "Fork bomb", ru: "Форк-бомба", uk: "Форк-бомба" },
	net_exec: { en: "Downloading and running code from the network", ru: "Загрузка и исполнение кода из сети", uk: "Завантаження та виконання коду з мережі" },
	iex: { en: "Dynamic string execution (iex)", ru: "Динамическое исполнение строки (iex)", uk: "Динамічне виконання рядка (iex)" },
	exec_policy: { en: "Disabling execution protection", ru: "Отключение защиты исполнения", uk: "Вимкнення захисту виконання" },
	chmod777: { en: "Opening 777 permissions on the filesystem", ru: "Открытие прав 777 на ФС", uk: "Відкриття прав 777 на ФС" },
	write_dev: { en: "Direct write to a device", ru: "Прямая запись на устройство", uk: "Прямий запис на пристрій" },
	netsh_disable: { en: "Disabling/resetting the network", ru: "Отключение/сброс сети", uk: "Вимкнення/скидання мережі" },
	boot_shadow: { en: "Attack on boot/shadow copies", ru: "Атака на загрузку/теневые копии", uk: "Атака на завантаження/тіньові копії" },
	net_user: { en: "Modifying user accounts", ru: "Изменение учётных записей", uk: "Зміна облікових записів" },
	obfuscated: { en: "Obfuscated/encoded command — never auto-run", ru: "Обфусцированная/закодированная команда — без авто-запуска", uk: "Обфускована/закодована команда — без автозапуску" },
	elevation: { en: "Requires elevation", ru: "Требует повышения прав", uk: "Потребує підвищення прав" },
	sysconfig: { en: "Changes system settings (admin rights required)", ru: "Меняет системные настройки (нужны права администратора)", uk: "Змінює системні налаштування (потрібні права адміністратора)" },
	network: { en: "Uses the network", ru: "Использует сеть", uk: "Використовує мережу" },
	writes: { en: "Modifies files", ru: "Изменяет файлы", uk: "Змінює файли" },
	unverified: { en: "Unrecognized command — confirmation required (deny-by-default)", ru: "Команда не распознана — нужно подтверждение (deny-by-default)", uk: "Команда не розпізнана — потрібне підтвердження (deny-by-default)" },
	empty: { en: "Empty script", ru: "Пустой скрипт", uk: "Порожній скрипт" },
	toolong: { en: "Script too long (>8000 chars)", ru: "Слишком длинный скрипт (>8000 символов)", uk: "Занадто довгий скрипт (>8000 символів)" },
}
function rsn(code, lang) { const m = REASONS[code]; return (m && (m[lang] || m.en)) || code }

/** Fast static gate. Returns a verdict object; never throws. */
export function validateScript(script, { shell, lang = "en" } = {}) {
	const reasons = []
	if (!script || !script.trim()) return { safe: false, risk: "invalid", reasons: [rsn("empty", lang)], shell }
	if (script.length > 8000) reasons.push(rsn("toolong", lang))

	let destructive = false
	for (const d of DESTRUCTIVE) if (d.re.test(script)) { reasons.push("⛔ " + rsn(d.code, lang)); destructive = true }

	const needsElevation = ELEVATION.some((re) => re.test(script))
	const touchesNetwork = NETWORK.some((re) => re.test(script))
	const writes = WRITES.some((re) => re.test(script))
	const systemConfig = SYSTEM_CONFIG.some((re) => re.test(script))
	const obfuscated = OBFUSCATION.some((re) => re.test(script))
	const readOnly = isReadOnly(script)

	let risk
	if (destructive) {
		risk = "destructive"
	} else if (obfuscated) {
		risk = "elevated"; reasons.push("⚠️ " + rsn("obfuscated", lang)) // hidden intent → never auto-run
	} else if (needsElevation || systemConfig) {
		risk = "elevated"; reasons.push("⚠️ " + rsn(needsElevation ? "elevation" : "sysconfig", lang))
	} else if (touchesNetwork) {
		risk = "medium"; reasons.push("ℹ️ " + rsn("network", lang))
	} else if (writes) {
		risk = "medium"; reasons.push("ℹ️ " + rsn("writes", lang))
	} else if (readOnly) {
		risk = "low" // proven read-only → the only class allowed to auto-run
	} else {
		risk = "medium"; reasons.push("ℹ️ " + rsn("unverified", lang)) // DENY-BY-DEFAULT
	}

	const safe = risk !== "destructive" && risk !== "invalid"
	return { safe, risk, reasons, needsElevation, touchesNetwork, writes, systemConfig, obfuscated, readOnly, shell }
}

export const RISK_ORDER = { low: 0, medium: 1, elevated: 2, destructive: 3, invalid: 9 }
NYX_EOF
echo "==> 3/8 src/shell/validator.js"

# ─────────────────────────────────────────────────────────────────────────────
# 4) .env.example — exec dry-run by default, NetGuard strict on
# ─────────────────────────────────────────────────────────────────────────────
cat > .env.example <<'NYX_EOF'
# --- Nyx configuration --------------------------------------------------------
# All AI inference runs on-device via the QVAC SDK. There is NO cloud tier.
NYX_PORT=3000
NYX_OFFLINE=1            # always-on edge mode (no cloud fallback exists in this build)
NYX_STRICT=1            # NetGuard BLOCKS egress except the allowlist (loopback + Bitfinex).
                        # On by default even if unset; set 0 for log-only.
NYX_ALLOW_HOSTS=        # extra allowed hosts, comma-separated (rarely needed)
NYX_LANG=en

# --- On-device model (QVAC SDK) ---
# Preferred registry model constant. Leave unset to auto-pick the strongest
# available (Qwen3-4B-Instruct preferred, falls back to Llama 3.2 Instruct).
# Or point NYX_QVAC_MODEL_PATH at a local .gguf for a fully air-gapped install.
NYX_QVAC_MODEL=
NYX_QVAC_MODEL_PATH=
NYX_QVAC_EMBED_MODEL=   # optional QVAC embedding model constant for RAG

# --- Autonomous shell actions (Zero-Trust execution) ---
# 0 = DEFAULT dry-run: Nyx proposes the exact command but never runs it.
# 1 = Nyx executes CONFIRMED actions itself. Even then the static validator
#     blocks destructive/obfuscated commands, every run needs your explicit
#     Execute click, and privileged commands self-elevate via the Windows UAC
#     prompt. Off by default so a fresh clone can't run anything until you opt in.
NYX_ALLOW_EXEC=0
NYX_EXEC_TIMEOUT=15000     # ms before a normal spawned script is killed
NYX_ELEVATE_TIMEOUT=120000 # ms to wait for a UAC-elevated command (user consent)
NYX_CACHE_FILE=data/solutions.json
NYX_CACHE_MAX=200

# --- Trading (Zero-Trust broker) ---
NYX_LIVE_TRADING=0      # 0 = DRY-RUN orders (default). 1 = real Bitfinex orders.
NYX_VAULT_PASS=         # passphrase for the encrypted API-key vault
NYX_EOF
echo "==> 4/8 .env.example"

# ─────────────────────────────────────────────────────────────────────────────
# 5) connector.js — execution OFF by default (matches its own JSDoc)
# ─────────────────────────────────────────────────────────────────────────────
if grep -q 'NYX_ALLOW_EXEC !== "0"' src/shell/connector.js; then
  sed -i 's/NYX_ALLOW_EXEC !== "0"/NYX_ALLOW_EXEC === "1"/' src/shell/connector.js
  echo "==> 5/8 src/shell/connector.js (default flipped to dry-run)"
else
  echo "==> 5/8 src/shell/connector.js: pattern not found (already patched?) — skipped"
fi
perl -CSD -0pi -e 's/автономное исполнение отключено \(NYX_ALLOW_EXEC=0\)\. По умолчанию Nyx выполняет команды сам после подтверждения\./автономное исполнение выключено по умолчанию. Включите явно: NYX_ALLOW_EXEC=1 (действие всё равно требует подтверждения)./' src/shell/connector.js || true

# ─────────────────────────────────────────────────────────────────────────────
# 6) server.js — drop the misleading "online/offline provider" label
# ─────────────────────────────────────────────────────────────────────────────
sed -i 's|// --- Hybrid LLM status (online/offline provider) ---|// --- LLM engine status (QVAC on-device; honest offline fallback, no cloud) ---|' server.js || true
echo "==> 6/8 server.js"

# ─────────────────────────────────────────────────────────────────────────────
# 7) README.md — honest claims (PoLI / NetGuard / exec default / router)
# ─────────────────────────────────────────────────────────────────────────────
cat > README.md <<'NYX_EOF'
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
  There is no cloud inference code path at all (see `src/llm/engine.js`).
- **On-device RAG** — retrieval embeddings also run through the QVAC SDK, with
  an honest, clearly-labeled local-hash fallback when no embedding model exists.
- **Real autonomy, real safety** — the model authors commands; a **fast static
  gate** (`src/shell/validator.js`, *not* a sandbox) blocks destructive and
  obfuscated/encoded operations; execution is **off by default**, and every
  action needs your explicit OK plus a single Windows UAC prompt.
- **NetGuard** — a runtime egress guard that **blocks and logs** every
  non-allowlisted network call from the app process (blocking is **on by
  default**; `NYX_STRICT=0` for log-only). The only allowed egress is loopback
  and, when you opt into trading, the Bitfinex endpoint. In-process guard +
  audit log — not a kernel firewall.
- **PoLI** — every inference is appended to a tamper-evident, Ed25519-signed
  hash chain (Proof-of-Local-Inference). It proves the log was **not altered or
  reordered** (integrity + ordering). Combined with the absence of any cloud
  code path and NetGuard's egress log, this substantiates the on-device claim
  — it is not a TEE remote-attestation proof of physical locality.

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
 Browser UI (public/)  ->  server.js  ->  src/agents.js (tiered router)
                                          |- Tier 1  instant fast-path (specs/uptime/ping, no LLM)
                                          |- Tier 1b action pipeline  -> diagnose -> validator -> exec (your OK)
                                          \- Tier 2  QVAC LLM + RAG (unconstrained reasoning)
   QVAC SDK  <- src/qvac.js (chat + embeddings)      RAG <- src/rag.js (on-device vectors)
   Safety    <- src/shell/validator.js, src/netguard.js, src/poli.js, src/attestation.js
```

Detailed notes live in `docs/architecture.md`, `docs/offline-autonomy.md`,
`docs/zero-trust-broker.md`.

## Quick start

Requirements: **Node >= 22.17** (a QVAC SDK requirement) and **npm >= 10.9**,
Windows 10/11 (the action pipeline targets PowerShell). macOS/Linux run in
chat + RAG mode.

```bash
# 1) install dependencies (this also installs the QVAC SDK)
npm install

# 2) download the on-device model (Qwen3-4B) and build the RAG index
npm run model      # installs @qvac/sdk + fetches the model into ~/.qvac/models
npm run setup      # builds the local vector index from data/notes

# 3) start. Autonomous execution is OFF by default (dry-run: Nyx proposes the
#    exact command but never runs it). Set NYX_ALLOW_EXEC=1 to let it run
#    confirmed actions itself (still one Execute click + Windows UAC).
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
| Egress report | `evidence/netguard.json` | only allowlisted hosts (loopback + Bitfinex) were contacted; everything else was blocked and logged |
| Model attestation | `evidence/attestation.json` | which local model + SHA-256 |
| Inference log | `evidence/poli.jsonl` + `npm run verify` | a tamper-evident, signed chain of every inference (integrity + ordering) |

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

Demo: https://youtu.be/FG19aIasp4E?si=KK5oqtJb0WalE-Jh

## Configuration

Copy `.env.example` to `.env`. Key switches: `NYX_OFFLINE` (default on),
`NYX_STRICT` (NetGuard egress blocking — **on by default**; `0` for log-only),
`NYX_ALLOW_EXEC` (autonomous execution — **off by default / dry-run**; set `1`
to enable, actions still require confirmation), `NYX_QVAC_MODEL`,
`NYX_QVAC_EMBED_MODEL`, `NYX_PORT`, `NYX_ALLOW_HOSTS`, `NYX_LIVE_TRADING` (off by
default). There is **no cloud-AI switch** — inference is QVAC-only by design.

## Built by

Solo build by **aar0n4ik**.

- GitHub: https://github.com/aar0n4ik
- X: https://x.com/_AARON4IK_
- Instagram: https://www.instagram.com/bohdan.aaron4ik/

This is a project I care about deeply — built to show that real, useful,
*trustworthy* AI can run entirely on the edge. Feedback welcome.

## License

Apache-2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
NYX_EOF
echo "==> 7/8 README.md"

# ─────────────────────────────────────────────────────────────────────────────
# 8) SUBMISSION.md — honest claims for reviewers
# ─────────────────────────────────────────────────────────────────────────────
cat > SUBMISSION.md <<'NYX_EOF'
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
| **Capabilities** (orchestration + tool calling) | Tiered router: instant fast-path, action pipeline (plan->validate->exec->self-correct), Bitfinex broker, RAG — all driven by the local model |
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
  `CLOUD_ENABLED() === false`. The only network skill is the **public** Bitfinex
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
NYX_EOF
echo "==> 8/8 SUBMISSION.md"

# ─────────────────────────────────────────────────────────────────────────────
# Syntax check + commit
# ─────────────────────────────────────────────────────────────────────────────
echo "==> Checking JS syntax..."
node --check src/netguard.js
node --check src/poli.js
node --check src/shell/validator.js
node --check src/shell/connector.js
node --check server.js
echo "✅ All syntax OK"

git add -A
git commit -m "honesty+safety: exec & NetGuard secure-by-default, obfuscation guard, accurate PoLI/NetGuard/router claims"
echo ""
echo "✅ Committed. Now push with:  git push   (or: git push -u origin main)"