// Zero-Trust AI Broker — a per-chat state machine that mirrors the required
// safety dialogue. It guides auto vs manual flows, verifies keys locally, and
// gates real order submission behind two independent confirmations.
//
// This is a SAFETY RAIL, not a hardcoded brain: the LLM still answers freely.
// The broker only activates around money-moving actions, where determinism and
// explicit consent must override free-form generation.
import { storeKeys, publicStatus, mask } from "../security/vault.js"
import { verifyKeys, buildOrder, submitOrder, apiCreateUrl } from "../integrations/bitfinexAuth.js"
import { sizePosition, gradeTrade } from "./calculator.js"

// Per-chat sessions: { chatId -> { state, mode, keyRef, draft } }
const sessions = new Map()
const get = (id) => sessions.get(id) || { state: "idle" }
const set = (id, s) => { sessions.set(id, s); return s }
export function reset(id) { sessions.delete(id) }

// Unicode-aware matchers (\b does NOT work around Cyrillic letters in JS).
const yes = (t) => /(?<![\p{L}])(да|ага|конечно|подтвер\p{L}*|уверен\p{L}*|соглас\p{L}*|yes|y|confirm\p{L}*|sure|ok|okay|ок|так|сі)(?![\p{L}])/iu.test(t)
const no = (t) => /(?<![\p{L}])(нет|отмен\p{L}*|стоп|cancel|no|ні|скас\p{L}*)(?![\p{L}])/iu.test(t)
const wantsAuto = (t) => /(авто|самост|за меня|поставь|открой|auto|for me)/i.test(t)
const wantsManual = (t) => /(вручн|сам зай|помоги зай|калькул|manual|myself|разобр)/i.test(t)

// Detect a trade intent in free text (button sends a canonical phrase).
export function isTradeIntent(t) {
	return /(сделк|ордер|трейд|купи|прода|позици|bitfinex|trade|order|long|short|лонг|шорт)/i.test(t)
}

// Try to pull order params from free text. Returns partial object.
export function parseParams(t) {
	const out = {}
	const sym = t.match(/([A-Za-z]{2,6})\s*[\/\-]?\s*(usdt|usd₮|usd)/i)
	if (sym) out.symbol = sym[1].toUpperCase() + "USD"
	if (/(лонг|long|куп|buy)/i.test(t)) out.side = "buy"
	if (/(шорт|short|прод|sell)/i.test(t)) out.side = "sell"
	const num = (re) => { const m = t.match(re); return m ? Number(m[1]) : undefined }
	out.entry = num(/(?:entry|вход|цена)\D{0,4}(\d[\d.,]*)/i)
	out.stop = num(/(?:stop|стоп|sl)\D{0,4}(\d[\d.,]*)/i)
	out.target = num(/(?:target|тейк|tp|цель)\D{0,4}(\d[\d.,]*)/i)
	out.riskUsd = num(/(?:risk|риск)\D{0,4}(\d[\d.,]*)/i)
	return out
}

// Extract a pasted API key pair (key + secret look like long hex/base58).
export function parseKeys(t) {
	const toks = t.match(/[A-Za-z0-9_\-]{20,}/g) || []
	if (toks.length >= 2) return { apiKey: toks[0], apiSecret: toks[1] }
	return null
}

// A message is "trade-relevant" only if it belongs to the trade dialogue. Anything
// else (greetings, general questions, topic switches) must release the safety rail
// so the free LLM can answer — the broker must never trap the user in a trade loop.
const hasOrderParams = (t) => Object.values(parseParams(t)).some((v) => v !== undefined)
function tradeRelevant(t) {
	return isTradeIntent(t) || yes(t) || no(t) || wantsAuto(t) || wantsManual(t) || !!parseKeys(t) || hasOrderParams(t)
}

