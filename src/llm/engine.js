// On-device LLM engine — QVAC SDK ONLY.
// Per the QVAC Project rules, ALL AI inference runs through the QVAC SDK
// (@qvac/sdk), 100% on-device, with zero cloud calls. There is intentionally NO
// cloud provider and NO third-party local engine in this build: the only
// inference path is QVAC. If the QVAC model isn't downloaded yet, a
// deterministic, clearly-labeled NON-AI fallback (the knowledge brain) answers
// so the service never hangs — it never poses as model output.
import { chat as qvacChat, hasSDK } from "../qvac.js"
import { knowledgeAnswer } from "../brain.js"

// Kept for API/back-compat with callers. This build is offline-only by design;
// no cloud tier exists.
export const OFFLINE = () => true
export const CLOUD_ENABLED = () => false

// Last-resort responder. Clearly labeled (mode "offline-fallback") so it never
// masquerades as model output — it answers from the on-device knowledge brain
// so Nyx always replies usefully, in character, in the user's language.
function fallbackText(history) {
	const last = [...history].reverse().find((h) => h.role === "user")?.content || ""
	return knowledgeAnswer(String(last)).text
}

// The only AI provider is QVAC. Returns the deterministic fallback responder
// when the SDK isn't installed, so callers can detect "no real model present".
export async function pickProvider() {
	if (hasSDK) return { name: "qvac", stream: (h) => qvacChat(h) }
	return {
		name: "fallback",
		async *stream(h) {
			yield fallbackText(h)
		},
	}
}

// Streamed generation. QVAC is the only model path; on any failure (e.g. the
// model isn't downloaded yet) we degrade to the honest deterministic brain.
export async function* generate(history, opts = {}) {
	const p = await pickProvider()
	try {
		let any = false
		for await (const t of p.stream(history, opts)) {
			any = true
			yield t
		}
		if (!any && p.name !== "fallback") yield fallbackText(history)
	} catch {
		yield fallbackText(history)
	}
}

export async function complete(history, opts = {}) {
	let out = ""
	for await (const t of generate(history, opts)) out += t
	return out
}

export async function status() {
	const active = (await pickProvider()).name
	return {
		offline: true,
		active,
		primary: "qvac",
		qvacSdk: hasSDK,
		cloud: {
			enabled: false,
			note: "no cloud in this build; all inference is on-device via the QVAC SDK",
		},
	}
}
