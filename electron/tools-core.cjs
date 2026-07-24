'use strict'
const { spawn } = require('child_process')
const os = require('os'), path = require('path'), fs = require('fs')

const isWin = process.platform === 'win32'
const q = (s) => String(s).replace(/'/g, "''") // экранирование для PS

// Обычный (не-elevated) запуск PowerShell, возвращает stdout
function ps(script) {
  return new Promise((resolve, reject) => {
    if (!isWin) return reject(new Error('Windows only'))
    const b64 = Buffer.from(script, 'utf16le').toString('base64')
    const p = spawn('powershell.exe',
      ['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand', b64],
      { windowsHide: true })
    let out = '', err = ''
    p.stdout.on('data', d => out += d)
    p.stderr.on('data', d => err += d)
    p.on('close', c => c === 0 ? resolve(out) : reject(new Error(err || ('exit ' + c))))
  })
}

// Запуск с UAC (один запрос прав) + потоковый прогресс через NDJSON-файл
function runElevatedStreaming(psBody, onLine) {
  return new Promise((resolve, reject) => {
    if (!isWin) return reject(new Error('Windows only'))
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nyx-'))
    const prog = path.join(dir, 'p.ndjson'), done = path.join(dir, 'done.flag')
    const scriptPath = path.join(dir, 'run.ps1')
    const esc = (s) => s.replace(/\\/g, '\\\\')
    const header = `$ErrorActionPreference='Continue'\n` +
      `function NyxEmit($o){ ($o | ConvertTo-Json -Compress) | Out-File -FilePath '${esc(prog)}' -Append -Encoding utf8 }\n`
    const footer = `\nNew-Item -ItemType File -Path '${esc(done)}' -Force | Out-Null\n`
    fs.writeFileSync(scriptPath, header + psBody + footer, 'utf8')
    fs.writeFileSync(prog, '')
    let pos = 0
    const timer = setInterval(() => {
      try {
        const buf = fs.readFileSync(prog, 'utf8')
        if (buf.length > pos) {
          buf.slice(pos).split(/\r?\n/).filter(Boolean).forEach(l => { try { onLine(JSON.parse(l)) } catch {} })
          pos = buf.length
        }
        if (fs.existsSync(done)) { clearInterval(timer); resolve() }
      } catch {}
    }, 200)
    const launcher = `Start-Process powershell.exe -Verb RunAs -WindowStyle Hidden ` +
      `-ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','${esc(scriptPath)}'`
    ps(launcher).catch(e => { clearInterval(timer); reject(new Error('UAC отклонён или ошибка: ' + e.message)) })
  })
}

// ---- Инструменты ----

// Список установленных Appx-приложений: имя, издатель, реальный размер, логотип
async function listApps() {
  const script = `
$prov = @(Get-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue)
$pkgs = Get-AppxPackage | Where-Object { $_.IsFramework -ne $true -and $_.NonRemovable -ne $true }
$res = foreach($p in $pkgs){
  $size=0; $logo=$null
  if($p.InstallLocation -and (Test-Path $p.InstallLocation)){
    try{ $size=(Get-ChildItem $p.InstallLocation -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum }catch{}
    $man=Join-Path $p.InstallLocation 'AppxManifest.xml'
    if(Test-Path $man){ try{
      [xml]$x=Get-Content $man; $l=$x.Package.Properties.Logo
      if($l){ $c=Join-Path $p.InstallLocation $l
        if(Test-Path $c){ $logo=$c } else {
          $bd=Join-Path $p.InstallLocation ([IO.Path]::GetDirectoryName($l))
          $nm=[IO.Path]::GetFileNameWithoutExtension($l)
          if(Test-Path $bd){ $h=Get-ChildItem $bd -Filter "$nm*" -ErrorAction SilentlyContinue | Select-Object -First 1; if($h){ $logo=$h.FullName } }
        } }
    }catch{} }
  }
  [pscustomobject]@{ id=$p.Name; family=$p.PackageFamilyName; full=$p.PackageFullName;
    publisher=$p.Publisher; sizeBytes=[int64]$size; logo=$logo;
    provisioned=[bool]($prov | Where-Object { $_.DisplayName -eq $p.Name }) }
}
$res | ConvertTo-Json -Depth 3 -Compress`
  const out = await ps(script)
  const arr = JSON.parse(out || '[]')
  return Array.isArray(arr) ? arr : [arr]
}

// Полное задание: (опц.) точка восстановления + Nyx-бэкап, затем удаление — один UAC, живой прогресс
function runRemovalJob({ apps, backupWindows = true, backupNyx = true }, onLine) {
  const json = q(JSON.stringify(apps))
  const body = `
$targets = '${json}' | ConvertFrom-Json
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$desktop = [Environment]::GetFolderPath('Desktop')
NyxEmit @{ type='begin'; total=$targets.Count }
${backupWindows ? `
try{ Enable-ComputerRestore -Drive "$env:SystemDrive\\" -ErrorAction SilentlyContinue
  Checkpoint-Computer -Description "Nyx cleanup $stamp" -RestorePointType 'MODIFY_SETTINGS'
  NyxEmit @{ type='restore-point'; ok=$true } }catch{ NyxEmit @{ type='restore-point'; ok=$false; error=$_.Exception.Message } }` : ''}
${backupNyx ? `
try{ $wg=Join-Path $desktop "nyx-winget-$stamp.json"; winget export -o $wg --accept-source-agreements 2>$null | Out-Null }catch{}
$bf = Join-Path $desktop "nyx-restore-$stamp.json"
@{ created=(Get-Date).ToString('o'); apps=$targets } | ConvertTo-Json -Depth 5 | Out-File $bf -Encoding utf8
NyxEmit @{ type='backup'; file=$bf }` : ''}
$i=0; $freed=0
foreach($t in $targets){
  $i++
  NyxEmit @{ type='item-start'; index=$i; id=$t.id; logo=$t.logo; sizeBytes=$t.sizeBytes }
  try{
    Get-AppxPackage -AllUsers $t.id | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue
    Get-AppxProvisionedPackage -Online | Where-Object { $_.DisplayName -eq $t.id } |
      ForEach-Object { Remove-AppxProvisionedPackage -Online -PackageName $_.PackageName -ErrorAction SilentlyContinue }
    $freed += [int64]$t.sizeBytes
    NyxEmit @{ type='item-done'; index=$i; id=$t.id; ok=$true; freedBytes=$freed }
  }catch{ NyxEmit @{ type='item-done'; index=$i; id=$t.id; ok=$false; error=$_.Exception.Message } }
}
NyxEmit @{ type='complete'; removed=$i; freedBytes=$freed }`
  return runElevatedStreaming(body, onLine)
}

// Реестр-твик (elevated). value авто-типизируется: число -> DWord, строка -> String
function setRegistry({ path: rp, name, value, type = 'DWord' }, onLine = () => {}) {
  const body = `
try{ if(-not (Test-Path '${q(rp)}')){ New-Item -Path '${q(rp)}' -Force | Out-Null }
  New-ItemProperty -Path '${q(rp)}' -Name '${q(name)}' -Value ${typeof value === 'number' ? value : `'${q(value)}'`} -PropertyType ${type} -Force | Out-Null
  NyxEmit @{ type='tweak'; ok=$true; name='${q(name)}' } }
catch{ NyxEmit @{ type='tweak'; ok=$false; error=$_.Exception.Message } }`
  return runElevatedStreaming(body, onLine)
}

// Установка через winget
async function wingetInstall(id) {
  return ps(`winget install --id '${q(id)}' -e --accept-package-agreements --accept-source-agreements --silent`)
}

// Автоматизация: профиль-лаунчер (ярлык на рабочем столе, открывает набор целей)
async function createProfileLauncher({ name, targets = [] }) {
  const lines = targets.map(t => `start "" "${q(t)}"`).join('\r\n')
  const script = `
$desktop=[Environment]::GetFolderPath('Desktop')
$bat=Join-Path $desktop 'nyx-${q(name)}.bat'
@'
@echo off
${lines}
'@ | Out-File $bat -Encoding ascii
$bat`
  return (await ps(script)).trim()
}

// Автоматизация: запуск при старте ПК (ярлык в shell:startup)
async function addToStartup({ name, target }) {
  const script = `
$sp=[Environment]::GetFolderPath('Startup')
$ws=New-Object -ComObject WScript.Shell
$lnk=$ws.CreateShortcut((Join-Path $sp 'nyx-${q(name)}.lnk'))
$lnk.TargetPath='${q(target)}'; $lnk.Save(); 'ok'`
  return ps(script)
}

// Автоматизация: задача по расписанию (elevated)
function scheduleTask({ name, target, time = '18:00' }, onLine = () => {}) {
  const body = `
try{ schtasks /Create /TN 'Nyx\\${q(name)}' /TR '"${q(target)}"' /SC DAILY /ST ${q(time)} /F | Out-Null
  NyxEmit @{ type='task'; ok=$true } }catch{ NyxEmit @{ type='task'; ok=$false; error=$_.Exception.Message } }`
  return runElevatedStreaming(body, onLine)
}

// Готовые сборки: тянем удалённый реестр манифестов + локальный кэш (модель winget)
const REGISTRY_URL = 'https://raw.githubusercontent.com/aar0n4ik/Nyx/main/presets/registry.json'
async function listPresets(userDataDir) {
  const cache = path.join(userDataDir || os.tmpdir(), 'nyx-presets.json')
  try {
    const r = await fetch(REGISTRY_URL, { cache: 'no-store' })
    if (r.ok) { const data = await r.json(); fs.writeFileSync(cache, JSON.stringify(data)); return data }
  } catch {}
  try { return JSON.parse(fs.readFileSync(cache, 'utf8')) } catch {}
  return { presets: [] } // пустое состояние — сборки добавите позже
}

module.exports = {
  isWin, listApps, runRemovalJob, setRegistry, wingetInstall,
  createProfileLauncher, addToStartup, scheduleTask, listPresets, runElevatedStreaming,
}
