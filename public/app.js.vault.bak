// Nyx Copilot UI — multi-chat state, neuro-naming, quick actions, PC widgets.
// All state is local (localStorage).
// The whole UI follows the language chosen on the main site (localStorage 'nyx.lang'),
// so the chat is NEVER half-English/half-Russian — it speaks ONE language end to end.
const $ = (s) => document.querySelector(s)
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e }
const esc = (s) => String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]))
const linkify = (s) => esc(s).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')

// ---------- i18n ----------
// Single source of truth for every visible string. Read the language picked on
// the landing page; default to English. Supported: en, ru, uk, es, de, fr.
const SUPPORTED = ["en", "ru", "uk", "es", "de", "fr"]
function readLang() {
  let l = "en"
  try { l = localStorage.getItem("nyx.lang") || "en" } catch (e) {}
  return SUPPORTED.includes(l) ? l : "en"
}
let LANG = readLang()

const I18N = {
  en: {
    newChat: "New chat", copilot: "Nyx Copilot", site: "← Site",
    placeholder: "Ask anything — in any language…",
    hint: "Nyx runs locally. Everything stays encrypted on your device",
    footL: "On-device AI · nothing leaves your machine", footR: "© 2026 Nyx — Bohdan (AARON4IK)",
    emptyTitle: "How can I help?",
    emptyDesc: "On-device AI operator for your PC. Write in any language — I reply in yours.",
    qSpecsT: "Scan Device Specifications", qSpecsS: "Collect live CPU, RAM, GPU & disks",
    qUpdateT: "Trigger Windows Update", qUpdateS: "Run the Windows update scan playbook",
    nDiag: "Device diagnostics", nUpdate: "Windows update", nSecurity: "Nyx security", nModel: "QVAC / model", nNew: "New chat",
    echoSpecs: "📋 Show full device specifications", echoUpdate: "🔄 Update Windows",
    updateStarted: "Windows update scan started.", opened: "⚙️  Opened: ", unavailable: "unavailable", failed: "failed",
    src: "Source: ",
    serverHint: " No connection to the local Nyx server. Run: npm start — then open http://localhost:3000/app",
    wTitle: " Device specifications", wCpuLoad: "CPU load", wCores: "cores", wRamUse: "RAM",
    wCpu: "CPU", wGpu: "GPU", wRam: "RAM", wFree: "free", wDisks: "Disks", wBoard: "Motherboard", wBios: "BIOS", wDx: "DirectX", wOs: "OS", wArch: "Architecture", wUptime: "Uptime", h: "h",
    btnSettings: "⚙️  Open Windows system settings", btnUpdates: "🔄 Check for updates",
    bAuto: " Automatically", bManual: "🧮 Manually (calculator)", yes: " Yes", cancel: "✕ Cancel",
    exec: "▶ Execute", execCancel: "Okay — cancelled, nothing was executed.",
    sendAuto: "Automatically, do it for me", sendManual: "I want to enter manually", sendYes: "yes", sendCancel: "cancel",
    blocked: " Blocked by validator: ",
    dryRun: "⚙️ Autonomous execution is disabled (NYX_ALLOW_EXEC=0). By default Nyx runs confirmed actions itself; set NYX_ALLOW_EXEC=1 to re-enable.",
    doneAdmin: " Done — executed with administrator rights (exit 0)", done0: " Done (exit 0)", doneCmd: ". Command executed.",
    uacDeclined: "\n\n You declined the Windows (UAC) prompt. Press Execute again and confirm the dialog — then I'll do it myself.",
    timeoutHint: "\n\n The command didn't finish in time (the UAC prompt may have waited too long). Try again.",
    privHint: "\n\n Administrator rights were missing. Press Execute again — a Windows (UAC) prompt will appear; confirm it and I'll run the command myself.",
    failTitle: " Failed", timeoutWord: " (timeout)", codeWord: " (exit ", noOutput: "(no output)",
    mbActive: (n) => `Offline model active on-device: <b>${n}</b> — answers come from the QVAC SDK, no cloud.`,
    mbNoSdk: "QVAC SDK not installed — the local Nyx brain is answering. To enable the full on-device model: <code style=\"background:#fff;padding:1px 6px;border-radius:6px\">npm run model</code>, then restart.",
    mbNotDl: "Model not downloaded yet — Nyx is answering with its local brain. Download once (needs internet): <code style=\"background:#fff;padding:1px 6px;border-radius:6px\">npm run model</code>, then restart.",
    mbRecheck: "Check again",
  },
  ru: {
    newChat: "Новый чат", copilot: "Nyx Copilot", site: "← На сайт",
    placeholder: "Спросите что угодно — на любом языке…",
    hint: "Nyx работает локально. Всё шифруется на вашем устройстве",
    footL: "ИИ на устройстве · ничего не покидает ваш ПК", footR: "© 2026 Nyx — Bohdan (AARON4IK)",
    emptyTitle: "Чем помочь?",
    emptyDesc: "ИИ-оператор на устройстве для вашего ПК. Пишите на любом языке — отвечу на нём же.",
    qSpecsT: "Сканировать характеристики", qSpecsS: "Собрать живые данные CPU, RAM, GPU и диски",
    qUpdateT: "Обновить Windows", qUpdateS: "Запустить проверку обновлений Windows",
    nDiag: "Диагностика устройства", nUpdate: "Обновление Windows", nSecurity: "Безопасность Nyx", nModel: "QVAC / модель", nNew: "Новый чат",
    echoSpecs: "📋 Показать полные характеристики устройства", echoUpdate: "🔄 Обновить Windows",
    updateStarted: "Запущен поиск обновлений Windows.", opened: "⚙️  Открыл: ", unavailable: "недоступно", failed: "не удалось",
    src: "Источник: ",
    serverHint: " Нет связи с локальным сервером Nyx. Запустите: npm start — и откройте http://localhost:3000/app",
    wTitle: " Характеристики устройства", wCpuLoad: "Загрузка CPU", wCores: "ядер", wRamUse: "RAM",
    wCpu: "Процессор", wGpu: "GPU", wRam: "ОЗУ", wFree: "свободно", wDisks: "Диски", wBoard: "Мат. плата", wBios: "BIOS", wDx: "DirectX", wOs: "ОС", wArch: "Архитектура", wUptime: "Uptime", h: "ч",
    btnSettings: "⚙️  Открыть системные настройки Windows", btnUpdates: "🔄 Проверить обновления",
    bAuto: " Автоматически", bManual: "🧮 Вручную (калькулятор)", yes: " Да", cancel: "✕ Отмена",
    exec: "▶ Выполнить", execCancel: "Окей — отменил, ничего не выполнял.",
    sendAuto: "Автоматически, поставь за меня", sendManual: "Хочу зайти вручную", sendYes: "да", sendCancel: "отмена",
    blocked: " Заблокировано валидатором: ",
    dryRun: "⚙️ Автономное выполнение отключено (NYX_ALLOW_EXEC=0). По умолчанию Nyx выполняет подтверждённые действия сам; задай NYX_ALLOW_EXEC=1, чтобы снова включить.",
    doneAdmin: " Готово — выполнил с правами администратора (код 0)", done0: " Готово (код 0)", doneCmd: ". Команда выполнена.",
    uacDeclined: "\n\n Ты отклонил запрос Windows (UAC). Нажми «Выполнить» ещё раз и подтверди окно — тогда я всё сделаю сам.",
    timeoutHint: "\n\n Команда не успела завершиться (возможно, ждали подтверждения UAC слишком долго). Попробуй ещё раз.",
    privHint: "\n\n Не хвати��о прав администратора. Нажми «Выполнить» ещё раз — появится ��апрос Windows (UAC), подтверди его, и я выполню команду сам.",
    failTitle: " Не удалось", timeoutWord: " (таймаут)", codeWord: " (код ", noOutput: "(нет вывода)",
    mbActive: (n) => `Офлайн-модель активна на устройстве: <b>${n}</b> — ответы генерирует QVAC SDK, без облака.`,
    mbNoSdk: "QVAC SDK не установлен — сейчас отвечает локальный мозг Nyx. Чтобы включить полноценную модель на устройстве: <code style=\"background:#fff;padding:1px 6px;border-radius:6px\">npm run model</code>, затем перезапусти.",
    mbNotDl: "Модель ещё не скачана — Nyx отвечает локальным мозгом. Скачай один раз (нужен интернет): <code style=\"background:#fff;padding:1px 6px;border-radius:6px\">npm run model</code>, затем перезапусти.",
    mbRecheck: "Проверить снова",
  },
  uk: {
    newChat: "Новий чат", copilot: "Nyx Copilot", site: "← На сайт",
    placeholder: "Спитайте будь-що — будь-якою мовою…",
    hint: "Nyx працює локально. Усе шифрується на вашому пристрої",
    footL: "ШІ на пристрої · ніщо не залишає ваш ПК", footR: "© 2026 Nyx — Bohdan (AARON4IK)",
    emptyTitle: "Чим допомогти?",
    emptyDesc: "ШІ-оператор на пристрої для вашого ПК. Пишіть будь-якою мовою — відповім нею ж.",
    qSpecsT: "Сканувати характеристики", qSpecsS: "Зібрати живі дані CPU, RAM, GPU та диски",
    qUpdateT: "Оновити Windows", qUpdateS: "Запустити перевірку оновлень Windows",
    nDiag: "Діагностика пристрою", nUpdate: "Оновлення Windows", nSecurity: "Безпека Nyx", nModel: "QVAC / модель", nNew: "Новий чат",
    echoSpecs: "📋 Показати повні характеристики пристрою", echoUpdate: "🔄 Оновити Windows",
    updateStarted: "Запущено пошук оновлень Windows.", opened: "⚙️  Відкрив: ", unavailable: "недоступно", failed: "не вдалося",
    src: "Джерело: ",
    serverHint: " Немає звʼязку з локальним сервером Nyx. Запустіть: npm start — і відкрийте http://localhost:3000/app",
    wTitle: " Характеристики пристрою", wCpuLoad: "Завантаження CPU", wCores: "ядер", wRamUse: "RAM",
    wCpu: "Процесор", wGpu: "GPU", wRam: "ОЗП", wFree: "вільно", wDisks: "Диски", wBoard: "Мат. плата", wBios: "BIOS", wDx: "DirectX", wOs: "ОС", wArch: "Архітектура", wUptime: "Uptime", h: "г",
    btnSettings: "⚙️  Відкрити системні налаштування Windows", btnUpdates: "🔄 Перевірити оновлення",
    bAuto: " Автоматично", bManual: "🧮 Вручну (калькулятор)", yes: " Так", cancel: "✕ Скасувати",
    exec: "▶ Виконати", execCancel: "Гаразд — скасував, нічого не виконував.",
    sendAuto: "Автоматично, зроби за мене", sendManual: "Хочу ввести вручну", sendYes: "так", sendCancel: "скасування",
    blocked: " Заблоковано валідатором: ",
    dryRun: "⚙️ Автономне виконання вимкнено (NYX_ALLOW_EXEC=0). За замовчуванням Nyx виконує підтверджені дії сам; задай NYX_ALLOW_EXEC=1, щоб знову увімкнути.",
    doneAdmin: " Готово — виконав з правами адміністратора (код 0)", done0: " Готово (код 0)", doneCmd: ". Команду виконано.",
    uacDeclined: "\n\n Ти відхилив запит Windows (UAC). Натисни «Виконати» ще раз і підтверди вікно — тоді я все зроблю сам.",
    timeoutHint: "\n\n Команда не встигла завершитися. Спробуй ще раз.",
    privHint: "\n\n Не вистачило прав адміністратора. Натисни «Виконати» ще раз — зʼявиться запит Windows (UAC), підтверди його.",
    failTitle: " Не вдалося", timeoutWord: " (таймаут)", codeWord: " (код ", noOutput: "(немає виводу)",
    mbActive: (n) => `Офлайн-модель активна на пристрої: <b>${n}</b> — відповіді генерує QVAC SDK, без хмари.`,
    mbNoSdk: "QVAC SDK не встановлено — зараз відповідає локальний мозок Nyx. Щоб увімкнути повноцінну модель: <code style=\"background:#fff;padding:1px 6px;border-radius:6px\">npm run model</code>, потім перезапусти.",
    mbNotDl: "Модель ще не завантажено — Nyx відповідає локальним мозком. Завантаж один раз (потрібен інтернет): <code style=\"background:#fff;padding:1px 6px;border-radius:6px\">npm run model</code>, потім перезапусти.",
    mbRecheck: "Перевірити знову",
  },
  es: {
    newChat: "Nuevo chat", copilot: "Nyx Copilot", site: "← Sitio",
    placeholder: "Pregunta lo que sea — en cualquier idioma…",
    hint: "Nyx funciona localmente. Todo se cifra en tu dispositivo",
    footL: "IA en el dispositivo · nada sale de tu máquina", footR: "© 2026 Nyx — Bohdan (AARON4IK)",
    emptyTitle: "¿En qué puedo ayudar?",
    emptyDesc: "Operador de IA en el dispositivo para tu PC. Escribe en cualquier idioma — respondo en el tuyo.",
    qSpecsT: "Escanear especificaciones", qSpecsS: "Recoger CPU, RAM, GPU y discos en vivo",
    qUpdateT: "Actualizar Windows", qUpdateS: "Ejecutar la búsqueda de actualizaciones de Windows",
    nDiag: "Diagnóstico del dispositivo", nUpdate: "Actualización de Windows", nSecurity: "Seguridad de Nyx", nModel: "QVAC / modelo", nNew: "Nuevo chat",
    echoSpecs: "📋 Mostrar especificaciones completas", echoUpdate: "🔄 Actualizar Windows",
    updateStarted: "Búsqueda de actualizaciones de Windows iniciada.", opened: "⚙️  Abierto: ", unavailable: "no disponible", failed: "falló",
    src: "Fuente: ",
    serverHint: " Sin conexión con el servidor local de Nyx. Ejecuta: npm start — y abre http://localhost:3000/app",
    wTitle: " Especificaciones del dispositivo", wCpuLoad: "Carga de CPU", wCores: "núcleos", wRamUse: "RAM",
    wCpu: "CPU", wGpu: "GPU", wRam: "RAM", wFree: "libre", wDisks: "Discos", wBoard: "Placa base", wBios: "BIOS", wDx: "DirectX", wOs: "SO", wArch: "Arquitectura", wUptime: "Tiempo activo", h: "h",
    btnSettings: "⚙️  Abrir configuración de Windows", btnUpdates: "🔄 Buscar actualizaciones",
    bAuto: " Automáticamente", bManual: "🧮 Manual (calculadora)", yes: " Sí", cancel: "✕ Cancelar",
    exec: "▶ Ejecutar", execCancel: "De acuerdo — cancelado, no se ejecutó nada.",
    sendAuto: "Automáticamente, hazlo por mí", sendManual: "Quiero hacerlo manualmente", sendYes: "sí", sendCancel: "cancelar",
    blocked: " Bloqueado por el validador: ",
    dryRun: "⚙️ La ejecución autónoma está desactivada (NYX_ALLOW_EXEC=0). Por defecto Nyx ejecuta por sí mismo las acciones confirmadas; define NYX_ALLOW_EXEC=1 para reactivarla.",
    doneAdmin: " Listo — ejecutado con permisos de administrador (código 0)", done0: " Listo (código 0)", doneCmd: ". Comando ejecutado.",
    uacDeclined: "\n\n Rechazaste el aviso de Windows (UAC). Pulsa Ejecutar otra vez y confirma el cuadro — entonces lo haré yo mismo.",
    timeoutHint: "\n\n El comando no terminó a tiempo. Inténtalo de nuevo.",
    privHint: "\n\n Faltaban permisos de administrador. Pulsa Ejecutar otra vez — aparecerá el aviso de Windows (UAC); confírmalo.",
    failTitle: " Falló", timeoutWord: " (tiempo agotado)", codeWord: " (código ", noOutput: "(sin salida)",
    mbActive: (n) => `Modelo offline activo en el dispositivo: <b>${n}</b> — las respuestas las genera el QVAC SDK, sin nube.`,
    mbNoSdk: "QVAC SDK no instalado — ahora responde el cerebro local de Nyx. Para activar el modelo completo: <code style=\"background:#fff;padding:1px 6px;border-radius:6px\">npm run model</code>, luego reinicia.",
    mbNotDl: "Modelo aún no descargado — Nyx responde con su cerebro local. Descárgalo una vez (necesita internet): <code style=\"background:#fff;padding:1px 6px;border-radius:6px\">npm run model</code>, luego reinicia.",
    mbRecheck: "Comprobar de nuevo",
  },
  de: {
    newChat: "Neuer Chat", copilot: "Nyx Copilot", site: "← Seite",
    placeholder: "Frag alles — in jeder Sprache…",
    hint: "Nyx läuft lokal. Alles wird auf dem Gerät verschlüsselt",
    footL: "KI auf dem Gerät · nichts verlässt deinen Rechner", footR: "© 2026 Nyx — Bohdan (AARON4IK)",
    emptyTitle: "Wie kann ich helfen?",
    emptyDesc: "On-Device-KI-Operator für deinen PC. Schreib in jeder Sprache — ich antworte in deiner.",
    qSpecsT: "Gerätespezifikationen scannen", qSpecsS: "CPU, RAM, GPU & Laufwerke live erfassen",
    qUpdateT: "Windows aktualisieren", qUpdateS: "Windows-Update-Suche ausführen",
    nDiag: "Gerätediagnose", nUpdate: "Windows-Update", nSecurity: "Nyx-Sicherheit", nModel: "QVAC / Modell", nNew: "Neuer Chat",
    echoSpecs: "📋 Vollständige Gerätespezifikationen anzeigen", echoUpdate: "🔄 Windows aktualisieren",
    updateStarted: "Windows-Update-Suche gestartet.", opened: "⚙️  Geöffnet: ", unavailable: "nicht verfügbar", failed: "fehlgeschlagen",
    src: "Quelle: ",
    serverHint: " Keine Verbindung zum lokalen Nyx-Server. Starte: npm start — und öffne http://localhost:3000/app",
    wTitle: " Gerätespezifikationen", wCpuLoad: "CPU-Last", wCores: "Kerne", wRamUse: "RAM",
    wCpu: "CPU", wGpu: "GPU", wRam: "RAM", wFree: "frei", wDisks: "Laufwerke", wBoard: "Mainboard", wBios: "BIOS", wDx: "DirectX", wOs: "OS", wArch: "Architektur", wUptime: "Laufzeit", h: "h",
    btnSettings: "⚙️  Windows-Einstellungen öffnen", btnUpdates: "🔄 Nach Updates suchen",
    bAuto: " Automatisch", bManual: "🧮 Manuell (Rechner)", yes: " Ja", cancel: "✕ Abbrechen",
    exec: "▶ Ausführen", execCancel: "Okay — abgebrochen, nichts wurde ausgeführt.",
    sendAuto: "Automatisch, mach es für mich", sendManual: "Ich möchte manuell einsteigen", sendYes: "ja", sendCancel: "abbrechen",
    blocked: " Vom Validator blockiert: ",
    dryRun: "⚙️ Autonome Ausführung ist deaktiviert (NYX_ALLOW_EXEC=0). Standardmäßig führt Nyx bestätigte Aktionen selbst aus; setze NYX_ALLOW_EXEC=1, um sie wieder zu aktivieren.",
    doneAdmin: " Fertig — mit Administratorrechten ausgeführt (Code 0)", done0: " Fertig (Code 0)", doneCmd: ". Befehl ausgeführt.",
    uacDeclined: "\n\n Du hast die Windows-Abfrage (UAC) abgelehnt. Drücke erneut Ausführen und bestätige den Dialog — dann erledige ich es selbst.",
    timeoutHint: "\n\n Der Befehl wurde nicht rechtzeitig fertig. Versuch es erneut.",
    privHint: "\n\n Administratorrechte fehlten. Drücke erneut Ausführen — die Windows-Abfrage (UAC) erscheint; bestätige sie.",
    failTitle: " Fehlgeschlagen", timeoutWord: " (Timeout)", codeWord: " (Code ", noOutput: "(keine Ausgabe)",
    mbActive: (n) => `Offline-Modell aktiv auf dem Gerät: <b>${n}</b> — Antworten kommen vom QVAC SDK, ohne Cloud.`,
    mbNoSdk: "QVAC SDK nicht installiert — aktuell antwortet das lokale Nyx-Gehirn. Zum Aktivieren des vollen Modells: <code style=\"background:#fff;padding:1px 6px;border-radius:6px\">npm run model</code>, dann neu starten.",
    mbNotDl: "Modell noch nicht heruntergeladen — Nyx antwortet mit seinem lokalen Gehirn. Einmal laden (Internet nötig): <code style=\"background:#fff;padding:1px 6px;border-radius:6px\">npm run model</code>, dann neu starten.",
    mbRecheck: "Erneut prüfen",
  },
  fr: {
    newChat: "Nouveau chat", copilot: "Nyx Copilot", site: "← Site",
    placeholder: "Demandez n'importe quoi — dans n'importe quelle langue…",
    hint: "Nyx fonctionne localement. Tout est chiffré sur votre appareil",
    footL: "IA locale · rien ne quitte votre machine", footR: "© 2026 Nyx — Bohdan (AARON4IK)",
    emptyTitle: "Comment puis-je aider ?",
    emptyDesc: "Opérateur IA local pour votre PC. Écrivez dans n'importe quelle langue — je réponds dans la vôtre.",
    qSpecsT: "Scanner les spécifications", qSpecsS: "Collecter CPU, RAM, GPU & disques en direct",
    qUpdateT: "Mettre à jour Windows", qUpdateS: "Lancer la recherche de mises à jour Windows",
    nDiag: "Diagnostic de l'appareil", nUpdate: "Mise à jour Windows", nSecurity: "Sécurité Nyx", nModel: "QVAC / modèle", nNew: "Nouveau chat",
    echoSpecs: "📋 Afficher les spécifications complètes", echoUpdate: "🔄 Mettre à jour Windows",
    updateStarted: "Recherche de mises à jour Windows lancée.", opened: "⚙️  Ouvert : ", unavailable: "indisponible", failed: "échec",
    src: "Source : ",
    serverHint: " Pas de connexion au serveur local Nyx. Lancez : npm start — puis ouvrez http://localhost:3000/app",
    wTitle: " Spécifications de l'appareil", wCpuLoad: "Charge CPU", wCores: "cœurs", wRamUse: "RAM",
    wCpu: "CPU", wGpu: "GPU", wRam: "RAM", wFree: "libre", wDisks: "Disques", wBoard: "Carte mère", wBios: "BIOS", wDx: "DirectX", wOs: "OS", wArch: "Architecture", wUptime: "Disponibilité", h: "h",
    btnSettings: "⚙️  Ouvrir les paramètres Windows", btnUpdates: "🔄 Vérifier les mises à jour",
    bAuto: " Automatiquement", bManual: "🧮 Manuel (calculatrice)", yes: " Oui", cancel: "✕ Annuler",
    exec: "▶ Exécuter", execCancel: "D'accord — annulé, rien n'a été exécuté.",
    sendAuto: "Automatiquement, fais-le pour moi", sendManual: "Je veux entrer manuellement", sendYes: "oui", sendCancel: "annuler",
    blocked: " Bloqué par le validateur : ",
    dryRun: "⚙️ L'exécution autonome est désactivée (NYX_ALLOW_EXEC=0). Par défaut, Nyx exécute lui-même les actions confirmées ; définissez NYX_ALLOW_EXEC=1 pour la réactiver.",
    doneAdmin: " Terminé — exécuté avec les droits administrateur (code 0)", done0: " Terminé (code 0)", doneCmd: ". Commande exécutée.",
    uacDeclined: "\n\n Vous avez refusé l'invite Windows (UAC). Appuyez encore sur Exécuter et confirmez la boîte — je m'en occupe alors moi-même.",
    timeoutHint: "\n\n La commande n'a pas fini à temps. Réessayez.",
    privHint: "\n\n Droits administrateur manquants. Appuyez encore sur Exécuter — l'invite Windows (UAC) apparaîtra ; confirmez-la.",
    failTitle: " Échec", timeoutWord: " (délai dépassé)", codeWord: " (code ", noOutput: "(aucune sortie)",
    mbActive: (n) => `Modèle hors ligne actif sur l'appareil : <b>${n}</b> — les réponses viennent du QVAC SDK, sans cloud.`,
    mbNoSdk: "QVAC SDK non installé — le cerveau local de Nyx répond. Pour activer le modèle complet : <code style=\"background:#fff;padding:1px 6px;border-radius:6px\">npm run model</code>, puis redémarrez.",
    mbNotDl: "Modèle pas encore téléchargé — Nyx répond avec son cerveau local. Téléchargez une fois (internet requis) : <code style=\"background:#fff;padding:1px 6px;border-radius:6px\">npm run model</code>, puis redémarrez.",
    mbRecheck: "Vérifier à nouveau",
  },
}
const T = () => I18N[LANG] || I18N.en
const t = (k) => { const v = T()[k]; return v == null ? (I18N.en[k] ?? "") : v }

