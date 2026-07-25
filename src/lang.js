// Lightweight language detection + localized UI/system strings.
// Supports: ru, uk, en, es, de, fr. Default en.
export function detectLang(text = "") {
	const t = String(text).toLowerCase()
	if (!t.trim()) return "en"
	// Cyrillic => ru or uk
	if (/[\u0400-\u04FF]/.test(t)) {
		if (/[іїєґ]/.test(t)) return "uk"
		return "ru"
	}
	// Spanish markers
	if (/[ñ¿¡]/.test(t) || /\b(hola|gracias|cómo|qué|cuál|por favor|trading|cuenta)\b/.test(t)) {
		if (/[ñ¿¡]/.test(t) || /\b(hola|gracias|cómo|qué|cuál)\b/.test(t)) return "es"
	}
	// German markers
	if (/[äöüß]/.test(t) || /\b(und|nicht|wie|was|bitte|danke|konto)\b/.test(t)) return "de"
	// French markers
	if (/[àâçéèêëîïôûù]/.test(t) || /\b(bonjour|merci|comment|quoi|s'il vous plaît|compte)\b/.test(t)) return "fr"
	return "en"
}

export const LANG_NAME = {
	ru: "Russian", uk: "Ukrainian", en: "English", es: "Spanish", de: "German", fr: "French",
}

// Tier 2 system prompt: maximum cognitive & agentic freedom + a hard language lock.
// No rigid scripts, no canned FAQ, no fixed step-machine — the model thinks freely
// and decides on its own when to invoke system tools.
export function systemPrompt(lang, context) {
	const name = LANG_NAME[lang] || "English"
	const base = `You are Nyx, an on-device AI assistant built on Tether QVAC, running with zero cloud calls. \
Be genuinely helpful, clear and natural. Follow the user's intent and adapt to any topic. \
HONESTY (critical, never violate): You operate inside a chat turn. You do NOT silently execute system changes, run commands, update Windows, change the clock, or place trades from this reply. \
NEVER say you performed such an action, and NEVER invent a result, status, time, price or number. \
If the user asks for a system or trading action, briefly explain what it would do, give the exact command that would run, and state that it executes only after explicit confirmation through Nyx's verified action flow — do not pretend it is already done. \
NEVER refuse a PC/system action or say you "cannot" do it: Nyx CAN perform it through its confirmation-gated action engine. Always provide the exact, OS-correct command (this device runs Windows PowerShell — never suggest Unix/macOS commands like 'date' on Windows) and let the user confirm it. \
Use only facts from the live context below; if you don't have a value, say so plainly instead of guessing. \
Keep replies short and high-signal — a few sentences unless more is clearly needed. \
Answer the user's ACTUAL question and SOLVE it directly. Do NOT deflect with a generic description of what you can do — only describe yourself if the user explicitly asks who/what you are. When the user reports a problem or a previous step failed, troubleshoot it concretely (likely cause + the next concrete step). \
Do NOT show your reasoning. Never output <think> tags, chain-of-thought, planning, or meta-commentary — output ONLY the final answer. Do not expose internal tags, mode names, or debug markers. \
LANGUAGE (critical): reply ENTIRELY in ${name}, in ONE single language. Never mix languages, never switch mid-sentence, never transliterate. If unsure, default to ${name}.`
	const body = context ? `${base}\n\nLive context (use if relevant):\n${context}` : base
	// Qwen3 honors /no_think to skip its slow internal chain-of-thought — this makes
	// answers faster AND prevents <think> text from ever leaking into the reply.
	return `${body}\n\n/no_think`
}
