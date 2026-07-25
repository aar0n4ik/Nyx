(function () {
  var OWNER = "aar0n4ik", REPO = "Nyx";
  var EXE = "https://github.com/" + OWNER + "/" + REPO + "/releases/latest/download/Nyx-Setup.exe";

  function inDownload(n){ return !!(n.closest && n.closest("#download")); }
  function toDownload(e){
    if(e){ e.preventDefault(); }
    var sec = document.getElementById("download");
    if(sec && sec.scrollIntoView) sec.scrollIntoView({behavior:"smooth",block:"start"});
    try{ history.replaceState(null,"","#download"); }catch(_){}
  }
  function wireButtons(){
    var re = /(download for win|скачать для windows|завантажити для windows)/i;
    document.querySelectorAll("a,button").forEach(function(n){
      var t = (n.textContent || "").trim().toLowerCase();
      var hit = re.test(t) || ((/win/i.test(t) || inDownload(n)) && /(download|скачать|завантажити)/i.test(t));
      if(!hit) return;
      if(inDownload(n)){
        if(n.tagName === "A"){ n.setAttribute("href", EXE); n.setAttribute("download",""); n.removeAttribute("target"); }
        else { n.onclick = function(){ window.location.href = EXE; }; }
      } else {
        if(n.tagName === "A") n.setAttribute("href", "#download");
        n.addEventListener("click", toDownload);
      }
    });
  }
  function fmt(bytes){
    var mb = bytes / 1048576;
    if(mb >= 1024){ var gb = mb/1024; return (gb >= 10 ? Math.round(gb) : gb.toFixed(1).replace(/\.0$/,"")) + " GB"; }
    return Math.round(mb) + " MB";
  }
  function fillSize(){
    var nodes = document.querySelectorAll("[data-nyx-size]");
    if(!nodes.length) return;
    fetch("https://api.github.com/repos/" + OWNER + "/" + REPO + "/releases/latest")
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(d){
        if(!d || !d.assets) return;
        var a = d.assets.filter(function(x){ return /Nyx-Setup.*\.exe$/i.test(x.name); })[0];
        if(!a || !a.size) return;
        var txt = fmt(a.size);
        nodes.forEach(function(n){ n.textContent = txt; });
      })
      .catch(function(){});
  }
  function init(){ wireButtons(); fillSize(); }
  if(document.readyState !== "loading") init(); else document.addEventListener("DOMContentLoaded", init);
})();
