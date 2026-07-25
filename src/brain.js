// Nyx "brain": a compact, multilingual knowledge engine used as the on-device
// fallback responder so the bot is fast, never empty, and actually knowledgeable.
// Real model (when @qvac/sdk is installed) augments this; offline this answers alone.

import { detectLang } from "./lang.js"

// NOTE on honesty: this build claims only what it actually ships. Speech (TTS)
// and OCR are NOT implemented, so they are not advertised here. WDK settlement
// is scaffolding, so it is described as "on the roadmap", not as shipped.

// Each topic: id, match keywords (any language), and localized answers.
const TOPICS = [
	{
		id: "what-is-nyx",
		kw: ["nyx", "хайв", "что такое", "що таке", "what is", "who are you", "кто ты", "хто ти", "about", "qué es", "was ist", "qu'est"],
		en: "Nyx is a local-first, fully on-device AI assistant built on Tether QVAC. Every token of inference runs on your machine — zero cloud calls. It combines a multi-agent reasoner, retrieval-augmented answers over your local docs, proof-of-local-inference (a signed log proving nothing left the device), a network firewall that blocks unapproved egress, and autonomous OS actions you confirm with one click.",
		ru: "Nyx — это local-first AI-ассистент, который работает полностью на вашем устройстве на Tether QVAC. Каждый токен инференса считается локально — ноль обращений в облако. Внутри: мультиагентный рассуждатель, ответы с опорой на локальные документы (RAG), proof-of-local-inference (подписанный лог-доказательство, что данные не покидали устройство), сетевой фаервол, блокирующий неразрешённый трафик, и автономные действия в ОС, которые вы подтверждаете одним кликом.",
		uk: "Nyx — це local-first AI-асистент, який працює повністю на вашому пристрої на Tether QVAC. Кожен токен інференсу обчислюється локально — нуль запитів у хмару. Усередині: мультиагентний реасонер, відповіді на основі локальних документів (RAG), proof-of-local-inference та автономні дії в ОС, які ви підтверджуєте одним кліком.",
		es: "Nyx es un asistente de IA local-first que se ejecuta totalmente en tu dispositivo sobre Tether QVAC. Cada token de inferencia se procesa localmente, sin llamadas a la nube. Incluye razonamiento multiagente, respuestas basadas en documentos locales (RAG), prueba de inferencia local firmada y acciones autónomas del sistema que confirmas con un clic.",
		de: "Nyx ist ein local-first KI-Assistent, der vollständig auf deinem Gerät auf Basis von Tether QVAC läuft. Jeder Inferenz-Token wird lokal berechnet — keine Cloud-Aufrufe. Enthält Multi-Agent-Reasoning, Antworten auf Basis lokaler Dokumente (RAG), signierten Proof-of-Local-Inference sowie autonome OS-Aktionen, die du mit einem Klick bestätigst.",
		fr: "Nyx est un assistant IA local-first qui s'exécute entièrement sur votre appareil avec Tether QVAC. Chaque token d'inférence est calculé localement, sans appel au cloud. Il inclut un raisonnement multi-agents, des réponses fondées sur vos documents locaux (RAG), une preuve d'inférence locale signée et des actions système autonomes que vous confirmez d'un clic.",
	},
	{
		id: "languages",
		kw: ["language", "язык", "мов", "languages", "multilingual", "idioma", "sprache", "langue", "translate", "перевод"],
		en: "I detect your language automatically and reply in it. I currently speak English, Russian, Ukrainian, Spanish, German and French — just write in any of them, or use the language switcher in the chat header.",
		ru: "Я автоматически определяю язык и отвечаю на нём. Сейчас я говорю на русском, украинском, английском, испанском, немецком и французском — пишите на любом из них или переключите язык в шапке чата.",
		uk: "Я автоматично визначаю мову і відповідаю нею. Зараз я розмовляю українською, російською, англійською, іспанською, німецькою та французькою — пишіть будь-якою або перемкніть мову у шапці чату.",
		es: "Detecto tu idioma automáticamente y respondo en él. Hablo inglés, ruso, ucraniano, español, alemán y francés — escribe en cualquiera o usa el selector de idioma en la cabecera del chat.",
		de: "Ich erkenne deine Sprache automatisch und antworte darin. Ich spreche Englisch, Russisch, Ukrainisch, Spanisch, Deutsch und Französisch — schreib einfach, oder nutze die Sprachauswahl in der Chat-Kopfzeile.",
		fr: "Je détecte votre langue automatiquement et réponds dans celle-ci. Je parle anglais, russe, ukrainien, espagnol, allemand et français — écrivez dans l'une d'elles ou utilisez le sélecteur de langue dans l'en-tête du chat.",
	},
	{
		id: "qvac",
		kw: ["qvac", "sdk", "on-device", "edge", "модел", "model", "inference", "инференс", "llama"],
		en: "QVAC (Tether's Verifiable AI Compute) is the SDK that runs LLMs directly on-device via the Bare runtime. Nyx uses loadModel/completion for streaming chat and embed for retrieval — all offline, no cloud. It prefers Qwen3-4B-Instruct and falls back to Llama 3.2, run quantized with TurboQuant for speed.",
		ru: "QVAC (Verifiable AI Compute от Tether) — это SDK, который запускает LLM прямо на устройстве через рантайм Bare. Nyx использует loadModel/completion для потокового чата и embed для поиска по документам — всё офлайн, без облака. Предпочитает Qwen3-4B-Instruct с откатом на Llama 3.2, квантованные с TurboQuant для скорости.",
		uk: "QVAC (Verifiable AI Compute від Tether) — це SDK, який запускає LLM прямо на пристрої через рантайм Bare. Nyx використовує loadModel/completion для потокового чату та embed для пошуку по документах — усе офлайн, без хмари.",
		es: "QVAC (Verifiable AI Compute de Tether) es el SDK que ejecuta LLM directamente en el dispositivo mediante el runtime Bare. Nyx usa loadModel/completion para el chat en streaming y embed para la recuperación de documentos, todo sin conexión ni nube.",
		de: "QVAC (Verifiable AI Compute von Tether) ist das SDK, das LLMs direkt auf dem Gerät über die Bare-Runtime ausführt. Nyx nutzt loadModel/completion für Streaming-Chat und embed für die Dokumentsuche — alles offline, ohne Cloud.",
		fr: "QVAC (Verifiable AI Compute de Tether) est le SDK qui exécute des LLM directement sur l'appareil via le runtime Bare. Nyx utilise loadModel/completion pour le chat en streaming et embed pour la recherche documentaire, le tout hors ligne, sans cloud.",
	},
	{
		id: "security",
		kw: ["security", "безопас", "безпек", "privacy", "приват", "poli", "proof", "firewall", "injection", "netguard", "attestation", "довер", "verify"],
		en: "Trust is provable, not promised: (1) NetGuard hooks the network stack, default-denies egress, and logs evidence that zero unapproved (non-allowlisted) connections happened — the only allowed host is loopback, every call recorded; (2) Proof-of-Local-Inference signs every answer into an Ed25519 hash-chain you can verify with `npm run verify`; (3) an injection firewall scans retrieved context for prompt-injection before it reaches the model.",
		ru: "Доверие доказуемо, а не обещается: (1) NetGuard перехватывает сетевой стек и пишет доказательство, что не было ни одного не-loopback соединения; (2) Proof-of-Local-Inference подписывает каждый ответ в хеш-цепочку Ed25519, которую можно проверить `npm run verify`; (3) injection-фаервол проверяет контекст на prompt-injection до модели.",
		uk: "Довіра доводиться, а не обіцяється: (1) NetGuard перехоплює мережевий стек і пише доказ, що не було жодного не-loopback з'єднання; (2) Proof-of-Local-Inference підписує кожну відповідь у хеш-ланцюг Ed25519 (`npm run verify`); (3) injection-фаервол перевіряє контекст до моделі.",
		es: "La confianza se demuestra: (1) NetGuard intercepta la red y registra evidencia de cero conexiones no-loopback; (2) Proof-of-Local-Inference firma cada respuesta en una cadena hash Ed25519 verificable con `npm run verify`; (3) un firewall de inyección revisa el contexto antes del modelo.",
		de: "Vertrauen wird bewiesen: (1) NetGuard überwacht den Netzwerk-Stack und schreibt Nachweise über null Nicht-Loopback-Verbindungen; (2) Proof-of-Local-Inference signiert jede Antwort in eine Ed25519-Hash-Kette (`npm run verify`); (3) eine Injection-Firewall prüft den Kontext vor dem Modell.",
		fr: "La confiance se prouve : (1) NetGuard surveille la pile réseau et enregistre la preuve de zéro connexion non-loopback ; (2) Proof-of-Local-Inference signe chaque réponse dans une chaîne de hachage Ed25519 (`npm run verify`) ; (3) un pare-feu anti-injection vérifie le contexte avant le modèle.",
	},
	{
		id: "capabilities",
		kw: ["умеешь", "умеете", "что ты можешь", "можешь ли", "способн", "ты умный", "умный ли", "ты тупой", "ты глуп", "smart", "intelligent", "what can you do", "can you do", "abilities", "capabilit", "skills", "помоги", "help me", "на что способ", "функци", "возможност", "вмієш", "що ти вмієш"],
		en: "A lot — and all on your own device. I can scan live hardware (CPU/RAM/GPU/disks, load, temps), diagnose and fix real PC problems by generating and safely running PowerShell/Bash, open Windows Settings and trigger Windows Update. So yes — I'm built to actually do things, not just chat. What do you need?",
		ru: "Много чего — и всё прямо на вашем устройстве. Могу сканировать живое железо (CPU/RAM/GPU/диски, загрузку, температуры), диагностировать и чинить реальные проблемы ПК, генерируя и безопасно запуская PowerShell/Bash, открывать настройки Windows и запускать обновление. Так что да — я создан реально делать дела, а не просто болтать. Что нужно сделать?",
		uk: "Багато чого — і все прямо на вашому пристрої. Можу сканувати живе залізо (CPU/RAM/GPU/диски, навантаження, температури), діагностувати й лагодити реальні проблеми ПК, генеруючи та безпечно запускаючи PowerShell/Bash, відкривати налаштування Windows і запускати оновлення. Тож так — я створений реально робити справи, а не просто балакати. Що потрібно зробити?",
	},
	{
		id: "creator",
		kw: ["кто тебя создал", "кто создал", "кто автор", "кто сделал", "твой создатель", "разработчик", "who made you", "who created", "who built", "your creator", "developer", "aaron4ik", "bohdan", "хто тебе створив", "хто автор"],
		en: "I was built by Bohdan (AARON4IK) for the Tether QVAC project, on top of Tether's QVAC on-device AI stack. Everything runs locally on your machine — no cloud.",
		ru: "Меня создал Bohdan (AARON4IK) для проекта Tether QVAC, на базе on-device AI-стека Tether QVAC. Всё работает локально на вашем устройстве, без облака.",
		uk: "Мене створив Bohdan (AARON4IK) для проекта Tether QVAC, на базі on-device AI-стека Tether QVAC. Усе працює локально на вашому пристрої, без хмари.",
	},
	{
		id: "howareyou",
		kw: ["как дела", "как ты", "как настроение", "how are you", "how's it going", "how do you do", "як справи", "як ти", "как сам"],
		en: "Running great — fully local, light on CPU, and ready to work. More to the point: how can I help? I can check your PC's health, fix an issue.",
		ru: "Всё отлично — работаю полностью локально, почти не гружу процессор и готов к делу. Главное — чем помочь? Могу проверить состояние ПК, починить проблему.",
		uk: "Усе чудово — працюю повністю локально, майже не навантажую процесор і готовий до роботи. Головне — чим допомогти? Можу перевірити стан ПК, полагодити проблему.",
	},
	{
		id: "thanks",
		kw: ["спасибо", "благодар", "thanks", "thank you", "thx", "дякую", "спс", "красава", "молодец"],
		en: "Anytime! If anything else comes up with your PC, just say the word.",
		ru: "Обращайтесь в любой момент! Если что-то ещё понадобится по ПК — просто скажите.",
		uk: "Звертайтеся будь-коли! Якщо ще щось знадобиться по ПК — просто скажіть.",
	},
	{
		id: "joke",
		kw: ["анекдот", "пошути", "шутк", "joke", "расскажи шутку", "пожарт", "funny"],
		en: "Why did the neural net refuse to leave the house? It was scared of overfitting to the outside world. 😄 Anyway — anything I can do on your PC?",
		ru: "Почему нейросеть отказалась выходить из дома? Боялась переобучиться на внешнем мире. 😄 Ну а если серьёзно — что сделать по ПК?",
		uk: "Чому нейромережа відмовилася виходити з дому? Боялася перенавчитися на зовнішньому світі. 😄 А якщо серйозно — що зробити по ПК?",
	},
]

