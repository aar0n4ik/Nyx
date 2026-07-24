/* Nyx landing: тема (тёмная/светлая) + i18n (en/ru/uk/es/de/fr).
   Разметку НЕ трогает: тексты переводятся по совпадению с англ. оригиналом,
   контролы (тема + меню языков) добавляются в шапку динамически.
   Ключи localStorage: nyx.lang, nyx-theme. */
(function () {
  var SUP = ["en", "ru", "uk", "es", "de", "fr"];
  var LABEL = { en: "EN", ru: "RU", uk: "UK", es: "ES", de: "DE", fr: "FR" };
  var NAME = { en: "English", ru: "Русский", uk: "Українська", es: "Español", de: "Deutsch", fr: "Français" };

  var DICT = {
    en: {
      doc_title: "Nyx — the local AI operator",
      nav_features: "Features", nav_how: "How it works", nav_proof: "Proof", nav_try: "Try it",
      hero_badge: "Local-first · sovereign AI", hero_h1: "Your machine. Your rules. Your AI.",
      hero_sub: "Nyx is a local AI operator that runs on your hardware, plans in the open, and acts only with your permission.",
      hero_cta1: "Launch the app", hero_cta2: "See how it works",
      feat_eyebrow: "Capabilities", feat_h2: "Built to act, not just to chat",
      feat_lead: "Nyx turns intent into verified action on your own machine.",
      feat_c1_t: "Sovereign runtime", feat_c1_d: "Runs fully on your hardware. No data leaves unless you say so.",
      feat_c2_t: "Transparent planning", feat_c2_d: "Every step is written out as a spec before anything executes.",
      feat_c3_t: "Guarded execution", feat_c3_d: "Policy and network guards gate every risky action.",
      how_eyebrow: "How it works", how_h2: "From intent to verified result",
      how_s1_t: "Say the goal", how_s1_d: "Type a plain request like \"Install Steam\".",
      how_s2_t: "Nyx writes a spec", how_s2_d: "It drafts an open, reviewable plan of exact steps.",
      how_s3_t: "You approve", how_s3_d: "Nothing runs until you sign off on the plan.",
      how_s4_t: "It executes safely", how_s4_d: "Guards and validators keep every action in bounds.",
      proof_eyebrow: "Proof", proof_h2: "Evidence, not promises",
      proof_lead: "Every run leaves a signed, auditable trail.",
      proof_m1: "100% local", proof_m2: "0 hidden calls", proof_m3: "Every step signed",
      proof_note: "Cryptographic evidence is written for each executed action.",
      final_eyebrow: "Get started", final_h2: "Take back control of your AI",
      final_p: "Run a sovereign operator that answers to you and no one else.",
      final_cta1: "Launch the app", final_cta2: "Read the docs",
      foot_l: "Nyx — sovereign local AI", foot_r: "Built for people who own their machines"
    },
    ru: {
      doc_title: "Nyx — локальный ИИ-оператор",
      nav_features: "Возможности", nav_how: "Как это работает", nav_proof: "Доказательства", nav_try: "Попробовать",
      hero_badge: "Local-first · суверенный ИИ", hero_h1: "Твоя машина. Твои правила. Твой ИИ.",
      hero_sub: "Nyx — локальный ИИ-оператор: работает на твоём железе, планирует открыто и действует только с твоего разрешения.",
      hero_cta1: "Запустить приложение", hero_cta2: "Как это работает",
      feat_eyebrow: "Возможности", feat_h2: "Создан действовать, а не просто болтать",
      feat_lead: "Nyx превращает намерение в проверенное действие на твоей машине.",
      feat_c1_t: "Суверенный рантайм", feat_c1_d: "Работает полностью на твоём железе. Данные не уходят без твоего согласия.",
      feat_c2_t: "Прозрачное планирование", feat_c2_d: "Каждый шаг расписан как спека до любого запуска.",
      feat_c3_t: "Защищённое исполнение", feat_c3_d: "Политики и сетевые стражи контролируют каждое рискованное действие.",
      how_eyebrow: "Как это работает", how_h2: "От намерения к проверенному результату",
      how_s1_t: "Скажи цель", how_s1_d: "Напиши простой запрос, например «Установи Steam».",
      how_s2_t: "Nyx пишет спеку", how_s2_d: "Составляет открытый, проверяемый план точных шагов.",
      how_s3_t: "Ты подтверждаешь", how_s3_d: "Ничего не выполняется, пока ты не одобришь план.",
      how_s4_t: "Безопасное исполнение", how_s4_d: "Стражи и валидаторы держат каждое действие в рамках.",
      proof_eyebrow: "Доказательства", proof_h2: "Доказательства, а не обещания",
      proof_lead: "Каждый прогон оставляет подписанный, проверяемый след.",
      proof_m1: "100% локально", proof_m2: "0 скрытых вызовов", proof_m3: "Каждый шаг подписан",
      proof_note: "Для каждого выполненного действия пишется криптографическое доказательство.",
      final_eyebrow: "Начать", final_h2: "Верни контроль над своим ИИ",
      final_p: "Запусти суверенного оператора, который отвечает только перед тобой.",
      final_cta1: "Запустить приложение", final_cta2: "Читать документацию",
      foot_l: "Nyx — суверенный локальный ИИ", foot_r: "Для тех, кто владеет своей машиной"
    },
    uk: {
      doc_title: "Nyx — локальний ШІ-оператор",
      nav_features: "Можливості", nav_how: "Як це працює", nav_proof: "Докази", nav_try: "Спробувати",
      hero_badge: "Local-first · суверенний ШІ", hero_h1: "Твоя машина. Твої правила. Твій ШІ.",
      hero_sub: "Nyx — локальний ШІ-оператор: працює на твоєму залізі, планує відкрито і діє лише з твого дозволу.",
      hero_cta1: "Запустити застосунок", hero_cta2: "Як це працює",
      feat_eyebrow: "Можливості", feat_h2: "Створений діяти, а не просто балакати",
      feat_lead: "Nyx перетворює намір на перевірену дію на твоїй машині.",
      feat_c1_t: "Суверенний рантайм", feat_c1_d: "Працює повністю на твоєму залізі. Дані не виходять без твоєї згоди.",
      feat_c2_t: "Прозоре планування", feat_c2_d: "Кожен крок розписаний як специфікація до будь-якого запуску.",
      feat_c3_t: "Захищене виконання", feat_c3_d: "Політики та мережеві вартові контролюють кожну ризиковану дію.",
      how_eyebrow: "Як це працює", how_h2: "Від наміру до перевіреного результату",
      how_s1_t: "Скажи мету", how_s1_d: "Напиши простий запит, наприклад «Встанови Steam».",
      how_s2_t: "Nyx пише специфікацію", how_s2_d: "Складає відкритий, перевірюваний план точних кроків.",
      how_s3_t: "Ти підтверджуєш", how_s3_d: "Нічого не виконується, поки ти не схвалиш план.",
      how_s4_t: "Безпечне виконання", how_s4_d: "Вартові й валідатори тримають кожну дію в межах.",
      proof_eyebrow: "Докази", proof_h2: "Докази, а не обіцянки",
      proof_lead: "Кожен прогін лишає підписаний, аудитований слід.",
      proof_m1: "100% локально", proof_m2: "0 прихованих викликів", proof_m3: "Кожен крок підписано",
      proof_note: "Для кожної виконаної дії пишеться криптографічний доказ.",
      final_eyebrow: "Почати", final_h2: "Поверни контроль над своїм ШІ",
      final_p: "Запусти суверенного оператора, який відповідає лише перед тобою.",
      final_cta1: "Запустити застосунок", final_cta2: "Читати документацію",
      foot_l: "Nyx — суверенний локальний ШІ", foot_r: "Для тих, хто володіє своєю машиною"
    },
    es: {
      doc_title: "Nyx — el operador de IA local",
      nav_features: "Funciones", nav_how: "Cómo funciona", nav_proof: "Pruebas", nav_try: "Probar",
      hero_badge: "Local-first · IA soberana", hero_h1: "Tu máquina. Tus reglas. Tu IA.",
      hero_sub: "Nyx es un operador de IA local: corre en tu hardware, planifica en abierto y actúa solo con tu permiso.",
      hero_cta1: "Abrir la app", hero_cta2: "Ver cómo funciona",
      feat_eyebrow: "Capacidades", feat_h2: "Hecho para actuar, no solo charlar",
      feat_lead: "Nyx convierte la intención en acción verificada en tu propia máquina.",
      feat_c1_t: "Runtime soberano", feat_c1_d: "Corre íntegro en tu hardware. Nada sale sin tu permiso.",
      feat_c2_t: "Planificación transparente", feat_c2_d: "Cada paso se escribe como especificación antes de ejecutar.",
      feat_c3_t: "Ejecución protegida", feat_c3_d: "Políticas y guardias de red controlan cada acción arriesgada.",
      how_eyebrow: "Cómo funciona", how_h2: "De la intención al resultado verificado",
      how_s1_t: "Di el objetivo", how_s1_d: "Escribe una petición simple como «Instala Steam».",
      how_s2_t: "Nyx escribe una spec", how_s2_d: "Redacta un plan abierto y revisable de pasos exactos.",
      how_s3_t: "Tú apruebas", how_s3_d: "Nada se ejecuta hasta que apruebes el plan.",
      how_s4_t: "Ejecuta con seguridad", how_s4_d: "Guardias y validadores mantienen cada acción dentro de límites.",
      proof_eyebrow: "Pruebas", proof_h2: "Evidencia, no promesas",
      proof_lead: "Cada ejecución deja un rastro firmado y auditable.",
      proof_m1: "100% local", proof_m2: "0 llamadas ocultas", proof_m3: "Cada paso firmado",
      proof_note: "Se escribe evidencia criptográfica por cada acción ejecutada.",
      final_eyebrow: "Empezar", final_h2: "Recupera el control de tu IA",
      final_p: "Ejecuta un operador soberano que solo te responde a ti.",
      final_cta1: "Abrir la app", final_cta2: "Leer la documentación",
      foot_l: "Nyx — IA local soberana", foot_r: "Para quienes son dueños de su máquina"
    },
    de: {
      doc_title: "Nyx — der lokale KI-Operator",
      nav_features: "Funktionen", nav_how: "So funktioniert's", nav_proof: "Beweise", nav_try: "Ausprobieren",
      hero_badge: "Local-first · souveräne KI", hero_h1: "Deine Maschine. Deine Regeln. Deine KI.",
      hero_sub: "Nyx ist ein lokaler KI-Operator: läuft auf deiner Hardware, plant offen und handelt nur mit deiner Erlaubnis.",
      hero_cta1: "App starten", hero_cta2: "So funktioniert's",
      feat_eyebrow: "Fähigkeiten", feat_h2: "Gebaut zum Handeln, nicht nur zum Plaudern",
      feat_lead: "Nyx verwandelt Absicht in verifizierte Aktion auf deiner eigenen Maschine.",
      feat_c1_t: "Souveräne Laufzeit", feat_c1_d: "Läuft komplett auf deiner Hardware. Nichts verlässt sie ohne dein OK.",
      feat_c2_t: "Transparente Planung", feat_c2_d: "Jeder Schritt wird als Spec ausgeschrieben, bevor etwas läuft.",
      feat_c3_t: "Geschützte Ausführung", feat_c3_d: "Policy- und Netzwächter kontrollieren jede riskante Aktion.",
      how_eyebrow: "So funktioniert's", how_h2: "Von der Absicht zum verifizierten Ergebnis",
      how_s1_t: "Nenne das Ziel", how_s1_d: "Tippe eine einfache Anfrage wie „Installiere Steam“.",
      how_s2_t: "Nyx schreibt eine Spec", how_s2_d: "Entwirft einen offenen, prüfbaren Plan exakter Schritte.",
      how_s3_t: "Du bestätigst", how_s3_d: "Nichts läuft, bis du den Plan freigibst.",
      how_s4_t: "Sichere Ausführung", how_s4_d: "Wächter und Validatoren halten jede Aktion in Grenzen.",
      proof_eyebrow: "Beweise", proof_h2: "Beweise, keine Versprechen",
      proof_lead: "Jeder Lauf hinterlässt eine signierte, prüfbare Spur.",
      proof_m1: "100% lokal", proof_m2: "0 versteckte Aufrufe", proof_m3: "Jeder Schritt signiert",
      proof_note: "Für jede ausgeführte Aktion wird kryptografischer Beweis geschrieben.",
      final_eyebrow: "Loslegen", final_h2: "Hol dir die Kontrolle über deine KI zurück",
      final_p: "Betreibe einen souveränen Operator, der nur dir gegenüber verantwortlich ist.",
      final_cta1: "App starten", final_cta2: "Doku lesen",
      foot_l: "Nyx — souveräne lokale KI", foot_r: "Für Menschen, denen ihre Maschine gehört"
    },
    fr: {
      doc_title: "Nyx — l'opérateur d'IA local",
      nav_features: "Fonctions", nav_how: "Comment ça marche", nav_proof: "Preuves", nav_try: "Essayer",
      hero_badge: "Local-first · IA souveraine", hero_h1: "Ta machine. Tes règles. Ton IA.",
      hero_sub: "Nyx est un opérateur d'IA local : il tourne sur ton matériel, planifie à découvert et n'agit qu'avec ta permission.",
      hero_cta1: "Lancer l'app", hero_cta2: "Voir comment ça marche",
      feat_eyebrow: "Capacités", feat_h2: "Conçu pour agir, pas seulement discuter",
      feat_lead: "Nyx transforme l'intention en action vérifiée sur ta propre machine.",
      feat_c1_t: "Runtime souverain", feat_c1_d: "Tourne entièrement sur ton matériel. Rien ne sort sans ton accord.",
      feat_c2_t: "Planification transparente", feat_c2_d: "Chaque étape est écrite comme une spec avant toute exécution.",
      feat_c3_t: "Exécution protégée", feat_c3_d: "Politiques et gardes réseau encadrent chaque action risquée.",
      how_eyebrow: "Comment ça marche", how_h2: "De l'intention au résultat vérifié",
      how_s1_t: "Dis l'objectif", how_s1_d: "Écris une demande simple comme « Installe Steam ».",
      how_s2_t: "Nyx écrit une spec", how_s2_d: "Rédige un plan ouvert et vérifiable d'étapes précises.",
      how_s3_t: "Tu approuves", how_s3_d: "Rien ne s'exécute tant que tu n'as pas validé le plan.",
      how_s4_t: "Exécution en sécurité", how_s4_d: "Gardes et validateurs maintiennent chaque action dans les limites.",
      proof_eyebrow: "Preuves", proof_h2: "Des preuves, pas des promesses",
      proof_lead: "Chaque exécution laisse une trace signée et auditable.",
      proof_m1: "100% local", proof_m2: "0 appel caché", proof_m3: "Chaque étape signée",
      proof_note: "Une preuve cryptographique est écrite pour chaque action exécutée.",
      final_eyebrow: "Commencer", final_h2: "Reprends le contrôle de ton IA",
      final_p: "Fais tourner un opérateur souverain qui ne répond qu'à toi.",
      final_cta1: "Lancer l'app", final_cta2: "Lire la doc",
      foot_l: "Nyx — IA locale souveraine", foot_r: "Pour ceux qui possèdent leur machine"
    }
  };

  function getTheme() {
    var t = ""; try { t = localStorage.getItem("nyx-theme") || ""; } catch (e) {}
    if (!t) t = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    return t === "light" ? "light" : "dark";
  }
  function setTheme(t, ev) {
    t = t === "light" ? "light" : "dark";
    var r = document.documentElement;
    var go = function () { r.setAttribute("data-theme", t); try { localStorage.setItem("nyx-theme", t); } catch (e) {} };
    if (ev) { r.style.setProperty("--x", ev.clientX + "px"); r.style.setProperty("--y", ev.clientY + "px"); }
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && !reduce) document.startViewTransition(go); else go();
  }
  document.documentElement.setAttribute("data-theme", getTheme());

  function getLang() {
    var l = ""; try { l = localStorage.getItem("nyx.lang") || ""; } catch (e) {}
    if (!l) { var n = (navigator.language || "en").slice(0, 2).toLowerCase(); l = SUP.indexOf(n) >= 0 ? n : "en"; }
    return SUP.indexOf(l) >= 0 ? l : "en";
  }
  function norm(s) { return (s || "").replace(/\s+/g, " ").trim(); }

  var REV = {}; for (var k in DICT.en) if (DICT.en.hasOwnProperty(k)) REV[norm(DICT.en[k])] = k;

  var CAND = "h1,h2,h3,h4,h5,p,span,a,li,button,small,strong,em,div";
  function tagNodes() {
    var els = document.body.querySelectorAll(CAND);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.getAttribute("data-nyx-key")) continue;
      if (el.childElementCount > 1) continue;
      if (el.closest("[data-nyx-skip]")) continue;
      var key = REV[norm(el.textContent)];
      if (key) el.setAttribute("data-nyx-key", key);
    }
  }
  var menuEl;
  function markSel(lang) {
    if (!menuEl) return;
    var lis = menuEl.querySelectorAll("[data-lang]");
    for (var i = 0; i < lis.length; i++)
      lis[i].setAttribute("aria-selected", lis[i].getAttribute("data-lang") === lang ? "true" : "false");
  }
  function applyLang(lang) {
    var t = DICT[lang] || DICT.en;
    var els = document.body.querySelectorAll("[data-nyx-key]");
    for (var i = 0; i < els.length; i++) {
      var v = t[els[i].getAttribute("data-nyx-key")];
      if (v != null) els[i].textContent = v;
    }
    var h1 = document.querySelector("h1[data-nyx-key]"); if (h1) h1.classList.add("grad");
    if (t.doc_title) document.title = t.doc_title;
    document.documentElement.setAttribute("lang", lang);
    var lbl = document.querySelectorAll("[data-lang-label]");
    for (var j = 0; j < lbl.length; j++) lbl[j].textContent = LABEL[lang];
    markSel(lang);
  }
  function setLang(l) { if (SUP.indexOf(l) < 0) l = "en"; try { localStorage.setItem("nyx.lang", l); } catch (e) {} applyLang(l); }

  function buildControls() {
    var host = document.querySelector("header .nav") || document.querySelector("header nav") ||
               document.querySelector("header") || document.body;
    if (document.querySelector(".nyx-controls")) return;
    var wrap = document.createElement("div"); wrap.className = "nyx-controls"; wrap.setAttribute("data-nyx-skip", "");
    var lang = document.createElement("div"); lang.className = "nyx-lang";
    var btn = document.createElement("button"); btn.type = "button";
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.9 2.6 15.1 0 18M12 3c-2.6 2.9-2.6 15.1 0 18"/></svg><span data-lang-label>EN</span>';
    var menu = document.createElement("div"); menu.className = "nyx-menu";
    SUP.forEach(function (l) {
      var it = document.createElement("div"); it.className = "nyx-mi";
      it.setAttribute("data-lang", l); it.textContent = NAME[l];
      it.onclick = function () { setLang(l); lang.classList.remove("open"); };
      menu.appendChild(it);
    });
    btn.onclick = function (e) { e.stopPropagation(); lang.classList.toggle("open"); };
    document.addEventListener("click", function (e) { if (!lang.contains(e.target)) lang.classList.remove("open"); });
    lang.appendChild(btn); lang.appendChild(menu); menuEl = menu;
    var tb = document.createElement("button"); tb.className = "nyx-theme"; tb.type = "button";
    tb.title = "Theme"; tb.setAttribute("aria-label", "Toggle theme");
    tb.innerHTML = '<svg class="sun-and-moon" viewBox="0 0 24 24" aria-hidden="true"><mask class="moon" id="nyx-moon"><rect x="0" y="0" width="100%" height="100%" fill="white"/><circle cx="24" cy="10" r="6" fill="black"/></mask><circle class="sun" cx="12" cy="12" r="6" mask="url(#nyx-moon)" fill="currentColor"/><g class="sun-beams" stroke="currentColor" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/></g></svg>';
    tb.onclick = function (e) { setTheme(getTheme() === "dark" ? "light" : "dark", e); };
    wrap.appendChild(lang); wrap.appendChild(tb); host.appendChild(wrap);
  }

  function init() {
    buildControls(); tagNodes(); applyLang(getLang());
    window.addEventListener("storage", function (e) {
      if (e.key === "nyx-theme") document.documentElement.setAttribute("data-theme", getTheme());
      if (e.key === "nyx.lang") applyLang(getLang());
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