// Main step. Returns { handled, text, state, data? }. lang for localization.
export async function step(chatId, text, lang = "ru") {
	let s = get(chatId)
	const T = pack(lang)

	if (no(text) && s.state !== "idle") { reset(chatId); return done(T.cancelled, "idle") }

	// Cognitive freedom: if we are mid-flow but the message is clearly off-topic
	// (a greeting like "привет", or any unrelated question), drop the rail entirely and
	// hand the turn to the free LLM brain instead of forcing trade variables.
	if (s.state !== "idle" && !tradeRelevant(text)) { reset(chatId); return { handled: false } }

	// Entry
	if (s.state === "idle") {
		if (!isTradeIntent(text)) return { handled: false }
		s = set(chatId, { state: "choose_mode", draft: parseParams(text) })
		return done(T.chooseMode, s.state, { actions: ["auto", "manual"] })
	}

	if (s.state === "choose_mode") {
		if (wantsManual(text)) { s.state = "manual"; set(chatId, s); return done(T.manualIntro, s.state) }
		if (wantsAuto(text)) { s.state = "need_keys"; set(chatId, s); return done(T.needKeys(apiCreateUrl), s.state, { link: apiCreateUrl }) }
		return done(T.chooseMode, s.state, { actions: ["auto", "manual"] })
	}

	// MANUAL: calculator assistant
	if (s.state === "manual") {
		const p = { ...s.draft, ...parseParams(text) }
		set(chatId, { ...s, draft: p })
		if (p.entry && p.stop) {
			const calc = sizePosition(p)
			const g = gradeTrade(calc)
			return done(T.calc(calc, g), "manual", { calc, grade: g })
		}
		return done(T.askCalcParams, "manual")
	}

	// AUTO: keys -> verify -> params -> draft -> confirm1 -> confirm2 -> submit
	if (s.state === "need_keys") {
		const k = parseKeys(text)
		if (!k) return done(T.needKeys(apiCreateUrl), s.state, { link: apiCreateUrl })
		const { keyRef } = storeKeys({ ...k, label: "bitfinex" })
		s = set(chatId, { ...s, state: "verifying", keyRef })
		const v = await verifyKeys(keyRef)
		if (v.valid) { s.state = "keys_ok"; set(chatId, s); return done(T.keysOk(v.masked), s.state, { masked: v.masked }) }
		if (v.offline) { s.state = "keys_ok"; set(chatId, s); return done(T.keysOffline(v.masked), s.state, { masked: v.masked, offline: true }) }
		s.state = "need_keys"; set(chatId, s)
		return done(T.keysBad(v.reason), s.state)
	}

	if (s.state === "keys_ok") {
		const p = { ...s.draft, ...parseParams(text) }
		s = set(chatId, { ...s, draft: p })
		if (p.symbol && p.side && (p.entry || /market|рын/i.test(text))) {
			const order = buildOrder({ symbol: p.symbol, side: p.side, amount: p.units || p.amount || 0.001, price: p.entry, type: p.entry ? "EXCHANGE LIMIT" : "EXCHANGE MARKET", leverage: p.leverage })
			s.state = "draft_order"; s.order = order; set(chatId, s)
			return done(T.draft(order), s.state, { order })
		}
		return done(T.askTradeParams, s.state)
	}

	if (s.state === "draft_order") {
		if (yes(text)) { s.state = "confirm_final"; set(chatId, s); return done(T.confirmFinal(publicStatus(s.keyRef)?.maskedKey || "••••", s.order), s.state, { order: s.order }) }
		return done(T.draft(s.order), s.state, { order: s.order })
	}

	if (s.state === "confirm_final") {
		if (yes(text)) {
			const r = await submitOrder(s.keyRef, s.order, { confirmed: true })
			reset(chatId)
			return done(T.result(r), "idle", { result: r })
		}
		return done(T.confirmFinal(publicStatus(s.keyRef)?.maskedKey || "••••", s.order), s.state, { order: s.order })
	}

	return { handled: false }
}

function done(text, state, data) { return { handled: true, text, state, ...(data ? { data } : {}) } }

