// Trade calculator: position sizing, leverage under a stop-loss, risk:reward,
// and fee accounting in USD₮ (Tether) via the WDK fee model.
// Pure functions, no network, no hardcoded trade scenarios.
import { quoteFee } from "../wallet/wdk.js"

// Bitfinex taker/maker fees (defaults; override per account).
const DEFAULT_TAKER = 0.002 // 0.20%
const DEFAULT_MAKER = 0.001 // 0.10%

// Size a position so that hitting the stop-loss loses exactly `riskUsd`.
// Returns leverage required to hold `notional` with `marginUsd` of collateral.
export function sizePosition({
	entry,
	stop,
	target,
	riskUsd,
	marginUsd,
	side = "buy",
	taker = DEFAULT_TAKER,
}) {
	entry = Number(entry); stop = Number(stop)
	if (!entry || !stop || entry === stop) throw new Error("entry and stop must differ")
	const perUnitRisk = Math.abs(entry - stop)
	const stopPct = perUnitRisk / entry

	let units, notional
	if (riskUsd) {
		units = Number(riskUsd) / perUnitRisk
		notional = units * entry
	} else if (marginUsd) {
		notional = Number(marginUsd) // 1x baseline; leverage scales below
		units = notional / entry
	} else {
		throw new Error("provide riskUsd or marginUsd")
	}

	const neededLeverage = marginUsd ? notional / Number(marginUsd) : null
	const maxSafeLeverage = +(1 / stopPct).toFixed(2) // stop hit ≈ full liquidation bound

	const entryFeeUsd = notional * taker
	const exitFeeUsd = notional * taker
	const feesUsd = +(entryFeeUsd + exitFeeUsd).toFixed(2)

	const rr = target
		? +(Math.abs(Number(target) - entry) / perUnitRisk).toFixed(2)
		: null

	const reward = target ? Math.abs(Number(target) - entry) * units : null
	const netRewardUsd = reward != null ? +(reward - feesUsd).toFixed(2) : null

	return {
		side,
		entry,
		stop,
		target: target ? Number(target) : null,
		units: +units.toFixed(8),
		notionalUsd: +notional.toFixed(2),
		stopPct: +(stopPct * 100).toFixed(2),
		riskUsd: riskUsd ? Number(riskUsd) : +(units * perUnitRisk).toFixed(2),
		neededLeverage: neededLeverage ? +neededLeverage.toFixed(2) : null,
		maxSafeLeverage,
		feesUsdt: feesUsd,
		riskReward: rr,
		netRewardUsdt: netRewardUsd,
		wdkFee: quoteFee(feesUsd),
	}
}

// Plain-language verdict on trade quality (heuristic, transparent).
export function gradeTrade(calc) {
	const notes = []
	if (calc.riskReward != null) {
		if (calc.riskReward >= 3) notes.push("Excellent R:R (≥ 3:1).")
		else if (calc.riskReward >= 2) notes.push("Solid R:R (≥ 2:1).")
		else if (calc.riskReward >= 1) notes.push("Marginal R:R (≥ 1:1) — thin edge.")
		else notes.push("Poor R:R (< 1:1) — reconsider.")
	}
	if (calc.neededLeverage && calc.neededLeverage > calc.maxSafeLeverage)
		notes.push(` Leverage ${calc.neededLeverage}x exceeds safe bound ${calc.maxSafeLeverage}x for this stop.`)
	if (calc.stopPct < 0.3) notes.push("Very tight stop — watch for noise/slippage.")
	const score = Math.max(0, Math.min(100, Math.round((calc.riskReward || 0) * 25 + (calc.neededLeverage && calc.neededLeverage <= calc.maxSafeLeverage ? 25 : 0))))
	return { score, notes }
}