// Exactly two high-utility action nodes (localized).
const QUICK = () => [
  { ic: "📋", t: t("qSpecsT"), s: t("qSpecsS"), action: "specs" },
  { ic: "🔄", t: t("qUpdateT"), s: t("qUpdateS"), action: "update" },
]

// ---------- store ----------
let DB = JSON.parse(localStorage.getItem("nyx.chats") || "null") || { chats: [], active: null }
const save = () => localStorage.setItem("nyx.chats", JSON.stringify(DB))
const uid = () => Math.random().toString(36).slice(2, 9)
function newChat() {
  const c = { id: uid(), title: t("nNew"), icon: "💬", msgs: [], named: false }
  DB.chats.unshift(c); DB.active = c.id; save()
  // Context isolation: a brand-new chat id for isolated per-chat memory.
  fetch("/api/chat/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chatId: c.id }) }).catch(() => {})
  render(); renderThread()
}
const active = () => DB.chats.find((c) => c.id === DB.active)

// neuro-naming: derive a clean title + icon from the first user message.
// Detection matches keywords across languages; the resulting TITLE is localized.
function neuroName(text) {
  const tt = text.toLowerCase()
  const sym = text.match(/\b([A-Z]{3,5})\s*[\/\-]?\s*(USDT|USD₮|USD)\b/i)
  if (/(характерист|желез|cpu|gpu|ram|диск|specs|диагнос|устройств|spec|diagnos|gerät|appareil|dispositiv)/i.test(tt)) return { icon: "", title: t("nDiag") }
  if (/(windows|обнов|онов|update|систем|aktualis|mise à jour|actualiz)/i.test(tt)) return { icon: "🔄", title: t("nUpdate") }
  if (/(безопас|security|proof|приват|шифр|sicherheit|sécurit|seguridad|безпек)/i.test(tt)) return { icon: "", title: t("nSecurity") }
  if (/(qvac|модел|llm|сдк|sdk|model|modèle|modell|modelo)/i.test(tt)) return { icon: "🧩", title: t("nModel") }
  let title = text.trim().split(/\s+/).slice(0, 5).join(" ")
  if (title.length > 34) title = title.slice(0, 34) + "…"
  return { icon: "💬", title: title || t("nNew") }
}

// ---------- sidebar ----------
function render() {
  const box = $("#chats"); box.innerHTML = ""
  DB.chats.forEach((c) => {
    const it = el("div", "chat-item" + (c.id === DB.active ? " active" : ""))
    it.innerHTML = `<span class="ic">${c.icon}</span><span class="tt">${esc(c.title)}</span><span class="del">✕</span>`
    it.onclick = (e) => { if (e.target.classList.contains("del")) { delChat(c.id); return } DB.active = c.id; save(); render(); renderThread(); closeSide() }
    box.appendChild(it)
  })
}
function delChat(id) {
  fetch("/api/chat/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chatId: id }) }).catch(() => {})
  DB.chats = DB.chats.filter((c) => c.id !== id)
  if (DB.active === id) DB.active = DB.chats[0]?.id || null
  if (!DB.chats.length) newChat(); else { save(); render(); renderThread() }
}

// ---------- thread ----------
function renderThread() {
  const c = active(); const thread = $("#thread"); thread.innerHTML = ""
  $("#title").textContent = c ? c.title : t("copilot")
  if (!c) return
  if (!c.msgs.length) { thread.appendChild(emptyState()); return }
  c.msgs.forEach((m) => thread.appendChild(bubble(m)))
  scrollDown()
}
function emptyState() {
  const wrap = el("div", "empty")
  wrap.appendChild(el("div", "hi", "✦"))
  wrap.appendChild(el("h1", null, esc(t("emptyTitle"))))
  wrap.appendChild(el("p", null, esc(t("emptyDesc"))))
  const q = el("div", "quick")
  QUICK().forEach((b) => {
    const btn = el("button", "qbtn")
    btn.innerHTML = `<span class="qi">${b.ic}</span><span>${esc(b.t)}<span class="qs">${esc(b.s)}</span></span>`
    btn.onclick = () => { if (b.action === "specs") runSpecs(); else if (b.action === "update") runUpdate(); else sendText(b.send) }
    q.appendChild(btn)
  })
  wrap.appendChild(q)
  return wrap
}
function bubble(m) {
  const row = el("div", "msg " + (m.role === "user" ? "you" : "bot"))
  row.appendChild(el("div", "av", m.role === "user" ? "👤" : "✦"))
  const b = el("div", "bubble")
  if (m.widget) { b.appendChild(renderWidget(m.widget)) } else { b.innerHTML = linkify(m.text) }
  if (m.sources?.length) b.appendChild(el("span", "src", t("src") + m.sources.map(esc).join(", ")))
  if (m.actions?.length) {
    const a = el("div", "actions")
    m.actions.forEach((ac) => { const x = el("button", "act" + (ac.kind ? " " + ac.kind : ""), esc(ac.label)); x.onclick = () => ac.run(); a.appendChild(x) })
    b.appendChild(a)
  }
  row.appendChild(b)
  return row
}

// ---------- widgets (PC specs) ----------
function donut(pct, color) {
  pct = Math.max(0, Math.min(100, pct || 0))
  const r = 26, c = 2 * Math.PI * r, off = c * (1 - pct / 100)
  return `<svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="#eef3f9" stroke-width="8"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle" font-size="14" font-weight="700" fill="#0a0e14">${Math.round(pct)}%</text></svg>`
}
function renderWidget(w) {
  const { specs, latency, risk } = w
  const wrap = el("div")
  wrap.appendChild(el("div", null, `<b>${esc(t("wTitle"))}</b>`))
  const g = el("div", "widgets")
  const cpu = el("div", "wcard"); cpu.innerHTML = `<h4>${esc(t("wCpuLoad"))}</h4><div class="donut">${donut(specs.cpuLoadPct ?? 0, "#2f8bfd")}<div><div class="big">${specs.cores} ${esc(t("wCores"))}</div></div></div>`
  const ram = el("div", "wcard"); ram.innerHTML = `<h4>${esc(t("wRamUse"))}</h4><div class="donut">${donut(specs.ramUsedPct ?? 0, "#1f6fe0")}<div><div class="big">${specs.ramGB} GB</div></div></div>`
  g.appendChild(cpu); g.appendChild(ram)
  wrap.appendChild(g)
  const rows = el("div", "wcard"); rows.style.marginTop = "12px"
  const R = (k, v) => v ? `<div class="spec-row"><b>${esc(k)}</b><span>${esc(String(v))}</span></div>` : ""
  rows.innerHTML = R(t("wCpu"), specs.cpu) + R(t("wGpu"), [].concat(specs.gpu || []).join(", ")) +
    R(t("wRam"), specs.ramGB ? specs.ramGB + " GB (" + t("wFree") + " " + (specs.ramFreeGB ?? "?") + ")" : "") +
    R(t("wDisks"), (specs.disks || []).map((d) => d.model + " " + d.sizeGB + "GB").join("; ")) +
    R(t("wBoard"), specs.board) + R(t("wBios"), specs.bios) + R(t("wDx"), specs.directX) +
    R(t("wOs"), specs.osBuild) + R(t("wArch"), specs.arch) + R(t("wUptime"), specs.uptimeH ? specs.uptimeH + " " + t("h") : "")
  wrap.appendChild(rows)
  // Optional connection latency (shown only if the backend provides it):
  // the backend no longer probes any exchange.
  if (latency && (latency.ms != null || latency.ok === false)) {
    const lat = el("div", "wcard"); lat.style.marginTop = "12px"
    const v = latency.ms != null ? latency.ms + " ms" : t("unavailable")
    lat.innerHTML = R(t("wLatency"), v + (latency.host ? " · " + latency.host : ""))
    wrap.appendChild(lat)
  }
  if (risk && Array.isArray(risk.warnings) && risk.warnings.length) {
    const rk = el("div", "wcard"); rk.style.marginTop = "12px"
    rk.innerHTML = risk.warnings.map((wn) => `<div class="spec-row"><span>${esc(String(wn))}</span></div>`).join("")
    wrap.appendChild(rk)
  }
  const a = el("div", "actions")
  const set = el("button", "act", esc(t("btnSettings"))); set.onclick = () => openSettings("")
  const upd = el("button", "act", esc(t("btnUpdates"))); upd.onclick = () => runUpdate()
  a.appendChild(set); a.appendChild(upd); wrap.appendChild(a)
  return wrap
}

// ---------- actions to backend ----------
async function runSpecs() {
  const c = active(); if (!c) return
  pushMsg("user", { text: t("echoSpecs") }); maybeName(c, "specs device")
  const tp = showTyping()
  try { const r = await fetch("/api/system/specs").then((x) => x.json()); tp.remove(); pushMsg("bot", { widget: r, mode: "system" }) }
  catch { tp.remove(); pushMsg("bot", { text: serverHint() }) }
}
async function runUpdate() {
  const c = active(); if (!c) return
  pushMsg("user", { text: t("echoUpdate") }); maybeName(c, "windows update")
  const tp = showTyping()
  try { const r = await fetch("/api/system/update", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((x) => x.json()); tp.remove()
    pushMsg("bot", { text: r.ok ? (r.note || t("updateStarted")) : (" " + (r.error || t("failed"))), mode: "system" }) }
  catch { tp.remove(); pushMsg("bot", { text: serverHint() }) }
}
async function openSettings(pane) {
  try { const r = await fetch("/api/system/open-settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pane }) }).then((x) => x.json())
    pushMsg("bot", { text: r.ok ? (t("opened") + r.opened) : (" " + (r.error || t("unavailable"))), mode: "system" }) }
  catch { pushMsg("bot", { text: serverHint() }) }
}
const serverHint = () => t("serverHint")

// ---------- chat send ----------
function pushMsg(role, payload) { const c = active(); if (!c) return; c.msgs.push({ role, ...payload }); save(); renderThread() }
function maybeName(c, basis) { if (!c.named) { const n = neuroName(basis); c.title = n.title; c.icon = n.icon; c.named = true; save(); render(); $("#title").textContent = c.title } }
function showTyping() { const thread = $("#thread"); const row = el("div", "msg bot"); row.appendChild(el("div", "av", "✦")); const tp = el("div", "typing", "<i></i><i></i><i></i>"); row.appendChild(tp); thread.appendChild(row); scrollDown(); return row }
function scrollDown() { const s = $("#scroll"); s.scrollTop = s.scrollHeight }

// Output cleansing: strip backend state markers / role tags before render.
const cleanOut = (s) => String(s || "").replace(/^\s*(system|assistant|user)\s*[:>]\s*/i, "").replace(/\bbroker:[a-z_]+\b/gi, "").replace(/<\/?(system|assistant)>/gi, "").trim()

async function sendText(text) {
  const c = active(); if (!c || !text.trim()) return
  pushMsg("user", { text })
  maybeName(c, text)
  const tp = showTyping()
  try {
    // Per-chat isolated memory: send only THIS chat's prior turns (no cross-chat leak).
    const hist = c.msgs.slice(0, -1).filter((m) => m.text && !m.widget).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: cleanOut(m.text) })).slice(-8)
    // Tell the backend which language to answer in (the one chosen on the site).
    const body = { q: text, chatId: c.id, history: hist }
    const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json())
    tp.remove()
    const msg = { role: "bot", text: cleanOut(r.text || r.error || "…"), sources: r.sources, mode: r.mode }
    // surface backend quick-replies as buttons
    if (r.mode && r.mode.startsWith("broker:choose_mode")) msg.actions = [
      { label: t("bAuto"), kind: "primary", run: () => sendText(t("sendAuto")) },
      { label: t("bManual"), run: () => sendText(t("sendManual")) },
    ]
    if (r.mode && (r.mode.includes("draft_order") || r.mode.includes("confirm_final"))) msg.actions = [
      { label: t("yes"), kind: "primary", run: () => sendText(t("sendYes")) },
      { label: t("cancel"), kind: "danger", run: () => sendText(t("sendCancel")) },
    ]
    // Real PC action: show an Execute button that runs the proposed command
    // through the local exec endpoint (only after the user confirms).
    if (r.mode === "action-proposal" && r.proposal && r.proposal.script) msg.actions = [
      { label: t("exec"), kind: "primary", run: () => execProposal(r.proposal) },
      { label: t("cancel"), kind: "danger", run: () => pushMsg("bot", { text: t("execCancel") }) },
    ]
    pushMsg("bot", msg)
  } catch { tp.remove(); pushMsg("bot", { text: serverHint() }) }
}

