// src/core/nyx-brain.js
// Nyx Brain — единый разум. Один проход рассуждения: мысль + действие сразу.
// Все человеческие фразы формирует сам, на языке пользователя, без смайликов.
// Способности: разговор, действия на компьютере, снимок и перенос системы.
// Никогда не отвечает "не могу": нет прямого способа — предлагает ближайший.
// Адаптеры выверены по реальным модулям репозитория (engine/rag/brain/validator/connector).

import { z } from "zod"
import path from "node:path"

const Decision = z.object({
  thought: z.string().max(2000),
  mode: z.enum(["chat", "act", "snapshot"]),
  reply: z.string().optional(),
  plan: z.string().optional(),
  os: z.enum(["windows", "macos", "linux"]).optional(),
  shell: z.enum(["powershell", "cmd", "bash", "sh", "zsh"]).optional(),
  script: z.string().optional(),
  purpose: z.string().optional(),
  reversible: z.boolean().optional(),
  snapshotOp: z.enum(["capture", "restore", "plan"]).optional(),
})

async function load(mod) { try { return await import(mod) } catch { return null } }

const stripThink = s => String(s ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<\/?think>/gi, "").trim()

// Один контакт с моделью. engine.complete(messages) -> строка; degrade -> generate -> knowledgeAnswer.
async function reason(messages) {
  const engine = await load("../llm/engine.js")
  if (engine?.complete) return stripThink(await engine.complete(messages))
  if (engine?.generate) { let out = ""; for await (const t of engine.generate(messages)) out += t; return stripThink(out) }
  const kb = await load("../brain.js")
  if (kb?.knowledgeAnswer) return String(kb.knowledgeAnswer(messages.at(-1)?.content ?? "")?.text ?? "")
  throw new Error("engine-unavailable")
}

function extractJson(text) {
  if (!text) return null
  const s = text.indexOf("{"); if (s === -1) return null
  let depth = 0, inStr = false, esc = false
  for (let i = s; i < text.length; i++) {
    const c = text[i]
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue }
    if (c === '"') inStr = true
    else if (c === "{") depth++
    else if (c === "}") { if (--depth === 0) { try { return JSON.parse(text.slice(s, i + 1)) } catch { return null } } }
  }
  return null
}

const SYSTEM =
`You are Nyx, a local on-device assistant living on the user's computer.
Rules:
- Understand the real intent. NEVER reply that you cannot do something. If there is no direct method, propose the closest capability you have and explain it.
- Write "reply", "plan" and "purpose" in the SAME language as the user's latest message. Never use emojis. Be concrete, calm and logical. No filler, no walls of text.
- Reason briefly in "thought", then choose exactly one mode.
Modes:
- "chat": talk, explain, advise.
- "act": run a real command on this computer. Fill script/shell/os/purpose/reversible. Use real commands (e.g. on Windows: winget install -e --silent <id>). shell is "powershell" on Windows, "bash" on Linux, "zsh"/"bash" on macOS.
- "snapshot": create or restore a portable system snapshot. Set snapshotOp:
   * "capture": when the user mentions reinstalling Windows, a broken/slow PC, moving to a new computer, or not wanting to lose apps/settings. Offer to make a snapshot NOW.
   * "restore"/"plan": when a snapshot file is available and the user wants their apps/settings/data back.
When proposing a snapshot, briefly explain in "reply": it captures the list of installed apps, system settings, and a catalog of data folders into one small file (no personal files inside, only a list); the user downloads it and, after reinstalling, sends it back here to restore step by step with confirmation.
Output ONLY one JSON object matching the schema. No text around it.`

async function decide(context) {
  const messages = [{ role: "system", content: SYSTEM }, ...context]
  let raw = await reason(messages)
  let parsed = Decision.safeParse(extractJson(raw) ?? {})
  if (!parsed.success) {
    const err = parsed.error?.issues?.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") || "invalid"
    raw = await reason([...messages, { role: "assistant", content: raw }, { role: "user", content: `Invalid (${err}). Return one valid JSON per schema only.` }])
    parsed = Decision.safeParse(extractJson(raw) ?? {})
  }
  if (!parsed.success) return { thought: "unstructured", mode: "chat", reply: raw?.trim() || "" }
  return parsed.data
}