// Honest no-match fallback. This fires ONLY when the on-device QVAC model is not
// loaded AND the query matched no known topic/skill. It must NOT pretend to be a
// general AI — instead it tells the user how to enable full reasoning and what
// genuinely works offline right now. (When the QVAC model IS loaded, the LLM
// handles every free-form query and this text is never shown.)
const FALLBACK = {
	en: "To answer this freely I use my on-device QVAC model — it isn't loaded yet, so I won't fake an answer. Enable full local reasoning with `npm run model` (one-time download, then 100% offline). Even without it I can do real work now: scan your hardware, report uptime, and write + run a safe PowerShell/Bash fix on your confirmation. Try an action like \"show my specs\", \"free up disk space\" or \"change the time to 14:30\".",
	ru: "Чтобы свободно ответить на это, мне нужна локальная модель QVAC — она ещё не загружена, и я не буду выдумывать ответ. Включи полноценные локальные рассуждения командой `npm run model` (разовая загрузка, дальше всё офлайн). Но и без неё я реально умею: просканировать железо, показать аптайм, написать и выполнить безопасную команду PowerShell/Bash по твоему подтверждению. Сформулируй как действие — например: «покажи характеристики», «освободи место на диске» или «смени время на 14:30».",
	uk: "Щоб вільно відповісти на це, мені потрібна локальна модель QVAC — вона ще не завантажена, і я не вигадуватиму відповідь. Увімкни повноцінні локальні міркування командою `npm run model` (разове завантаження, далі все офлайн). Але й без неї я справді вмію: просканувати залізо, показати аптайм, написати та виконати безпечну команду PowerShell/Bash за твоїм підтвердженням. Сформулюй як дію — наприклад: «покажи характеристики», «звільни місце на диску» або «зміни час на 14:30».",
	es: "Para responder esto con libertad uso mi modelo QVAC en el dispositivo — aún no está cargado, así que no inventaré una respuesta. Activa el razonamiento local completo con `npm run model` (descarga única, luego 100% offline). Aun así ya puedo hacer cosas reales: escanear tu hardware, mostrar el tiempo activo, y escribir y ejecutar un arreglo seguro de PowerShell/Bash con tu confirmación. Pídelo como una acción: \"muestra mis specs\", \"libera espacio en disco\" o \"cambia la hora a 14:30\".",
	de: "Um das frei zu beantworten, nutze ich mein On-Device-QVAC-Modell — es ist noch nicht geladen, also erfinde ich keine Antwort. Aktiviere volles lokales Reasoning mit `npm run model` (einmaliger Download, danach 100% offline). Auch ohne kann ich echte Arbeit leisten: Hardware scannen, Laufzeit zeigen sowie einen sicheren PowerShell/Bash-Fix schreiben und nach deiner Bestätigung ausführen. Formuliere es als Aktion: \"zeig meine Specs\", \"Speicher freigeben\" oder \"Uhrzeit auf 14:30 ändern\".",
	fr: "Pour répondre librement, j'utilise mon modèle QVAC local — il n'est pas encore chargé, donc je n'inventerai pas de réponse. Active le raisonnement local complet avec `npm run model` (téléchargement unique, puis 100% hors ligne). Même sans lui je fais du concret : scanner le matériel, afficher la disponibilité, et écrire puis exécuter un correctif PowerShell/Bash sûr après ta confirmation. Formule-le comme une action : « montre mes specs », « libère de l'espace disque » ou « change l'heure à 14:30 ».",
}

export function knowledgeAnswer(query, langHint) {
	const lang = langHint || detectLang(query)
	const q = String(query).toLowerCase()
	let best = null
	let bestScore = 0
	for (const topic of TOPICS) {
		let score = 0
		for (const k of topic.kw) if (q.includes(k)) score += k.length > 3 ? 2 : 1
		if (score > bestScore) { bestScore = score; best = topic }
	}
	// Require a confident match (a real keyword hit, not an incidental short substring)
	// so vague/gibberish input lands on the engaging fallback, never a wrong topic.
	const text = best && bestScore >= 2 ? best[lang] || best.en : FALLBACK[lang] || FALLBACK.en
	return { text, lang, topic: best?.id || "fallback", score: bestScore }
}