// Execute a confirmed action proposal through the local exec endpoint.
async function execProposal(p) {
  const tp = showTyping()
  try {
    const r = await fetch("/api/agent/exec", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ script: p.script, shell: p.shell, confirm: true }) }).then((x) => x.json())
    tp.remove()
    if (r.blocked) { pushMsg("bot", { text: t("blocked") + ((r.verdict && r.verdict.reasons) || []).join("; ") }); return }
    if (r.dryRun) { pushMsg("bot", { text: t("dryRun") }); return }
    const out = [r.stdout, r.stderr].filter(Boolean).join("\n").trim()
    // Honest result: a non-zero exit code (or timeout) is a FAILURE, not success.
    if (r.code === 0 && !r.timedOut) {
      const head = r.elevated ? t("doneAdmin") : t("done0")
      pushMsg("bot", { text: head + (out ? ":\n\n" + out.slice(0, 4000) : t("doneCmd")) })
    } else {
      let hint = ""
      if (/UAC_DECLINED|cancell|отклон/i.test(out) || r.code === 1223) hint = t("uacDeclined")
      else if (r.timedOut) hint = t("timeoutHint")
      else if (/win32exception|access|denied|отказан|администрат|elevat|0x8|requires|privilege/i.test(out) || r.code === 1) hint = t("privHint")
      const codeStr = r.timedOut ? t("timeoutWord") : (t("codeWord") + r.code + ")")
      pushMsg("bot", { text: t("failTitle") + codeStr + ":\n\n" + (out || t("noOutput")).slice(0, 4000) + hint })
    }
  } catch { tp.remove(); pushMsg("bot", { text: serverHint() }) }
}

