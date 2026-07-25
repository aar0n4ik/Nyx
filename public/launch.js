(function () {
  var PROTO = "nyx://open";
  var TIMEOUT = 1500;

  function closeModal(){
    var ov=document.getElementById("nyx-install-modal");
    if(!ov) return;
    ov.classList.remove("show");
    setTimeout(function(){ if(ov&&ov.parentNode) ov.parentNode.removeChild(ov); }, 200);
  }

  function goDownload(){
    closeModal();
    var dl=document.querySelector('[data-i18n="nav_download"]')||document.querySelector('a[href*="download" i]')||document.querySelector(".install");
    if(dl){ try{ dl.click(); }catch(e){} if(dl.scrollIntoView) dl.scrollIntoView({behavior:"smooth",block:"start"}); }
    else { location.hash="#download"; }
  }

  function showModal(){
    if(document.getElementById("nyx-install-modal")) return;
    var ov=document.createElement("div");
    ov.id="nyx-install-modal";
    ov.className="nyx-modal-ov";
    ov.innerHTML=
      '<div class="nyx-modal" role="dialog" aria-modal="true">'+
        '<div class="ico">\u2b07</div>'+
        '<h3>Nyx isn\u2019t installed yet</h3>'+
        '<p>We couldn\u2019t find the Nyx app on this device. Install it once \u2014 then Launch opens it instantly, fully offline.</p>'+
        '<div class="row">'+
          '<button class="ghost" data-nyx="close">Not now</button>'+
          '<button class="primary" data-nyx="dl">Download Nyx</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", function(e){
      if(e.target===ov){ closeModal(); return; }
      var b=e.target.closest?e.target.closest("[data-nyx]"):null;
      if(!b) return;
      if(b.getAttribute("data-nyx")==="close") closeModal();
      if(b.getAttribute("data-nyx")==="dl") goDownload();
    });
    requestAnimationFrame(function(){ ov.classList.add("show"); });
  }

  function launch(e){
    if(e){ e.preventDefault(); e.stopPropagation(); }
    var done=false;
    function caught(){ done=true; teardown(); }
    function onVis(){ if(document.hidden) caught(); }
    function teardown(){
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", caught);
      window.removeEventListener("pagehide", caught);
    }
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", caught);
    window.addEventListener("pagehide", caught);

    var ifr=document.createElement("iframe");
    ifr.style.display="none";
    document.body.appendChild(ifr);
    try{ ifr.contentWindow.location.href=PROTO; }
    catch(err){ try{ window.location.href=PROTO; }catch(e2){} }
    setTimeout(function(){ if(ifr&&ifr.parentNode) ifr.parentNode.removeChild(ifr); }, 1000);

    setTimeout(function(){
      teardown();
      if(!done && !document.hidden) showModal();
    }, TIMEOUT);
  }

  function isLaunch(el){
    if(!el) return false;
    var i18n=el.getAttribute&&el.getAttribute("data-i18n");
    if(i18n && /launch/i.test(i18n)) return true;
    var href=(el.getAttribute&&el.getAttribute("href"))||"";
    if(/(^|\/)app(\/|\?|#|$)/.test(href) && !/^https?:/i.test(href)) return true;
    var t=(el.textContent||"").trim().toLowerCase();
    if(/^launch( the)? app/.test(t)) return true;
    return false;
  }

  function bind(){
    var els=document.querySelectorAll("a,button");
    for(var i=0;i<els.length;i++){
      if(isLaunch(els[i]) && !els[i].__nyxLaunch){
        els[i].__nyxLaunch=true;
        els[i].addEventListener("click", launch);
      }
    }
  }

  if(document.readyState!=="loading") bind();
  else document.addEventListener("DOMContentLoaded", bind);
})();
