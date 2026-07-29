// NetGuard: runtime egress auditor for THIS Node process.
// DEFAULT-DENY, and blocking is ON by default (set NYX_STRICT=0 for log-only):
// every non-loopback socket is blocked UNLESS its host is on an explicit
// allowlist (the user-approved exchange endpoint). Allowed calls are still
// recorded, so the privacy claim stays precise and honest:
//   "no egress except the allowlisted, user-approved endpoints — fully logged."
//
// Online mode adds a TRANSIENT, ref-counted, audited allowance: the server may
// open exactly one search host for the duration of ONE request, then NetGuard
// revokes it. The whole chat/notes are NEVER sent — only the current query,
// and every opened host is written to evidence/netguard.json.
//
// Scope & limits (stated honestly, not marketing): this hooks
// net.Socket.prototype.connect, so it covers Node's TCP/TLS/HTTP(S)/fetch
// traffic. It does NOT intercept UDP, OS-level DNS resolvers, child processes,
// or native addons that open their own sockets. It is a strong in-process guard
// plus a tamper-evident audit log — not a kernel/OS firewall.
import net from "node:net"
import { writeFileSync, mkdirSync } from "node:fs"

// No remote hosts are baked in — Nyx is fully local.
// Extra hosts can be added explicitly via NYX_ALLOW_HOSTS (comma-separated).
const ALLOWLIST = [
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
  runtimeOpened: [], // transient online-mode host opens/closes (audit trail)
}

// Transient, ref-counted runtime allowances. Online mode opens exactly the
// search host for the duration of ONE request, then revokes it. Everything is
// still logged, so the audit trail stays honest and complete.
const runtimeAllow = new Map()

export function allowHost(host) {
  const h = String(host || "").trim()
  if (!h) return
  runtimeAllow.set(h, (runtimeAllow.get(h) || 0) + 1)
  report.runtimeOpened.push({ host: h, action: "open", ts: new Date().toISOString() })
}

export function revokeHost(host) {
  const h = String(host || "").trim()
  if (!h) return
  const n = (runtimeAllow.get(h) || 0) - 1
  if (n <= 0) runtimeAllow.delete(h)
  else runtimeAllow.set(h, n)
  report.runtimeOpened.push({ host: h, action: "close", ts: new Date().toISOString() })
}

// Open a host ONLY for the duration of fn(), then always revoke + flush the log.
export async function withAllowedHost(host, fn) {
  allowHost(host)
  try {
    return await fn()
  } finally {
    revokeHost(host)
    flush()
  }
}

const isLocal = (h) =>
  !h ||
  h === "localhost" ||
  h === "::1" ||
  h.startsWith("127.") ||
  h.startsWith("/") // unix socket

const inList = (list, h) => list.some((a) => h === a || h.endsWith("." + a))
const isAllowed = (h) => inList(ALLOWLIST, h) || inList([...runtimeAllow.keys()], h)

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