// ---------- static localization (sidebar / topbar / composer / footer) ----------
function localizeStatic() {
  document.documentElement.lang = LANG
  const nc = $("#newchat"); if (nc) nc.textContent = "＋ " + t("newChat")
  const ttl = $("#title"); if (ttl && (!active())) ttl.textContent = t("copilot")
  const inp = $("#input"); if (inp) inp.placeholder = t("placeholder")
  const hint = document.querySelector(".composer .hint"); if (hint) hint.textContent = t("hint")
  const sl = document.querySelector(".sitelink"); if (sl) sl.textContent = t("site")
  const foot = document.querySelectorAll(".appfoot span")
  if (foot && foot.length >= 3) { foot[0].textContent = t("footL"); foot[2].textContent = t("footR") }
}

// ---------- wiring ----------
const input = $("#input")
function grow() { input.style.height = "auto"; input.style.height = Math.min(160, input.scrollHeight) + "px" }
input.addEventListener("input", grow)
input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); fire() } })
$("#send").onclick = fire
function fire() { const v = input.value.trim(); if (!v) return; input.value = ""; grow(); sendText(v) }
$("#newchat").onclick = newChat
$("#burger").onclick = () => { $("#side").classList.toggle("open"); $("#scrim").classList.toggle("show") }
const closeSide = () => { $("#side").classList.remove("open"); $("#scrim").classList.remove("show") }
$("#scrim").onclick = closeSide

