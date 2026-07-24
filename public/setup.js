(function () {
  var $ = function (id) { return document.getElementById(id) }
  var poll = null

  function human(bytes) {
    if (!bytes) return "0 МБ"
    var mb = bytes / 1e6
    if (mb >= 1024) return (mb / 1024).toFixed(2) + " ГБ"
    return Math.round(mb) + " МБ"
  }

  function renderHardware(hw) {
    if (!hw) return
    var rows = []
    if (hw.cpu) rows.push(["Процессор", hw.cpu + (hw.cores ? " (" + hw.cores + " ядер)" : "")])
    if (hw.ramGB) rows.push(["Память", hw.ramGB + " ГБ" + (hw.ramFreeGB ? " (свободно " + hw.ramFreeGB + ")" : "")])
    if (hw.gpu && hw.gpu.length) rows.push(["Графика", hw.gpu.join(", ")])
    if (hw.os) rows.push(["Система", hw.os])
    $("hw").innerHTML = rows.map(function (r) {
      return '<div class="kv"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'
    }).join("") || '<div class="kv"><span>Железо</span><b>—</b></div>'
  }

  function fillCatalog(cat, recKey) {
    var sel = $("modelSelect")
    sel.innerHTML = ""
    cat.forEach(function (c) {
      var o = document.createElement("option")
      o.value = c.key
      o.textContent = c.label + "  ·  ~" + c.approxGB + " ГБ  ·  от " + c.ramMinGB + " ГБ ОЗУ"
      if (c.key === recKey) o.selected = true
      sel.appendChild(o)
    })
    sel.onchange = function () {
      var c = cat.filter(function (x) { return x.key === sel.value })[0]
      if (c) { $("modelLabel").textContent = c.label; $("modelNote").textContent = c.note; $("modelSize").textContent = "~" + c.approxGB + " ГБ" }
    }
  }

  function showReady() {
    $("install").style.display = "none"
    $("open").style.display = "inline-block"
    $("progress").style.display = "block"
    $("bar").classList.remove("indet")
    $("barFill").style.width = "100%"
    $("ppct").textContent = "100%"
    $("pnote").textContent = "Модель установлена. Всё готово."
  }

  function applyProgress(d) {
    if (!d) return
    $("progress").style.display = "block"
    if (d.phase === "ready") { showReady(); if (poll) { clearInterval(poll); poll = null } return }
    if (d.phase === "error") {
      if (poll) { clearInterval(poll); poll = null }
      $("err").style.display = "block"
      $("err").textContent = d.error || "Ошибка загрузки"
      $("install").disabled = false
      $("install").textContent = "Повторить"
      $("bar").classList.remove("indet")
      return
    }
    // downloading
    var pct = d.pct || 0
    if (d.targetBytes > 0 && pct > 0) {
      $("bar").classList.remove("indet")
      $("barFill").style.width = pct + "%"
      $("ppct").textContent = pct + "%"
    } else {
      $("bar").classList.add("indet")
      $("ppct").textContent = ""
    }
    $("pnote").textContent = (d.note || "Загрузка") + "  ·  " + human(d.bytes) + (d.targetBytes ? " / ~" + human(d.targetBytes) : "")
  }

  function startPolling() {
    if (poll) clearInterval(poll)
    poll = setInterval(function () {
      fetch("/api/setup/progress").then(function (r) { return r.json() }).then(applyProgress).catch(function () {})
    }, 1200)
  }

  function install() {
    var model = $("modelSelect").value
    $("install").disabled = true
    $("install").textContent = "Устанавливаем…"
    $("err").style.display = "none"
    $("progress").style.display = "block"
    $("bar").classList.add("indet")
    $("pnote").textContent = "Запуск загрузки…"
    fetch("/api/setup/download", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: model }),
    }).then(function (r) { return r.json() }).then(function (d) {
      applyProgress(d)
      startPolling()
    }).catch(function (e) {
      $("err").style.display = "block"
      $("err").textContent = String(e)
      $("install").disabled = false
      $("install").textContent = "Повторить"
    })
  }

  function boot() {
    fetch("/api/setup/status").then(function (r) { return r.json() }).then(function (s) {
      renderHardware(s.hardware)
      if (s.cacheDir) $("cacheDir").textContent = s.cacheDir
      if (s.catalog && s.catalog.length) {
        fillCatalog(s.catalog, s.recommended && s.recommended.key)
        var rec = s.recommended
        if (rec) { $("modelLabel").textContent = rec.label; $("modelNote").textContent = rec.note; $("modelSize").textContent = "~" + rec.approxGB + " ГБ" }
      }
      if (s.ready) { showReady() }
      else if (s.download && s.download.phase === "downloading") { $("install").disabled = true; $("install").textContent = "Устанавливаем…"; applyProgress(s.download); startPolling() }
    }).catch(function () {
      $("hw").innerHTML = '<div class="kv"><span>Не удалось получить статус</span><b>—</b></div>'
    })
  }

  $("install").addEventListener("click", install)
  $("open").addEventListener("click", function () { location.href = "/app" })
  boot()
})()
