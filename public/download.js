(function () {
  var REL = "https://github.com/aar0n4ik/Nyx/releases/latest";
  function fix(){
    var nodes = document.querySelectorAll("a,button");
    Array.prototype.forEach.call(nodes, function (n) {
      var t = (n.textContent || "").toLowerCase();
      if (/download for win|скачать для windows|завантажити для windows/.test(t)) {
        if (n.tagName === "A") { n.setAttribute("href", REL); n.setAttribute("target", "_blank"); n.setAttribute("rel", "noopener"); }
        else { n.style.cursor = "pointer"; n.addEventListener("click", function (e) { e.preventDefault(); window.open(REL, "_blank", "noopener"); }); }
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fix); else fix();
})();
