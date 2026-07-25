/* Nyx unified language layer.
   Переводит весь ДИНАМИЧЕСКИЙ текст по содержимому (карточки моделей, FAQ,
   Download, TurboQuant, интро моделей). data-i18n и демо-чат переводит инлайн
   ключевой движок — их не трогаем. Идемпотентно: любой язык -> EN -> цель,
   поэтому ничего не липнет. Пере-применяется при смене языка и любых
   изменениях DOM (cards.js/download.js строят элементы позже). */
(function () {
  "use strict";
  var LANGS = ["ru", "uk", "es", "de", "fr"];
  var FROM_EN = null, TO_EN = null, EN_RAW = null, applying = false, raf = 0, obs = null;

  function norm(s) {
    return s
      .replace(/[\u2018\u2019\u201B]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2012-\u2015\u2212]/g, "-")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function build() {
    var NYXI = window.NYXI || {};
    FROM_EN = {}; TO_EN = {}; EN_RAW = {};
    LANGS.forEach(function (l) {
      var d = NYXI[l];
      if (!d) return;
      Object.keys(d).forEach(function (en) {
        var ne = norm(en), tr = d[en];
        if (!FROM_EN[ne]) FROM_EN[ne] = {};
        FROM_EN[ne][l] = tr;
        EN_RAW[ne] = en;
        TO_EN[ne] = ne;
        TO_EN[norm(tr)] = ne;
      });
    });
  }

  function curLang() {
    try {
      var ks = ["nyx.lang", "nyx-lang", "lang"];
      for (var i = 0; i < ks.length; i++) {
        var v = localStorage.getItem(ks[i]);
        if (v) return v.toLowerCase().slice(0, 2);
      }
    } catch (e) {}
    return (document.documentElement.getAttribute("lang") || "en").toLowerCase().slice(0, 2);
  }

  function skip(node) {
    var el = node.parentNode;
    while (el && el.nodeType === 1) {
      var t = el.tagName;
      if (t === "SCRIPT" || t === "STYLE" || t === "NOSCRIPT" || t === "TEXTAREA") return true;
      if (el.hasAttribute && (el.hasAttribute("data-i18n") || el.hasAttribute("data-nyx-skip"))) return true;
      if (el.id === "chatBody") return true;
      el = el.parentNode;
    }
    return false;
  }

  function collect() {
    var tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var n, list = [];
    while ((n = tw.nextNode())) {
      if (n.nodeValue && n.nodeValue.trim() && !skip(n)) list.push(n);
    }
    return list;
  }

  function translateNode(n, lang) {
    var raw = n.nodeValue, m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
    var lead = m ? m[1] : "", core = m ? m[2] : raw, trail = m ? m[3] : "";
    var en = TO_EN[norm(core)];
    if (en === undefined) return;
    var out;
    if (lang === "en" || !FROM_EN[en] || FROM_EN[en][lang] == null) out = lead + (EN_RAW[en] || core) + trail;
    else out = lead + FROM_EN[en][lang] + trail;
    if (n.nodeValue !== out) n.nodeValue = out;
  }

  function apply() {
    build();
    var lang = curLang();
    applying = true;
    try {
      var list = collect();
      for (var i = 0; i < list.length; i++) translateNode(list[i], lang);
    } catch (e) {}
    applying = false;
  }

  function observe() {
    if (!document.body) return;
    if (!obs) obs = new MutationObserver(function () { if (!applying) schedule(); });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      if (obs) obs.disconnect();
      apply();
      observe();
    });
  }

  function hookMenu() {
    var btns = document.querySelectorAll("#langMenu button, #langMenu [data-l]");
    for (var i = 0; i < btns.length; i++) btns[i].addEventListener("click", function () { setTimeout(schedule, 0); });
  }

  function start() {
    apply();
    observe();
    hookMenu();
    setTimeout(schedule, 300);
    setTimeout(schedule, 1200);
    window.addEventListener("storage", function (e) { if (!e || !e.key || /lang/i.test(e.key)) schedule(); });
  }

  window.NyxI18n = { apply: apply, rebuild: function () { build(); schedule(); } };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
