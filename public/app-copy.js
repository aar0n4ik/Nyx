(function () {
  "use strict";
  if (window.__nyxCopy) return;
  window.__nyxCopy = true;

  function elt(tag, style, text) {
    var e = document.createElement(tag);
    if (style) e.setAttribute("style", style);
    if (text != null) e.textContent = text;
    return e;
  }
  function api(path, opts) { return fetch(path, opts).then(function (r) { return r.json(); }); }

  var BTN = "padding:9px 15px;border-radius:10px;border:1px solid rgba(127,127,127,.28);background:transparent;color:inherit;cursor:pointer;font:inherit;font-size:13px;font-weight:600";
  var OUT = "font-family:ui-monospace,Menlo,monospace;font-size:12.5px;white-space:pre-wrap;padding:11px 13px;border-radius:11px;background:rgba(127,127,127,.12);min-height:18px;margin-top:12px;max-height:220px;overflow:auto";

  var fab = elt("button", "position:fixed;right:18px;bottom:18px;z-index:9998;padding:11px 16px;border-radius:999px;border:1px solid rgba(127,127,127,.28);background:rgba(127,127,127,.14);color:inherit;cursor:pointer;font:inherit;font-size:13px;font-weight:700;backdrop-filter:blur(8px)", "🗂 Копия системы");
  var panel = elt("div", "position:fixed;right:18px;bottom:66px;z-index:9998;width:min(380px,calc(100vw - 36px));display:none;padding:18px;border-radius:16px;background:rgba(24,24,24,.92);color:#fff;border:1px solid rgba(127,127,127,.24);box-shadow:0 18px 50px rgba(0,0,0,.4);backdrop-filter:blur(14px)");

  panel.appendChild(elt("div", "font-weight:700;font-size:15px;margin-bottom:4px", "Умная копия системы"));
  panel.appendChild(elt("div", "font-size:12.5px;opacity:.62;line-height:1.4", "Соберёшь лёгкий подписанный слепок этого ПК. На новом компе загрузишь файл — Nyx покажет план, что вернуть. Ничего не выполняется."));

  var actions = elt("div", "display:flex;flex-wrap:wrap;gap:9px;margin-top:14px");
  var capBtn = elt("button", BTN, "Собрать копию");
  var dl = elt("a", BTN + ";text-decoration:none;display:none", "Скачать .nyx");
  var upLabel = elt("label", BTN + ";display:inline-flex", "Загрузить .nyx");
  var upInput = elt("input", "display:none"); upInput.type = "file"; upInput.accept = ".nyx,.json,application/json";
  upLabel.appendChild(upInput);
  actions.appendChild(capBtn); actions.appendChild(dl); actions.appendChild(upLabel);
  panel.appendChild(actions);

  var out = elt("div", OUT);
  panel.appendChild(out);

  capBtn.addEventListener("click", function () {
    out.textContent = "Сканирую систему…"; dl.style.display = "none";
    api("/api/snapshot").then(function (d) {
      if (!d || d.error || !d.snapshot) { out.textContent = "Не удалось собрать слепок" + (d && d.error ? (": " + d.error) : ""); return; }
      out.textContent = d.human || JSON.stringify(d.summary || d.snapshot, null, 2);
      var blob = new Blob([JSON.stringify(d.snapshot, null, 2)], { type: "application/json" });
      dl.href = URL.createObjectURL(blob); dl.download = "nyx-system.nyx"; dl.style.display = "inline-flex";
    }).catch(function () { out.textContent = "Сервер не отвечает — запусти: node server.js"; });
  });

  upInput.addEventListener("change", function () {
    var f = upInput.files && upInput.files[0]; if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      var snap; try { snap = JSON.parse(fr.result); } catch (e) { out.textContent = "Файл не читается (не JSON)"; return; }
      out.textContent = "Считаю план восстановления…";
      api("/api/snapshot/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ snapshot: snap }) })
        .then(function (d) {
          if (!d || d.error) { out.textContent = "Ошибка: " + ((d && d.error) || "неизвестно"); return; }
          out.textContent = d.human || JSON.stringify(d.plan || {}, null, 2);
        })
        .catch(function () { out.textContent = "Сервер не отвечает"; });
    };
    fr.readAsText(f);
  });

  fab.addEventListener("click", function () { panel.style.display = panel.style.display === "none" ? "block" : "none"; });

  function mount() { document.body.appendChild(fab); document.body.appendChild(panel); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
