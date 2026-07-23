// ────────────────────────────────────────────────────────────────────────────
// On-device Software Operator
// Превращает естественный запрос ("скачай Стим", "install discord",
// "обнови всё", "удали spotify") в ОДНУ проверенную команду winget, которую Nyx
// выполняет ЛОКАЛЬНО. Без браузера, без удалённого управления, без облака —
// winget сам находит и ставит пакет на машине пользователя. Модели больше не
// нужно "придумывать", как поставить софт: это детерминированная опора,
// которую она вызывает.
// ────────────────────────────────────────────────────────────────────────────

// Тихие, безынтерактивные флаги (документированы Microsoft). --silent + оба
// agreement-флага = ноль prompt'ов; UAC для machine-scope установщиков остаётся
// — это единственное подтверждение, которое мы СОЗНАТЕЛЬНО сохраняем (Zero-Trust).
const WINGET_FLAGS = "-e --silent --accept-package-agreements --accept-source-agreements"

// Каталог самых частых приложений → точные winget ID. Точный --id делает
// установку 100% детерминированной (нет двусмысленности, не тот пакет).
// Всё, чего тут нет, уходит в live `winget` best-match (см. buildSoftwareCommand).
export const CATALOG = [
  { id: "Valve.Steam",                 name: "Steam",             aliases: ["steam", "стим", "стім"] },
  { id: "Google.Chrome",               name: "Google Chrome",     aliases: ["chrome", "хром", "гугл хром", "google chrome"] },
  { id: "Mozilla.Firefox",             name: "Firefox",           aliases: ["firefox", "фаерфокс", "файрфокс", "мозила", "мозилла"] },
  { id: "Brave.Brave",                 name: "Brave",             aliases: ["brave", "брейв", "брэйв"] },
  { id: "Microsoft.Edge",              name: "Microsoft Edge",    aliases: ["edge", "эдж"] },
  { id: "Discord.Discord",             name: "Discord",           aliases: ["discord", "дискорд"] },
  { id: "Telegram.TelegramDesktop",    name: "Telegram",          aliases: ["telegram", "телеграм", "телега", "tg"] },
  { id: "WhatsApp.WhatsApp",           name: "WhatsApp",          aliases: ["whatsapp", "ватсап", "вотсап"] },
  { id: "Zoom.Zoom",                   name: "Zoom",              aliases: ["zoom", "зум"] },
  { id: "Spotify.Spotify",             name: "Spotify",           aliases: ["spotify", "спотифай", "спотифи"] },
  { id: "VideoLAN.VLC",                name: "VLC",               aliases: ["vlc", "влц"] },
  { id: "OBSProject.OBSStudio",        name: "OBS Studio",        aliases: ["obs", "обс"] },
  { id: "EpicGames.EpicGamesLauncher", name: "Epic Games",        aliases: ["epic", "эпик", "epic games"] },
  { id: "Nvidia.GeForceExperience",    name: "GeForce Experience",aliases: ["geforce experience", "джифорс", "geforce"] },
  { id: "Microsoft.VisualStudioCode",  name: "VS Code",           aliases: ["vscode", "vs code", "visual studio code", "вскод", "вс код"] },
  { id: "Git.Git",                     name: "Git",               aliases: ["git", "гит"] },
  { id: "OpenJS.NodeJS",               name: "Node.js",           aliases: ["node", "nodejs", "node.js", "нода"] },
  { id: "Python.Python.3.12",          name: "Python",            aliases: ["python", "питон", "пайтон"] },
  { id: "7zip.7zip",                   name: "7-Zip",             aliases: ["7zip", "7-zip", "архиватор"] },
  { id: "Notepad++.Notepad++",         name: "Notepad++",         aliases: ["notepad++", "нотпад"] },
  { id: "Microsoft.PowerToys",         name: "PowerToys",         aliases: ["powertoys", "повертойс"] },
  { id: "Google.GoogleDrive",          name: "Google Drive",      aliases: ["google drive", "гугл диск"] },
]

const norm = (s) => (s || "").toLowerCase().trim()

// Глаголы-операции (RU/UK/EN) + шумовые слова, которые вырезаем из названия.
const RE_INSTALL   = /\b(установ(и|ить)|постав(ь|ить)|скач(ай|ать)|качни|загруз(и|ить)|инстал+(ируй|ировать|ь)?|download|install|get\s+me|set\s+up|встанови(ти)?|завантаж(ити|)?)\b/i
const RE_UNINSTALL = /\b(удал(и|ить)|снеси|снести|деинстал+(ируй|ировать|ь)?|uninstall|remove|видали(ти)?)\b/i
const RE_UPGRADE   = /\b(обнов(и|ить)|апдейт(ни)?|upgrade|update|онови(ти)?)\b/i
const RE_ALL       = /\b(вс[её]|все\s+(программ|приложен|проги)|all\s+(apps|packages|programs)|everything)\b/i
const STOP         = /\b(пожалуйста|please|мне|мой|моя|для\s+меня|программу|приложение|app|application|прогу|срочно|быстро|на\s+пк|на\s+компьютер|давай)\b/gi

