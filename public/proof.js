(function () {
  "use strict";
  if (window.__nyxProof) return;
  window.__nyxProof = true;

  function elt(tag, style, text) {
    var e = document.createElement(tag);
    if (style) e.setAttribute("style", style);
    if (text != null) e.textContent = text;
    return e;
  }
  function api(path, opts) { return fetch(path, opts).then(function (r) { return r.json(); }); }
  function num(x) { return (x == null ? "—" : String(x)); }

  var CARD = "flex:1;min-width:130px;padding:16px 18px;border-radius:16px;background:rgba(127,127,127,.08);border:1px solid rgba(127,127,127,.16)";
  var BIG = "font-size:28px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums";
  var SUB = "margin-top:4px;font-size:12.5px;opacity:.62;line-height:1.35";
  var PANEL = "margin-top:22px;padding:18px;border-radius:16px;background:rgba(127,127,127,.06);border:1px solid rgba(127,127,127,.16)";
  var BTN = "padding:9px 16px;border-radius:10px;border:1px solid rgba(127,127,127,.25);background:transparent;color:inherit;cursor:pointer;font:inherit;font-size:13px;font-weight:600";
  var OUT = "font-family:ui-monospace,Menlo,monospace;font-size:13px;white-space:pre-wrap;padding:12px 14px;border-radius:12px;background:rgba(127,127,127,.10);min-height:20px;opacity:.9;margin-top:12px";

  function statCard(value, label) {
    var c = elt("div", CARD);
    c.appendChild(elt("div", BIG, value));
    c.appendChild(elt("div", SUB, label));
    return c;
  }

  function build() {
    var sec = elt("section", "max-width:1080px;margin:56px auto;padding:0 20px");
    sec.id = "nyx-live-proof";
    sec.appendChild(elt("div", "font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.5", "Live · подписано на устройстве"));
    sec.appendChild(elt("h2", "font-size:clamp(24px,4vw,34px);margin:8px 0 6px;letter-spacing:-.02em", "Доказательства, а не слова"));
    sec.appendChild(elt("p", "margin:0 0 18px;opacity:.7;max-width:640px", "Реальные цифры из подписанного лога использования (Ed25519, дедуп по установке). Никакой накрутки: каждое событие проверяемо."));

    var row = elt("div", "display:flex;flex-wrap:wrap;gap:12px");
    var s1 = statCard("—", "Установок (уникальных, подписано)");
    var s2 = statCard("—", "Активация — довели до реального действия");
    var s3 = statCard("—", "Опасных команд заблокировано");
    row.appendChild(s1); row.appendChild(s2); row.appendChild(s3);
    sec.appendChild(row);

    // --- safety demo ---
    var safe = elt("div", PANEL);
    safe.appendChild(elt("div", "font-weight:700;margin-bottom:4px", "Проверь защиту сам"));
    safe.appendChild(elt("div", SUB, "Команда уходит валидатору. Ничего не выполняется — только вердикт."));
    var btns = elt("div", "display:flex;flex-wrap:wrap;gap:10px;margin-top:14px");
    var out = elt("div", OUT);
    function mkBtn(label, script) {
      var b = elt("button", BTN, label);
      b.addEventListener("click", function () {
        out.textContent = "Проверяю…";
        api("/api/agent/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ script: script, shell: "powershell" }) })
          .then(function (d) {
            var v = (d && d.verdict) || {};
            var mark = v.safe ? "✅ РАЗРЕШЕНО" : "⛔ ЗАБЛОКИРОВАНО";
            var reasons = (v.reasons && v.reasons.length) ? ("\n• " + v.reasons.join("\n• ")) : "";
            out.textContent = mark + "  (риск: " + (v.risk || "?") + ")\n$ " + script + reasons;
          })
          .catch(function () { out.textContent = "Сервер не отвечает — запусти: node server.js"; });
      });
      return b;
    }
    btns.appendChild(mkBtn("Безопасная: Get-ComputerInfo", "Get-ComputerInfo | Select-Object CsName, OsName"));
    btns.appendChild(mkBtn("Опасная: снести System32", "Remove-Item -Recurse -Force C:\\Windows\\System32"));
    safe.appendChild(btns); safe.appendChild(out);
    sec.appendChild(safe);

    // --- smart system copy ---
    var copy = elt("div", PANEL);
    copy.appendChild(elt("div", "font-weight:700;margin-bottom:4px", "Умная копия системы"));
    copy.appendChild(elt("div", SUB, "Nyx собирает лёгкий подписанный слепок машины (что стоит, что важно). На новом ПК кидаешь файл .nyx — и Nyx понимает, что вернуть. Read-only, ничего не меняет."));
    var cbtns = elt("div", "display:flex;flex-wrap:wrap;gap:10px;margin-top:14px");
    var cbtn = elt("button", BTN, "Собрать копию");
    var dl = elt("a", BTN + ";text-decoration:none;display:none", "Скачать .nyx");
    var cout = elt("div", OUT);
    cbtn.addEventListener("click", function () {
      cout.textContent = "Сканирую систему…"; dl.style.display = "none";
      api("/api/snapshot").then(function (d) {
        if (!d || d.error || !d.snapshot) { cout.textContent = "Не удалось собрать слепок" + (d && d.error ? (": " + d.error) : ""); return; }
        cout.textContent = d.text || JSON.stringify(d.summary || d.snapshot, null, 2);
        var blob = new Blob([JSON.stringify(d.snapshot, null, 2)], { type: "application/json" });
        dl.href = URL.createObjectURL(blob); dl.download = "nyx-system.nyx"; dl.style.display = "inline-flex";
      }).catch(function () { cout.textContent = "Сервер не отвечает — запусти: node server.js"; });
    });
    cbtns.appendChild(cbtn); cbtns.appendChild(dl);
    copy.appendChild(cbtns); copy.appendChild(cout);
    sec.appendChild(copy);

    return { sec: sec, cards: [s1, s2, s3] };
  }

  function place(sec) {
    var foot = document.querySelector("footer");
    if (foot && foot.parentNode) { foot.parentNode.insertBefore(sec, foot); return; }
    (document.querySelector("main") || document.body).appendChild(sec);
  }

  function run() {
    if (document.getElementById("nyx-live-proof")) return;
    var b = build();
    place(b.sec);
    api("/api/metrics").then(function (m) {
      m = m || {};
      b.cards[0].firstChild.textContent = num(m.installs);
      b.cards[1].firstChild.textContent = num(m.activationPct) + "%";
      b.cards[2].firstChild.textContent = num(m.dangerousBlocked);
      var map = { installs: m.installs, activation: num(m.activationPct) + "%", blocked: m.dangerousBlocked, tasks: m.tasksDone, queries: m.queries };
      Object.keys(map).forEach(function (k) {
        var nodes = document.querySelectorAll('[data-nyx-metric="' + k + '"]');
        for (var i = 0; i < nodes.length; i++) nodes[i].textContent = num(map[k]);
      });
    }).catch(function () {});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
