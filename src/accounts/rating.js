import { all, verifyChain } from "./ledger.js"
import { getProfile } from "./accounts.js"

function dayKey(ts) { return new Date(ts).toISOString().slice(0, 10) }

export function summary() {
  const events = all()
  const chain = verifyChain()
  const byType = {}
  const days = new Set()
  let firstTs = null, lastTs = null
  for (const e of events) {
    byType[e.type] = (byType[e.type] || 0) + 1
    days.add(dayKey(e.ts))
    const t = Date.parse(e.ts)
    if (firstTs === null || t < firstTs) firstTs = t
    if (lastTs === null || t > lastTs) lastTs = t
  }
  const sorted = Array.from(days).sort()
  let streak = 0, best = 0, prev = null
  for (const d of sorted) {
    if (prev && (Date.parse(d) - Date.parse(prev)) === 86400000) streak += 1; else streak = 1
    if (streak > best) best = streak
    prev = d
  }
  return { total: events.length, byType, activeDays: days.size, streak: best, firstTs: firstTs ? new Date(firstTs).toISOString() : null, lastTs: lastTs ? new Date(lastTs).toISOString() : null, chainValid: chain.valid }
}
export function rating() {
  const s = summary()
  const prof = getProfile()
  const actionPts = Math.min(40, s.total * 0.5)
  const dayPts = Math.min(30, s.activeDays * 5)
  const streakPts = Math.min(20, s.streak * 4)
  const depthPts = Math.min(10, Object.keys(s.byType).length * 2)
  let score = Math.round(actionPts + dayPts + streakPts + depthPts)
  if (!s.chainValid) score = 0
  const level = score >= 85 ? "Core Tester" : score >= 60 ? "Power Tester" : score >= 35 ? "Active Tester" : score >= 10 ? "Explorer" : "New"
  return { accountId: prof ? prof.accountId : null, handle: prof ? prof.handle : null, score, level, breakdown: { actionPts, dayPts, streakPts, depthPts }, honest: s.chainValid, stats: s }
}