// Человеческий текст на языке пользователя, без смайликов.
async function narrate(refInput, instruction, data) {
  return stripThink(await reason([
    { role: "system", content: `Reply in the SAME language as this user message: """${refInput}""". Never use emojis. Be concrete, logical and reassuring but honest. Explain clearly. No filler.` },
    { role: "user", content: instruction + (data ? "\n\nDATA:\n" + JSON.stringify(data).slice(0, 6000) : "") },
  ]))
}

async function ground(input) {
  const rag = await load("../rag.js")
  try { const hits = rag?.retrieve ? await rag.retrieve(input, 4) : []; if (hits?.length) return "Relevant local notes:\n" + hits.map(h => `- ${h.text ?? ""}`).join("\n") } catch {}
  return ""
}

function gate(decision) {
  return (async () => {
    const v = await load("../shell/validator.js")
    let verdict = { safe: false, risk: "invalid", reasons: ["validator-unavailable"], needsElevation: false }
    if (v?.validateScript) { try { verdict = v.validateScript(decision.script, { shell: decision.shell }) } catch {} }
    const autoRun = verdict.safe && verdict.risk === "low" && decision.reversible !== false
    return { verdict, autoRun }
  })()
}

async function runShell(decision, { confirm = false } = {}) {
  const c = await load("../shell/connector.js")
  if (!c?.runScript) throw new Error("executor-unavailable")
  return c.runScript(decision.script, { shell: decision.shell, confirm })
}

async function remember(history, summary) {
  const W = 8
  if (history.length <= W) return { history, summary }
  const drop = history.slice(0, history.length - W), keep = history.slice(-W)
  const rolled = await reason([
    { role: "system", content: "Summarize the dialogue into short factual notes (goals, decisions, facts)." },
    { role: "user", content: (summary ? `Previous:\n${summary}\n\n` : "") + drop.map(m => `${m.role}: ${m.content}`).join("\n") },
  ]).catch(() => summary)
  return { history: keep, summary: rolled || summary }
}