localizeStatic()
if (!DB.chats.length) newChat(); else { render(); renderThread() }

// If the user changes the language on the main site (another tab), keep the chat in sync.
window.addEventListener("storage", (e) => {
  if (e.key === "nyx.lang") { const nl = readLang(); if (nl !== LANG) { LANG = nl; localizeStatic(); render(); renderThread(); checkModel() } }
})
// Also re-sync language when returning to this tab (e.g. after switching on the site).
window.addEventListener("focus", () => { const nl = readLang(); if (nl !== LANG) { LANG = nl; localizeStatic(); render(); renderThread() } })

// ---------- on-device model status banner (real, live check) ----------
// Honestly reflects whether the offline QVAC model is installed & ready, and
// updates the moment the user downloads or removes it (poll + on focus).
async function checkModel() {
  const bar = $("#modelbar"); if (!bar) return
  const baseWarn = "display:flex;align-items:center;gap:10px;margin:10px 16px 0;padding:9px 13px;border-radius:11px;font-size:13px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;flex-wrap:wrap"
  const recheckBtn = `<button id="mb-recheck" style="margin-left:auto;border:1px solid #fed7aa;background:#fff;border-radius:8px;padding:4px 10px;color:#9a3412;font-weight:600">${esc(t("mbRecheck"))}</button>`
  try {
    const r = await fetch("/api/model/status").then((x) => x.json())
    if (r && r.ready) {
      const name = String(r.model || "on-device model").replace(/^qvac:/, "")
      bar.style.cssText = "display:flex;align-items:center;gap:10px;margin:10px 16px 0;padding:9px 13px;border-radius:11px;font-size:13px;background:#eafaf1;border:1px solid #b7ebc9;color:#15803d"
      bar.innerHTML = `<b>●</b><span>${t("mbActive")(esc(name))}</span>`
    } else if (r && !r.sdkInstalled) {
      bar.style.cssText = baseWarn
      bar.innerHTML = `<b></b><span>${t("mbNoSdk")}</span>` + recheckBtn
    } else {
      bar.style.cssText = baseWarn
      bar.innerHTML = `<b>⬇️</b><span>${t("mbNotDl")}</span>` + recheckBtn
    }
    const rc = document.getElementById("mb-recheck"); if (rc) rc.onclick = checkModel
  } catch { bar.style.display = "none" }
}
checkModel()
setInterval(checkModel, 20000)
window.addEventListener("focus", checkModel)

