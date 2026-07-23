// src/agent/operate.js
// High-level OS operation orchestrator: plan (diagnose) -> validate -> optionally
// execute (connector) with explicit confirmation. Real implementation, no stub.
import { runScript } from "../shell/connector.js"
import { validateScript } from "../shell/validator.js"
import { diagnose } from "./diagnose.js"

export async function operate(request, opts = {}) {
  const { os, lang, shell, execute = false, confirm = false, wantFix = true } = opts || {}
  const plan = await diagnose(String(request || ""), { os, lang, execute: false, wantFix })
  if (!plan || !plan.script) return { ok: false, reason: "no-plan", text: (plan && (plan.text || plan.explanation)) || "", plan }
  const verdict = plan.verdict || validateScript(plan.script, { shell: plan.shell || shell, lang })
  if (!verdict.safe) return { ok: false, blocked: true, reason: "blocked", verdict, script: plan.script, shell: plan.shell, plan }
  if (!execute) return { ok: true, dryRun: true, script: plan.script, shell: plan.shell, verdict, plan }
  const res = await runScript(plan.script, { shell: plan.shell || shell, confirm })
  return { ok: !!res.executed && res.code === 0, ...res, script: plan.script, shell: plan.shell, plan }
}

export { operate as run, operate as execute, operate as operateOS }
export default operate