// Localized copy (ru/uk/en/es/de fall back to ru/en).
function pack(lang) {
	const ru = {
		cancelled: "Ок, отменил. Когда будете готовы — просто напишите.",
		chooseMode: "Я могу помочь вам с этим. Хотите, чтобы я полностью поставил за вас сделку автоматически, или мне просто помочь вам успешно зайти в неё вручную?",
		manualIntro: "Отлично. Я могу помочь рассчитать, насколько это хорошая сделка, разобрать рыночные нюансы и коэффициенты, рассчитать нужное плечо под ваш стоп-лосс и учесть комиссии в USD₮ через Tether WDK. Напишите: инструмент, вход, стоп, цель и риск в USD₮.",
		askCalcParams: "Дайте хотя бы цену входа и стоп-лосс (и желательно цель и риск в USD₮), и я всё посчитаю.",
		needKeys: (url) => `Чтобы я мог открывать сделки сам, нужны API-ключи. Перейдите в личный кабинет Bitfinex и создайте ключ: ${url}\n\nПосле того как вы передадите ключи, я смогу безопасно открывать сделки на вашем аккаунте. Ключи хранятся локально и зашифрованно, в облако ничего не уходит. Вставьте API key и API secret одним сообщением.`,
		keysOk: (m) => `Отлично, ключи успешно верифицированы (${m}). Теперь расскажите, какую именно сделку вы хотите совершить и хотите ли, чтобы я сначала помог в ней детально разобраться? (напр.: BTC/USD₮, лонг, вход 65000, стоп 64000)`,
		keysOffline: (m) => `Ключи приняты и зашифрованы локально (${m}). Сейчас нет сети до биржи, поэтому проверка отложена и работаем в режиме dry-run. Опишите сделку.`,
		keysBad: (r) => `Ключи не прошли проверку (${r}). Проверьте права ключа и пришлите ещё раз.`,
		askTradeParams: "Укажите инструмент, направление и цену (или «по рынку»). Напр.: BTC/USD₮ лонг вход 65000.",
		draft: (o) => `Я правильно сформировал параметры ордера?\n• Инструмент: ${o.symbol}\n• Тип: ${o.type}\n• Объём: ${o.amount}\n${o.price ? "• Цена: " + o.price + "\n" : ""}Подтвердите, что всё сделано верно («да» / «отмена»).`,
		confirmFinal: (m, o) => ` Вы абсолютно уверены, что хотите осуществить эту сделку на аккаунте ${m} с параметрами ${o.symbol} ${o.amount} ${o.type}${o.price ? " @ " + o.price : ""} прямо сейчас? Ответьте «да» для отправки или «отмена».`,
		calc: (c, g) => `Расчёт сделки (${c.side}):\n• Объём: ${c.units} (≈ ${c.notionalUsd} USD₮)\n• Стоп: ${c.stopPct}% от входа\n• Риск: ${c.riskUsd} USD₮\n• Нужное плечо: ${c.neededLeverage ?? "—"}x (безопасный потолок ${c.maxSafeLeverage}x)\n• R:R: ${c.riskReward ?? "—"}\n• Комиссии: ${c.feesUsdt} USD₮ (WDK ${c.wdkFee})\n• Чистая прибыль по цели: ${c.netRewardUsdt ?? "—"} USD₮\n• Оценка: ${g.score}/100. ${g.notes.join(" ")}`,
		result: (r) => r.dryRun
			? ` Ордер собран и проверен в режиме DRY-RUN (без реальной отправки). ${r.note}\nПараметры: ${JSON.stringify(r.order)}`
			: (r.submitted ? ` Ордер отправлен на Bitfinex.` : ` Биржа отклонила ордер (статус ${r.status}).`),
	}
	const en = {
		cancelled: "Okay, cancelled. Tell me when you're ready.",
		chooseMode: "I can help with that. Do you want me to place the trade for you automatically, or just help you enter it manually?",
		manualIntro: "Great. I can assess how good the trade is, break down market nuances and ratios, compute the leverage needed for your stop-loss, and account for fees in USD₮ via Tether WDK. Tell me: symbol, entry, stop, target, and risk in USD₮.",
		askCalcParams: "Give me at least the entry and stop (ideally target and USD₮ risk) and I'll crunch it.",
		needKeys: (url) => `To place trades myself I need API keys. Open your Bitfinex account and create a key: ${url}\n\nOnce you share the keys I can open trades on your account safely. Keys are stored locally and encrypted — nothing leaves your device. Paste the API key and API secret in one message.`,
		keysOk: (m) => `Keys verified successfully (${m}). Now tell me exactly which trade you want, and whether you'd like me to break it down in detail first. (e.g. BTC/USD₮ long entry 65000 stop 64000)`,
		keysOffline: (m) => `Keys accepted and encrypted locally (${m}). No network to the exchange right now, so verification is deferred and we run in dry-run. Describe the trade.`,
		keysBad: (r) => `Keys failed verification (${r}). Check the key permissions and resend.`,
		askTradeParams: "Tell me symbol, side and price (or 'market'). e.g. BTC/USD₮ long entry 65000.",
		draft: (o) => `Did I build the order correctly?\n• Symbol: ${o.symbol}\n• Type: ${o.type}\n• Amount: ${o.amount}\n${o.price ? "• Price: " + o.price + "\n" : ""}Confirm it's all correct ("yes" / "cancel").`,
		confirmFinal: (m, o) => ` Are you absolutely sure you want to execute this trade on account ${m} with ${o.symbol} ${o.amount} ${o.type}${o.price ? " @ " + o.price : ""} right now? Reply "yes" to send or "cancel".`,
		calc: (c, g) => `Trade math (${c.side}):\n• Size: ${c.units} (≈ ${c.notionalUsd} USD₮)\n• Stop: ${c.stopPct}% from entry\n• Risk: ${c.riskUsd} USD₮\n• Needed leverage: ${c.neededLeverage ?? "—"}x (safe cap ${c.maxSafeLeverage}x)\n• R:R: ${c.riskReward ?? "—"}\n• Fees: ${c.feesUsdt} USD₮ (WDK ${c.wdkFee})\n• Net reward at target: ${c.netRewardUsdt ?? "—"} USD₮\n• Score: ${g.score}/100. ${g.notes.join(" ")}`,
		result: (r) => r.dryRun
			? ` Order built and checked in DRY-RUN (not actually sent). ${r.note}\nParams: ${JSON.stringify(r.order)}`
			: (r.submitted ? ` Order submitted to Bitfinex.` : ` Exchange rejected the order (status ${r.status}).`),
	}
	return lang === "en" || lang === "es" || lang === "de" || lang === "fr" ? en : ru
}