// ---------- rename chat (double-click the title in the sidebar) ----------
(function(){
  var box=document.getElementById("chats"); if(!box) return;
  box.addEventListener("dblclick",function(e){
    if(e.target.classList && e.target.classList.contains("del")) return;
    var it=e.target.closest(".chat-item"); if(!it) return;
    var tt=it.querySelector(".tt"); if(!tt) return;
    var idx=Array.prototype.indexOf.call(box.children,it); if(idx<0) return;
    var c=DB.chats[idx]; if(!c) return;
    tt.setAttribute("contenteditable","true"); tt.focus();
    var s=window.getSelection(), rg=document.createRange(); rg.selectNodeContents(tt); s.removeAllRanges(); s.addRange(rg);
    function commit(){
      tt.removeAttribute("contenteditable");
      var v=(tt.textContent||"").trim().slice(0,60);
      c.title=v||c.title; c.named=true; save(); render(); renderThread();
      tt.removeEventListener("blur",commit); tt.removeEventListener("keydown",key);
    }
    function key(ev){ if(ev.key==="Enter"){ev.preventDefault();tt.blur();} else if(ev.key==="Escape"){tt.textContent=c.title;tt.blur();} }
    tt.addEventListener("blur",commit); tt.addEventListener("keydown",key);
  });
})();
