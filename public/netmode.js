// Nyx Online-mode toggle. OFF by default -> identical to today (100% local).
// When ON, ONLY the current message is sent to the web for a fresh search;
// chat history and notes never leave the device (enforced server-side + NetGuard).
(function () {
  var LABELS = {
    en: { off: "Offline", on: "Online", tip: "Online: only your current question is sent for a fresh web search. Chat & notes never leave your device." },
    ru: { off: "Офлайн", on: "Онлайн", tip: "Онлайн: в сеть уходит только твой текущий вопрос для свежего поиска. Чат и заметки никогда не покидают устройство." },
    uk: { off: "Офлайн", on: "Онлайн", tip: "Онлайн: у мережу йде лише твоє поточне питання для свіжого пошуку. Чат і нотатки не залишають пристрій." },
    es: { off: "Sin conexión", on: "En línea", tip: "En línea: solo se envía tu pregunta actual para una búsqueda web reciente. El chat y las notas nunca salen del dispositivo." },
    de: { off: "Offline", on: "Online", tip: "Online: nur deine aktuelle Frage wird für eine frische Websuche gesendet. Chat und Notizen verlassen das Gerät nie." },
    fr: { off: "Hors ligne", on: "En ligne", tip: "En ligne : seule ta question actuelle est envoyée pour une recherche web récente. Chat et notes ne quittent jamais l'appareil." }
  }
  function langKey() { try { var l = localStorage.getItem("nyx.lang") || "en"; return LABELS[l] ? l : "en" } catch (e) { return "en" } }
  function label() { return LABELS[langKey()] || LABELS.en }
  function isOn() { try { return localStorage.getItem("nyx.online") === "1" } catch (e) { return false } }
  function setOn(v) { try { localStorage.setItem("nyx.online", v ? "1" : "0") } catch (e) {} }

  function injectCss() {
    if (document.getElementById("netmode-css")) return
    var s = document.createElement("style"); s.id = "netmode-css"
    s.textContent =
      ".netmode{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line,rgba(255,255,255,.14));background:var(--panel,#1c1d20);color:var(--text,#f4f4f5);border-radius:999px;padding:5px 11px;font-size:13px;font-weight:600;cursor:pointer;transition:all .18s;white-space:nowrap}"
      + ".netmode:hover{border-color:#2f8bfd}"
      + ".netmode .dot{width:8px;height:8px;border-radius:50%;background:#8a8f98;transition:all .18s}"
      + ".netmode.on{border-color:#2f8bfd;color:#2f8bfd}"
      + ".netmode.on .dot{background:#2f8bfd;box-shadow:0 0 8px #2f8bfd}"
    document.head.appendChild(s)
  }

  function paint(btn) {
    var L = label(), on = isOn()
    btn.className = "netmode" + (on ? " on" : "")
    btn.title = L.tip
    btn.innerHTML = '<span class="dot"></span><span class="txt">' + (on ? L.on : L.off) + "</span>"
  }

  function mount() {
    var bar = document.querySelector(".topbar"); if (!bar) return
    if (document.getElementById("netBtn")) return
    injectCss()
    var btn = document.createElement("button"); btn.id = "netBtn"; btn.type = "button"
    paint(btn)
    btn.onclick = function () { setOn(!isOn()); paint(btn) }
    var themeBtn = document.getElementById("themeBtn")
    if (themeBtn) bar.insertBefore(btn, themeBtn); else bar.appendChild(btn)
    window.addEventListener("storage", function (e) { if (e.key === "nyx.lang" || e.key === "nyx.online") paint(btn) })
    window.addEventListener("focus", function () { paint(btn) })
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount)
  else mount()
})()
