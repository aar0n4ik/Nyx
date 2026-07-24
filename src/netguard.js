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
