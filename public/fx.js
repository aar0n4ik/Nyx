(function () {
  "use strict";
  if (window.__nyxFx) return;
  window.__nyxFx = true;
  try { if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; } catch (e) {}

  function start(){
    var glow = document.createElement("div");
    glow.setAttribute("style","position:fixed;z-index:-1;width:520px;height:520px;left:-999px;top:0;border-radius:50%;pointer-events:none;filter:blur(90px);opacity:.32;background:radial-gradient(circle,rgba(124,92,255,.55),transparent 70%);transform:translate(-50%,-50%);transition:opacity .4s");
    document.body.appendChild(glow);

    var mark = document.querySelector(".mark");
    document.querySelectorAll(".grid").forEach(function(g){ g.style.perspective="1200px"; });

    window.addEventListener("pointermove", function(e){
      glow.style.left = e.clientX + "px";
      glow.style.top = e.clientY + "px";
      if (mark){ var dx=(e.clientX/window.innerWidth-0.5), dy=(e.clientY/window.innerHeight-0.5); mark.style.transform="translate("+(dx*14).toFixed(1)+"px,"+(dy*10).toFixed(1)+"px)"; }
    }, { passive: true });

    document.querySelectorAll(".card").forEach(function(c){
      c.addEventListener("pointermove", function(e){
        var r=c.getBoundingClientRect();
        var px=(e.clientX-r.left)/r.width-0.5, py=(e.clientY-r.top)/r.height-0.5;
        c.style.transform="translateY(-4px) rotateX("+(-py*6).toFixed(2)+"deg) rotateY("+(px*8).toFixed(2)+"deg)";
      });
      c.addEventListener("pointerleave", function(){ c.style.transform=""; });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
