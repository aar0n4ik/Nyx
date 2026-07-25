(function () {
  var REL = "https://github.com/aar0n4ik/Nyx/releases/latest/download/Nyx-Setup.exe";
  function fix() {
    var re = /(download for win|скачать для windows|завантажити для windows)/i;
    document.querySelectorAll("a,button").forEach(function (n) {
      var t = (n.textContent || "").trim().toLowerCase();
      var hit = re.test(t) || ((/win/i.test(t) || (n.closest && n.closest("#download,.dl,.install"))) && /(download|скачать|завантажити|get nyx)/i.test(t));
      if (!hit) return;
      if (n.tagName === "A") { n.setAttribute("href", REL); n.setAttribute("download", ""); }
      else { n.addEventListener("click", function () { window.location.href = REL; }); }
    });
  }
  if (document.readyState !== "loading") fix(); else document.addEventListener("DOMContentLoaded", fix);
})();
