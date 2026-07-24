(function () {
  var LOGO = "/logo.svg"
  function addFav() {
    try {
      var l = document.querySelector('link[rel="icon"]')
      if (!l) { l = document.createElement("link"); document.head.appendChild(l) }
      l.rel = "icon"; l.type = "image/svg+xml"; l.href = LOGO
    } catch (e) {}
  }
  function brand() {
    document.querySelectorAll(".brand").forEach(function (b) {
      if (b.querySelector(".nyx-logo")) return
      var oldSvg = b.querySelector("svg"); if (oldSvg) oldSvg.remove()
      var dot = b.querySelector(".dot"); if (dot) dot.style.display = "none"
      var img = new Image(); img.src = LOGO; img.className = "nyx-logo"; img.alt = "Nyx"
      img.width = 26; img.height = 26; img.style.display = "block"
      b.insertBefore(img, b.firstChild)
    })
    var mark = document.querySelector(".mark")
    if (mark && mark.tagName && mark.tagName.toLowerCase() === "svg") {
      var big = new Image(); big.src = LOGO; big.className = "mark"; big.alt = "Nyx"
      big.width = 96; big.height = 96
      mark.parentNode.replaceChild(big, mark)
    }
    var tt = document.querySelector(".theme-toggle")
    if (tt && !document.querySelector(".nyx-acc")) {
      var a = document.createElement("a")
      a.href = "/account"; a.textContent = "Профиль"; a.className = "nyx-acc"
      a.style.cssText = "font-size:13px;color:var(--muted);text-decoration:none;margin-right:10px;align-self:center"
      tt.parentNode.insertBefore(a, tt)
    }
  }
  function run() { addFav(); brand() }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run()
})()