export async function think({ input, history = [], summary = "", os, files = [], onToken, confirm = false, select, dataDir } = {}) {
  const context = []
  if (summary) context.push({ role: "system", content: `Conversation summary:\n${summary}` })
  const g = await ground(input); if (g) context.push({ role: "system", content: g })
  if (os) context.push({ role: "system", content: `User OS: ${os}` })

  // Опознаём вложенные файлы (например, снимок системы).
  let uploaded = null
  if (files?.length) {
    const snap = await load("./snapshot.js")
    for (const f of files) {
      try {
        const id = await snap?.identify(f.path ?? f.content ?? f)
        if (id?.recognized) {
          uploaded = id
          context.push({ role: "system", content: `User uploaded a Nyx snapshot: machine "${id.machine}", created ${id.createdAt}, ${id.appCount} apps, settings ${id.hasSettings ? "included" : "absent"}, data folders: ${id.dataFolders.map(d => `${d.key} ${d.human || ""}`).join(", ") || "none"}. Propose restoring it if the user wants.` })
        }
      } catch {}
    }
  }

  context.push(...history, { role: "user", content: input })
  const d = await decide(context)

  // ── Разговор ──
  if (d.mode === "chat") {
    const reply = d.reply ?? d.thought
    onToken?.(reply)
    const mem = await remember([...history, { role: "user", content: input }, { role: "assistant", content: reply }], summary)
    return { type: "chat", reply, ...mem }
  }

  // ── Снимок / перенос системы ──
  if (d.mode === "snapshot") {
    const snap = await load("./snapshot.js")
    if (!snap) { const reply = d.reply || d.thought; onToken?.(reply); return { type: "chat", reply, history, summary } }
    const op = d.snapshotOp || (uploaded ? "restore" : "capture")

    if (op === "capture") {
      const res = await snap.capture({})
      const sum = snap.summarize(res.blueprint)
      const message = await narrate(input,
        "You just created a portable snapshot file of this machine. Tell the user its file name and size; that it contains the list of installed apps, system settings and a catalog of their data folders with sizes; that NO personal files are inside (only a list, so it is safe); that they should download and keep it; and that when they reinstall Windows or move to a new PC they simply send this file back here and you will restore everything step by step with their confirmation. Then briefly state how many apps and the data folder sizes.",
        { file: { name: res.blueprint.name, size: res.human }, summary: sum })
      onToken?.(message)
      const mem = await remember([...history, { role: "user", content: input }, { role: "assistant", content: message }], summary)
      return { type: "file", file: { path: res.path, name: path.basename(res.path), size: res.size, human: res.human }, summary: sum, message, ...mem }
    }

    const source = uploaded?.snapshot
    if (!source) {
      const message = await narrate(input, "The user wants to restore or transfer, but no snapshot file is attached yet. Ask them to send here the small snapshot file created earlier, and explain in one line what it is.", null)
      onToken?.(message)
      return { type: "chat", reply: message, history, summary }
    }
    const steps = snap.plan(source, { select })
    if (!confirm) {
      const message = await narrate(input,
        "Explain the restore plan step by step so the user fully trusts it: 1) first a Windows restore point is created as a safety net so everything can be rolled back; 2) the chosen apps are installed silently from official sources; 3) system settings are applied; 4) chosen data folders are copied. Make clear nothing runs until they confirm, and they can pick which apps and which data. Be concrete about counts and sizes.",
        { steps, snapshot: snap.summarize(source) })
      onToken?.(message)
      return { type: "proposal", steps, message, resume: { files, select } }
    }
    const done = await snap.restore(source, { confirm: true, select, dataDir })
    const message = await narrate(input, "Report the restore result step by step: what succeeded and what needs attention. Be concrete and honest.", { results: done.results })
    onToken?.(message)
    return { type: "done", results: done.results, message }
  }

  // ── Действие на компьютере ──
  const { verdict, autoRun } = await gate(d)
  if (!verdict.safe) {
    const message = await narrate(input, `The requested command was blocked by the safety validator. Explain briefly why and offer a safer alternative. Reasons: ${(verdict.reasons || []).join("; ")}`, null)
    onToken?.(message)
    return { type: "chat", reply: message, history, summary }
  }
  if (!autoRun && !confirm) {
    return { type: "proposal", plan: d.plan || d.thought, message: d.reply || d.plan || d.thought, script: d.script, shell: d.shell, purpose: d.purpose, risk: verdict.risk, needsElevation: verdict.needsElevation, reasons: verdict.reasons, resume: { input, history, summary, os } }
  }
  let result = await runShell(d, { confirm }).catch(e => ({ executed: false, error: String(e?.message || e) }))
  if (result?.executed && result.code !== 0) {
    const fix = await decide([...context, { role: "user", content: `The command failed (code ${result.code}). Output:\n${((result.stdout || "") + (result.stderr || "")).slice(0, 6000)}\nFix it and return a new act decision.` }])
    if (fix.mode === "act" && fix.script) { const g2 = await gate(fix); if (g2.verdict.safe && (g2.autoRun || confirm)) result = await runShell(fix, { confirm: true }).catch(e => ({ executed: false, error: String(e?.message || e) })) }
  }
  const message = await narrate(input, "Explain the result of the executed command concisely and concretely.",
    { command: d.script, executed: result?.executed, code: result?.code, output: ((result?.stdout || "") + (result?.stderr || "")).slice(0, 4000), note: result?.dryRun ? result.reason : (result?.blocked ? "blocked by validator" : undefined) })
  onToken?.(message)
  const mem = await remember([...history, { role: "user", content: input }, { role: "assistant", content: message }], summary)
  try { const M = await import("./metrics.js"); if (result && result.executed && result.code === 0) { M.track("task_done"); M.track("activated") } else if (result && result.blocked) M.track("blocked_danger") } catch {}
    return { type: "action", ok: result?.executed && result?.code === 0, result, message, ...mem }
}

export default { think }
