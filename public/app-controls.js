/* Селектор языка для приложения Nyx.
   app.js уже читает nyx.lang и ре-синхронизируется на событие 'focus';
   тема — через существующую кнопку #themeBtn. Здесь только добавляем выбор языка. */
(function () {
  var SUP = ["en", "ru", "uk", "es", "de", "fr"];
  var NAME = { en: "English", ru: "Русский", uk: "Українська", es: "Español", de: "Deutsch", fr: "Français" };
  function cur() { try { var l = localStorage.getItem("nyx.lang") || "en"; return SUP.indexOf(l) >= 0 ? l : "en"; } catch (e) { return "en"; } }
  function init() {
    if (document.getElementById("nyxAppLang")) return;
    var sel = document.createElement("select");
    sel.id = "nyxAppLang"; sel.className = "langsel"; sel.setAttribute("aria-label", "Language");
    SUP.forEach(function (l) { var o = document.createElement("option"); o.value = l; o.textContent = NAME[l]; sel.appendChild(o); });
    sel.value = cur();
    sel.addEventListener("change", function () {
      try { localStorage.setItem("nyx.lang", sel.value); } catch (e) {}
      window.dispatchEvent(new Event("focus")); // триггерит перерисовку в app.js без перезагрузки
    });
    window.addEventListener("storage", function (e) { if (e.key === "nyx.lang") sel.value = cur(); });
    var themeBtn = document.getElementById("themeBtn");
    if (themeBtn && themeBtn.parentNode) themeBtn.parentNode.insertBefore(sel, themeBtn);
    else { var h = document.querySelector("header") || document.body; h.appendChild(sel); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
