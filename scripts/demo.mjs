#!/usr/bin/env node
// scripts/demo.mjs — флагманское демо Nyx: 3 сценария, безопасно, без сети.
// Запуск: node scripts/demo.mjs   (или npm run demo)
process.env.NYX_OFFLINE = "1"

const line = (c = "─") => console.log(c.repeat(60))
const h = (n, t) => { line(); console.log(`СЦЕНАРИЙ ${n} — ${t}`); line() }

async function scenario1() {
  h(1, "Офлайн-мозг, без интернета")
  try {
    const { knowledgeAnswer } = await import("../src/brain.js")
    const q = "What is QVAC and how can Nyx run fully offline on a weak PC?"
    console.log("Вопрос:", q)
    const t0 = Date.now()
    const a = knowledgeAnswer(q)
    const ms = Date.now() - t0
    console.log("Тема:", a?.topic ?? "—")
    console.log("Ответ:", (a?.text ?? "").trim() || "(пусто)")
    console.log(`Офлайн, без сети. Латентность: ${ms} ms`)
  } catch (e) { console.log("НЕ ОК:", e?.message || e) }
}

async function scenario2() {
  h(2, "Снимок системы в один компактный файл")
  try {
    const snap = (await import("../src/core/snapshot.js")).default
    const t0 = Date.now()
    const res = await snap.capture({ sizes: true })
    const s = snap.summarize(res.blueprint)
    console.log(`Файл:            ${res.path}`)
    console.log(`Размер файла:    ${res.human}  (компактно — это НЕ образ диска)`)
    console.log(`Приложений:      ${s.appCount}`)
    console.log(`Папок данных:    ${s.dataFolders.length}, суммарно ${snap.human(s.totalDataBytes)}`)
    const id = await snap.identify(res.path)
    console.log(`Распознан назад: ${id.recognized ? "да, это Nyx-снимок" : "нет"} (v${id.version ?? "?"})`)
    console.log(`Готово за ${Date.now() - t0} ms. Восстановление — только с подтверждением (deny-by-default).`)
  } catch (e) { console.log("НЕ ОК:", e?.message || e) }
}

async function scenario3() {
  h(3, "Безопасность — отказ от опасного, разрешение безопасного")
  try {
    const { validateScript } = await import("../src/shell/validator.js")
    const danger = "Remove-Item -Recurse -Force C:\\Windows\\System32"
    const safe = "Get-ComputerInfo | Select-Object CsName, OsName"
    const d = validateScript(danger, { shell: "powershell", lang: "ru" })
    console.log("Опасная команда:  ", danger)
    console.log(`  → ${d.safe ? "разрешено" : "ЗАБЛОКИРОВАНО"} (risk: ${d.risk})`)
    console.log(`  причина: ${d.reasons.join("; ")}`)
    const g = validateScript(safe, { shell: "powershell", lang: "ru" })
    console.log("Безопасная команда:", safe)
    console.log(`  → ${g.safe && g.risk === "low" ? "разрешено, авто-выполнение" : g.risk}`)
    console.log(!d.safe && g.safe && g.risk === "low" ? "Вывод: защита работает как надо." : "Вывод: проверь валидатор.")
  } catch (e) { console.log("НЕ ОК:", e?.message || e) }
}

console.log("\nNYX — флагманское демо (безопасно, офлайн)\n")
await scenario1()
await scenario2()
await scenario3()
line("═")
console.log("Демо завершено. Всё выше выполнено локально, без интернета.\n")
