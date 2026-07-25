(function () {
  var EXE = "https://github.com/aar0n4ik/Nyx/releases/latest/download/Nyx-Setup.exe";
  function inDownload(n){ return !!(n.closest && n.closest("#download")); }
  function toDownload(e){
    if(e){ e.preventDefault(); }
    var sec = document.getElementById("download");
    if(sec && sec.scrollIntoView) sec.scrollIntoView({behavior:"smooth",block:"start"});
    try{ history.replaceState(null,"","#download"); }catch(_){}
  }
  function fix() {
    var re = /(download for win|скачать для windows|завантажити для windows)/i;
    document.querySelectorAll("a,button").forEach(function (n) {
      var t = (n.textContent || "").trim().toLowerCase();
      var hit = re.test(t) || ((/win/i.test(t) || inDownload(n)) && /(download|скачать|завантажити)/i.test(t));
      if (!hit) return;
      if (inDownload(n)) {
        // внутри секции Download — настоящая скачка установщика
        if (n.tagName === "A") { n.setAttribute("href", EXE); n.setAttribute("download", ""); n.removeAttribute("target"); }
        else { n.onclick = function(){ window.location.href = EXE; }; }
      } else {
        // все прочие (hero и т.п.) — плавно к секции #download
        if (n.tagName === "A") n.setAttribute("href", "#download");
        n.addEventListener("click", toDownload);
      }
    });
  }
  if (document.readyState !== "loading") fix(); else document.addEventListener("DOMContentLoaded", fix);
})();
