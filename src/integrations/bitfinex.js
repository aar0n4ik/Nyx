// Bitfinex integration — Bitfinex is Tether's sister company (both owned by iFinex),
// which makes it the most genuinely "Tether-connected" venue for a prop-trading
// copilot. We use the PUBLIC v2 REST API (no keys) for live USD₮ market data.
// Everything degrades gracefully so the demo works fully offline.

const BASE = process.env.BITFINEX_API || "https://api-pub.bitfinex.com/v2"
const TIMEOUT = 4000

// Last-known sample so offline demos still render real-looking numbers.
const SAMPLE = {
	BTC: { symbol: "tBTCUSD", last: 87450, dailyChangePct: 1.84, volume: 18234 },
	ETH: { symbol: "tETHUSD", last: 4520, dailyChangePct: 2.41, volume: 92110 },
	SOL: { symbol: "tSOLUSD", last: 168.2, dailyChangePct: -0.92, volume: 240500 },
	USTUSD: { symbol: "tUSTUSD", last: 1.0, dailyChangePct: 0.0, volume: 50000000 },
}

function pair(sym) {
	const s = String(sym || "BTC").toUpperCase().replace(/USD$|USDT$|\/.*$/g, "")
	return `t${s}USD`
}

async function fetchJSON(url) {
	const ctrl = new AbortController()
	const id = setTimeout(() => ctrl.abort(), TIMEOUT)
	try {
		const r = await fetch(url, { signal: ctrl.signal })
		if (!r.ok) throw new Error(`HTTP ${r.status}`)
		return await r.json()
	} finally {
		clearTimeout(id)
	}
}

// Returns { symbol, last, dailyChangePct, volume, live }
export async function ticker(sym = "BTC") {
	const p = pair(sym)
	try {
		// v2 ticker: [BID,BID_SIZE,ASK,ASK_SIZE,DAILY_CHANGE,DAILY_CHANGE_REL,LAST,VOL,HIGH,LOW]
		const t = await fetchJSON(`${BASE}/ticker/${p}`)
		return {
			symbol: p,
			last: t[6],
			dailyChangePct: +(t[5] * 100).toFixed(2),
			volume: Math.round(t[7]),
			live: true,
		}
	} catch {
		const key = String(sym).toUpperCase().replace(/USD$/, "")
		const s = SAMPLE[key] || SAMPLE.BTC
		return { ...s, live: false }
	}
}

export async function market(symbols = ["BTC", "ETH", "SOL"]) {
	const out = []
	for (const s of symbols) out.push(await ticker(s))
	return out
}

// Risk-guardian: an on-device check an AI prop copilot would run before a trade.
export function riskCheck({ equity = 10000, riskPerTrade = 0.01, stopDistancePct = 1.5, dailyDrawdownPct = 0 } = {}) {
	const riskAmount = equity * riskPerTrade
	const positionSize = stopDistancePct > 0 ? +(riskAmount / (stopDistancePct / 100)).toFixed(2) : 0
	const maxDailyLoss = equity * 0.05
	const breaches = []
	if (riskPerTrade > 0.02) breaches.push("risk-per-trade > 2% (prop rule)")
	if (dailyDrawdownPct >= 5) breaches.push("daily drawdown limit hit (5%)")
	return {
		equity, riskAmount, positionSize, maxDailyLoss,
		ok: breaches.length === 0, breaches,
	}
}

// Detect a market-data question and produce a localized, formatted answer.
export async function maybeMarketAnswer(query, lang = "en") {
	const q = String(query).toLowerCase()
	if (!/(price|цен|цін|market|рынок|ринок|ticker|btc|eth|sol|битк|курс|precio|kurs|prix)/.test(q)) return null
	const sym = (q.match(/\b(btc|eth|sol|xrp|ltc|ada|dot|link)\b/) || [])[1]
	const data = sym ? [await ticker(sym)] : await market()
	const flag = data[0]?.live ? " live" : "⚪ cached"
	const lines = data.map((d) => `${d.symbol}: $${Number(d.last).toLocaleString()} (${d.dailyChangePct >= 0 ? "+" : ""}${d.dailyChangePct}%)`)
	const head = {
		en: `Bitfinex market (${flag}, settled in USD₮):`,
		ru: `Рынок Bitfinex (${flag}, расчёт в USD₮):`,
		uk: `Ринок Bitfinex (${flag}, розрахунок у USD₮):`,
		es: `Mercado Bitfinex (${flag}, liquidado en USD₮):`,
		de: `Bitfinex-Markt (${flag}, in USD₮ abgerechnet):`,
		fr: `Marché Bitfinex (${flag}, réglé en USD₮) :`,
	}
	return { text: `${head[lang] || head.en}\n` + lines.join("\n"), source: "Bitfinex public API", live: data[0]?.live }
}