/** Определяет операцию с софтом и вычленяет название приложения. */
export function detectSoftwareIntent(query) {
  const q = String(query || "")
  let op = null
  if (RE_UNINSTALL.test(q)) op = "uninstall"
  else if (RE_UPGRADE.test(q)) op = RE_ALL.test(q) ? "upgrade-all" : "upgrade"
  else if (RE_INSTALL.test(q)) op = "install"
  if (!op) return null
  if (op === "upgrade-all") return { op, appQuery: null }

  const app = q
    .replace(RE_INSTALL, " ").replace(RE_UNINSTALL, " ").replace(RE_UPGRADE, " ")
    .replace(STOP, " ")
    .replace(/[«»"'`.,!?]/g, " ")
    .replace(/\s+/g, " ").trim()
  return { op, appQuery: app || null }
}

/** Точное сопоставление названия с каталогом (сначала alias==, потом вхождение). */
export function resolveFromCatalog(appQuery) {
  const q = norm(appQuery)
  if (!q) return null
  for (const app of CATALOG) if (app.aliases.some((a) => a === q)) return app
  for (const app of CATALOG) if (app.aliases.some((a) => q.includes(a))) return app
  return null
}

/**
 * Строит ОДНУ команду winget под запрос. Возвращает { shell, script, risk, ... }
 * совместимо с твоим validator/diagnose-конвейером. risk:"elevated" => Nyx всегда
 * спросит подтверждение (это не bypass безопасности).
 */
export function buildSoftwareCommand(intent) {
  if (!intent || !intent.op) return null
  const { op, appQuery } = intent

  if (op === "upgrade-all") {
    return {
      shell: "powershell",
      script: `winget upgrade --all ${WINGET_FLAGS}`,
      risk: "elevated",
      title: "Обновить все приложения",
      explanation: "Обновляю все установленные пакеты через winget без всплывающих окон.",
    }
  }

  const hit = resolveFromCatalog(appQuery)
  const verb = op === "uninstall" ? "uninstall" : op === "upgrade" ? "upgrade" : "install"
  const human = op === "uninstall" ? "Удалить" : op === "upgrade" ? "Обновить" : "Установить"

  if (hit) {
    return {
      shell: "powershell",
      script: `winget ${verb} --id ${hit.id} ${WINGET_FLAGS}`,
      risk: "elevated",
      appId: hit.id,
      appName: hit.name,
      title: `${human} ${hit.name}`,
      explanation: `${human} ${hit.name} (winget: ${hit.id}) локально — без браузера и без окон установщика.`,
    }
  }

  if (!appQuery) return null

  // Неизвестное приложение → live best-match самим winget. Если запрос
  // неоднозначный, winget вернёт СПИСОК кандидатов вместо угадывания — Nyx
  // покажет его и попросит выбрать. Никогда не ставит "не тот" пакет вслепую.
  const safeQ = appQuery.replace(/"/g, "")
  return {
    shell: "powershell",
    script: `winget ${verb} "${safeQ}" ${WINGET_FLAGS}`,
    risk: "elevated",
    appName: safeQ,
    ambiguous: true,
    title: `${human}: ${safeQ}`,
    explanation: `Ищу «${safeQ}» в каталоге winget и ${op === "uninstall" ? "удаляю" : "ставлю"} лучшее точное совпадение. Если совпадений несколько — покажу список для выбора.`,
  }
}

/**
 * Честная трактовка кода возврата winget — без фейкового "готово!".
 * Хардкодим только достоверно задокументированные коды; остальное отсылаем к
 * `winget error <code>`, чтобы никогда не врать о результате.
 */
export function interpretWingetCode(code) {
  if (code === 0) return { ok: true, ru: "Готово — пакет установлен/обновлён." }
  if (String(code) === "-1978335189") // APPINSTALLER_CLI_ERROR_UPDATE_NOT_APPLICABLE
    return { ok: true, ru: "Уже стоит последняя версия — ничего менять не пришлось." }
  return { ok: false, ru: `Установщик вернул код ${code}. Детали: winget error ${code}` }
}
