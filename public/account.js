(function () {
  var $ = function (id) { return document.getElementById(id) }
  function api(path, method, body) {
    return fetch(path, { method: method || "GET", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(function (r) { return r.json() })
  }
  function msg(t, bad) { var m = $("msg"); m.textContent = t || ""; m.className = bad ? "bad" : "muted" }
  function renderRating(r) {
    $("ratingCard").style.display = "block"
    $("score").textContent = r.score
    $("level").textContent = r.level
    $("total").textContent = r.stats.total
    $("days").textContent = r.stats.activeDays
    $("streak").textContent = r.stats.streak
    var c = $("chain"); c.textContent = r.honest ? "цела" : "нарушена"; c.className = r.honest ? "ok" : "bad"
  }
  function loadRating() { api("/api/account/rating").then(renderRating) }
  function showProfile(p) {
    $("create").style.display = "none"
    $("profile").style.display = "block"
    $("acid").textContent = p.accountId
    $("handleView").textContent = p.handle
    $("created").textContent = new Date(p.createdAt).toLocaleString()
    api("/api/account/event", "POST", { type: "session" }).then(loadRating)
  }
  function boot() {
    api("/api/account").then(function (p) {
      if (p && p.accountId) showProfile(p)
      else { $("create").style.display = "block" }
    })
  }
  $("createBtn").addEventListener("click", function () {
    var h = $("handle").value.trim() || "tester"
    api("/api/account/create", "POST", { handle: h }).then(showProfile)
  })
  $("eventBtn").addEventListener("click", function () {
    api("/api/account/event", "POST", { type: "manual" }).then(function (res) {
      msg(res.skipped ? "Слишком часто — подождите секунду" : "Событие записано, seq " + res.seq, res.skipped)
      loadRating()
    })
  })
  $("verifyBtn").addEventListener("click", function () {
    api("/api/account/verify").then(function (v) { msg(v.valid ? "Цепочка цела: " + v.count + " событий" : "Нарушения: " + v.issues.length, !v.valid) })
  })
  $("exportBtn").addEventListener("click", function () {
    api("/api/account/attestation").then(function (doc) {
      var blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" })
      var a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = "nyx-attestation-" + (doc.body.accountId || "device") + ".json"
      a.click()
      msg("Аттестация выгружена (также сохранена в evidence/)")
    })
  })
  boot()
})()
