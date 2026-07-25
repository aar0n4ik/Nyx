(function () {
  var pollT=null, selKey=null, DATA=null, editingLoc=false;

  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m];}); }
  function api(p,m,b){ return fetch(p,{method:m||"GET",headers:b?{"content-type":"application/json"}:undefined,body:b?JSON.stringify(b):undefined}).then(function(r){return r.json();}).catch(function(){return null;}); }
  function gb(n){ if(n==null) return ""; return (Math.round(n*10)/10)+" GB"; }

  function css(){
    if(document.getElementById("nyx-picker-css")) return;
    var s=document.createElement("style"); s.id="nyx-picker-css";
    s.textContent=[
      ".nyxpk-ov{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(6,6,10,.55);backdrop-filter:blur(6px);padding:20px}",
      ".nyxpk{width:100%;max-width:560px;max-height:88vh;display:flex;flex-direction:column;background:var(--panel,#14141b);color:var(--ink,#eee);border:1px solid var(--line,#2a2a35);border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.5);overflow:hidden}",
      ".nyxpk-h{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--line,#2a2a35)}",
      ".nyxpk-h b{font-size:16px}",
      ".nyxpk-x{cursor:pointer;background:none;border:none;color:var(--muted,#999);font-size:22px;line-height:1;padding:2px 8px;border-radius:8px}",
      ".nyxpk-x:hover{background:rgba(255,255,255,.06);color:var(--ink,#eee)}",
      ".nyxpk-scroll{padding:16px 18px;overflow:auto}",
      ".nyxpk-hw{font-size:12px;color:var(--muted,#999);margin-bottom:10px}",
      ".nyxpk-ok{background:color-mix(in srgb,var(--accent2,#19e3b1) 15%,transparent);border:1px solid var(--accent2,#19e3b1);padding:9px 12px;border-radius:10px;font-size:13px;margin-bottom:12px}",
      ".nyxpk-loc{background:rgba(255,255,255,.03);border:1px solid var(--line,#2a2a35);border-radius:12px;padding:12px;margin-bottom:14px}",
      ".nyxpk-loc .t{font-size:12px;color:var(--muted,#999);margin-bottom:4px}",
      ".nyxpk-loc .p{font-size:13px;word-break:break-all;margin-bottom:9px}",
      ".nyxpk-loc .row{display:flex;gap:8px;flex-wrap:wrap}",
      ".nyxpk-loc input{flex:1;min-width:180px;background:rgba(0,0,0,.28);border:1px solid var(--line,#2a2a35);color:var(--ink,#eee);border-radius:8px;padding:8px 10px;font-size:13px}",
      ".nyxpk-lbl{font-size:13px;color:var(--muted,#999);margin:4px 0 8px}",
      ".mopt{border:1px solid var(--line,#2a2a35);border-radius:12px;padding:12px;margin-bottom:10px;cursor:pointer;transition:.15s}",
      ".mopt:hover{border-color:var(--accent,#7c5cff)}",
      ".mopt.sel{border-color:var(--accent,#7c5cff);background:color-mix(in srgb,var(--accent,#7c5cff) 10%,transparent)}",
      ".mopt .top{display:flex;justify-content:space-between;align-items:center;gap:8px}",
      ".mopt .nm{font-weight:600;font-size:14px}",
      ".mopt .sz{font-size:12px;color:var(--muted,#999);margin-top:2px}",
      ".mopt .nt{font-size:12px;color:var(--muted,#999);margin-top:3px}",
      ".mbadge{font-size:11px;padding:2px 8px;border-radius:999px;white-space:nowrap;background:color-mix(in srgb,var(--accent2,#19e3b1) 20%,transparent);color:var(--accent2,#19e3b1);border:1px solid var(--accent2,#19e3b1)}",
      ".nyxpk-prog{margin-top:4px}",
      ".nyxpk-bar{height:8px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden;margin:8px 0}",
      ".nyxpk-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--accent,#7c5cff),var(--accent2,#19e3b1));transition:width .4s}",
      ".nyxpk-note{font-size:12px;color:var(--muted,#999)}",
      ".nyxpk-err{color:var(--bad,#ef4444)}",
      ".nyxpk-foot{display:flex;gap:10px;justify-content:flex-end;padding:14px 18px;border-top:1px solid var(--line,#2a2a35)}",
      ".nyxbtn{cursor:pointer;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:600;border:1px solid var(--line,#2a2a35);background:rgba(255,255,255,.05);color:var(--ink,#eee)}",
      ".nyxbtn:hover{background:rgba(255,255,255,.1)}",
      ".nyxbtn.pri{background:linear-gradient(90deg,var(--accent,#7c5cff),var(--accent2,#19e3b1));color:#0b0b12;border:none}",
      ".nyxbtn.pri[disabled]{opacity:.5;cursor:not-allowed}"
    ].join("");
    document.head.appendChild(s);
  }

  function onEsc(e){ if(e.key==="Escape") close(); }
  function close(){ if(pollT){ clearInterval(pollT); pollT=null; } var o=document.getElementById("nyx-picker"); if(o) o.remove(); document.removeEventListener("keydown", onEsc); }

  function open(){
    if(document.getElementById("nyx-picker")) return;
    css();
    var ov=document.createElement("div"); ov.id="nyx-picker"; ov.className="nyxpk-ov";
    var pn=document.createElement("div"); pn.className="nyxpk";
    pn.innerHTML =
      '<div class="nyxpk-h"><b>Модели Nyx</b><button class="nyxpk-x" id="nyxpk-close">\u00D7</button></div>'
      + '<div class="nyxpk-scroll">'
      + '<div id="nyxpk-hw" class="nyxpk-hw"></div>'
      + '<div id="nyxpk-ok"></div>'
      + '<div id="nyxpk-loc" class="nyxpk-loc"></div>'
      + '<div class="nyxpk-lbl">Выберите модель</div>'
      + '<div id="nyxpk-opts"></div>'
      + '<div id="nyxpk-prog" class="nyxpk-prog" style="display:none"></div>'
      + '</div>'
      + '<div class="nyxpk-foot"><button class="nyxbtn" id="nyxpk-close2">Закрыть</button><button class="nyxbtn pri" id="nyxpk-dl" disabled>Скачать</button></div>';
    ov.appendChild(pn); document.body.appendChild(ov);
    ov.addEventListener("click", function(e){ if(e.target===ov) close(); });
    document.addEventListener("keydown", onEsc);
    pn.querySelector("#nyxpk-close").addEventListener("click", close);
    pn.querySelector("#nyxpk-close2").addEventListener("click", close);
    pn.querySelector("#nyxpk-dl").addEventListener("click", doDownload);
    refresh();
  }
  window.nyxOpenPicker = open;

  function refresh(){ api("/api/setup/status").then(function(d){ DATA=d||{}; renderHW(); renderOK(); renderLoc(); renderOpts(); }); }

  function renderHW(){
    var el=document.getElementById("nyxpk-hw"); if(!el) return;
    var h=DATA.hardware||{}; var parts=[];
    if(h.cpu) parts.push(h.cpu);
    if(h.cores) parts.push(h.cores+" ядер");
    if(h.ramGB) parts.push(h.ramGB+" ГБ ОЗУ");
    if(h.gpu && h.gpu.length) parts.push(h.gpu[0]);
    el.textContent = parts.length ? ("Ваш ПК: "+parts.join(" \u00B7 ")) : "";
  }
  function renderOK(){
    var el=document.getElementById("nyxpk-ok"); if(!el) return;
    if(DATA.ready){ el.className="nyxpk-ok"; el.textContent="\u2713 Модель установлена и готова к работе"+(DATA.cachedModels&&DATA.cachedModels.length?": "+DATA.cachedModels[0]:""); }
    else { el.className=""; el.textContent=""; }
  }

  function renderLoc(){
    var el=document.getElementById("nyxpk-loc"); if(!el) return;
    var loc=DATA.location||{}; var dir=loc.cacheDir||"~/.qvac/models";
    if(editingLoc){
      el.innerHTML='<div class="t">Куда скачивать модели</div><div class="row"><input id="nyxpk-locin" value="'+esc(dir)+'" placeholder="Путь к папке"><button class="nyxbtn pri" id="nyxpk-locsave">Сохранить</button><button class="nyxbtn" id="nyxpk-loccancel">Отмена</button></div>';
      el.querySelector("#nyxpk-locsave").addEventListener("click", function(){ var v=el.querySelector("#nyxpk-locin").value; saveLoc(v); });
      el.querySelector("#nyxpk-loccancel").addEventListener("click", function(){ editingLoc=false; renderLoc(); });
    } else {
      el.innerHTML='<div class="t">Куда скачивать модели'+(loc.custom?' \u00B7 <span style="color:var(--accent2,#19e3b1)">своя папка</span>':"")+'</div><div class="p">'+esc(dir)+'</div><div class="row"><button class="nyxbtn" id="nyxpk-browse">Обзор\u2026</button><button class="nyxbtn" id="nyxpk-manual">Ввести путь</button></div>';
      el.querySelector("#nyxpk-browse").addEventListener("click", doBrowse);
      el.querySelector("#nyxpk-manual").addEventListener("click", function(){ editingLoc=true; renderLoc(); });
    }
  }
  function doBrowse(){
    api("/api/setup/browse","POST",{}).then(function(r){
      if(!r){ return; }
      if(r.path){ saveLoc(r.path); return; }
      if(r.electron===false){ editingLoc=true; renderLoc(); }
    });
  }
  function saveLoc(v){
    if(!v || !v.trim()) return;
    api("/api/setup/location","POST",{path:v.trim()}).then(function(r){ editingLoc=false; if(r && r.error){ alert(r.error); } refresh(); });
  }

  function renderOpts(){
    var el=document.getElementById("nyxpk-opts"); if(!el) return;
    var cat=DATA.catalog||[]; var rec=DATA.recommended||{};
    if(!selKey && rec.key) selKey=rec.key;
    el.innerHTML="";
    cat.forEach(function(c){
      var d=document.createElement("div"); d.className="mopt"+(c.key===selKey?" sel":"");
      var isRec = rec.key===c.key;
      d.innerHTML='<div class="top"><span class="nm">'+esc(c.label)+'</span>'+(isRec?'<span class="mbadge">Рекомендуем для вашего ПК</span>':'')+'</div>'
        + '<div class="sz">'+gb(c.approxGB)+' \u00B7 от '+c.ramMinGB+' ГБ ОЗУ</div>'
        + (c.note?'<div class="nt">'+esc(c.note)+'</div>':'');
      d.addEventListener("click", function(){ selKey=c.key; renderOpts(); updateBtn(); });
      el.appendChild(d);
    });
    updateBtn();
  }
  function updateBtn(){ var b=document.getElementById("nyxpk-dl"); if(b) b.disabled = !selKey; }

  function doDownload(){
    if(!selKey) return;
    var b=document.getElementById("nyxpk-dl"); if(b){ b.disabled=true; b.textContent="Скачиваем\u2026"; }
    api("/api/setup/download","POST",{model:selKey}).then(function(r){
      if(r && r.error){ showProg(0,"error",r.error); if(b){ b.disabled=false; b.textContent="Скачать"; } return; }
      startPoll();
    });
  }
  function showProg(pct, phase, note){
    var el=document.getElementById("nyxpk-prog"); if(!el) return;
    el.style.display="block";
    el.innerHTML='<div class="nyxpk-bar"><i style="width:'+(pct||0)+'%"></i></div><div class="nyxpk-note '+(phase==="error"?"nyxpk-err":"")+'">'+esc(note||"")+'</div>'
      + (phase==="error"?'<div style="margin-top:8px"><button class="nyxbtn" id="nyxpk-retry">Повторить</button></div>':'');
    if(phase==="error"){ var rt=el.querySelector("#nyxpk-retry"); if(rt) rt.addEventListener("click", doDownload); }
  }
  function startPoll(){
    if(pollT) clearInterval(pollT);
    showProg(0,"downloading","Начинаем загрузку\u2026");
    pollT=setInterval(function(){
      api("/api/setup/progress").then(function(p){
        if(!p) return;
        if(p.phase==="downloading"){ showProg(p.pct||0,"downloading", (p.note||"Загрузка")+" \u2014 "+(p.pct||0)+"%"); }
        else if(p.phase==="ready"){ clearInterval(pollT); pollT=null; showProg(100,"ready","\u2713 Готово! Модель установлена."); try { window.dispatchEvent(new Event("focus")); } catch(e){} refresh(); var b=document.getElementById("nyxpk-dl"); if(b){ b.textContent="Установлено"; } }
        else if(p.phase==="error"){ clearInterval(pollT); pollT=null; showProg(0,"error", p.error||"Ошибка загрузки"); var b2=document.getElementById("nyxpk-dl"); if(b2){ b2.disabled=false; b2.textContent="Скачать"; } }
      });
    },1200);
  }

  function wire(){
    var mp=document.getElementById("modelPill");
    if(mp){ mp.style.cursor="pointer"; mp.addEventListener("click", open); }
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();
