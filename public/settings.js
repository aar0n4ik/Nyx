(function () {
  var LANGS = [["en","English"],["ru","Русский"],["uk","Українська"],["es","Español"],["de","Deutsch"],["fr","Français"]];
  var ACCENTS = [["#7c5cff","#19e3b1"],["#2f8bfd","#19e3b1"],["#22c55e","#14b8a6"],["#f59e0b","#ef4444"],["#ff6b6b","#ffd166"],["#e879f9","#7c5cff"]];
  var mm = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var cur = "general";

  function ls(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function set(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
  function del(k){ try { localStorage.removeItem(k); } catch(e){} }
  function readLang(){ var l=(ls("nyx.lang")||ls("nyx-lang")||ls("lang")||"en").slice(0,2); for(var i=0;i<LANGS.length;i++) if(LANGS[i][0]===l) return l; return "en"; }

  var DICT = {
    en:{set:"Settings",general:"General",appearance:"Appearance",chat:"Chat",privacy:"Privacy",models:"Models",about:"About",lang:"Interface language",langD:"Only changes the app interface. Answers always match the language you write in.",theme:"Theme",light:"Light",dark:"Dark",system:"System",accent:"Accent color",font:"Font size",small:"Small",medium:"Medium",large:"Large",density:"Message density",cozy:"Cozy",compact:"Compact",clear:"Clear all chats",clearD:"Permanently delete every conversation on this device.",clearBtn:"Clear",startNew:"Open a new chat on launch",startND:"Start fresh each time Nyx opens.",privD:"Nyx runs fully on your device. Chats, snapshots and model weights never leave your PC.",snap:"Keep local system snapshots",snapD:"Lets Nyx restore your setup later. Stored locally only.",curModel:"Current model",notInst:"Not installed",manage:"Manage models",manageD:"Download or switch the on-device model. Downloads happen only inside the app.",ver:"Version",site:"Website",gh:"GitHub",engine:"Engine",done:"Done",reset:"Reset app",resetD:"Clear all local data and preferences on this device.",resetBtn:"Reset"},
    ru:{set:"Настройки",general:"Общие",appearance:"Вид",chat:"Чат",privacy:"Приватность",models:"Модели",about:"О программе",lang:"Язык интерфейса",langD:"Меняет только интерфейс приложения. Ответы всегда на том языке, на котором ты пишешь.",theme:"Тема",light:"Светлая",dark:"Тёмная",system:"Системная",accent:"Акцентный цвет",font:"Размер шрифта",small:"Мелкий",medium:"Средний",large:"Крупный",density:"Плотность сообщений",cozy:"Просторная",compact:"Компактная",clear:"Очистить все чаты",clearD:"Безвозвратно удалить все диалоги на этом устройстве.",clearBtn:"Очистить",startNew:"Новый чат при запуске",startND:"Начинать с чистого листа при каждом открытии Nyx.",privD:"Nyx работает полностью на твоём устройстве. Чаты, снимки и веса модели никогда не покидают ПК.",snap:"Хранить снимки системы",snapD:"Позволяет Nyx позже восстановить твою систему. Хранится только локально.",curModel:"Текущая модель",notInst:"Не установлена",manage:"Управление моделями",manageD:"Скачать или сменить модель на устройстве. Загрузка — только внутри приложения.",ver:"Версия",site:"Сайт",gh:"GitHub",engine:"Движок",done:"Готово",reset:"Сбросить приложение",resetD:"Очистить все локальные данные и настройки на этом устройстве.",resetBtn:"Сбросить"},
    uk:{set:"Налаштування",general:"Загальні",appearance:"Вигляд",chat:"Чат",privacy:"Приватність",models:"Моделі",about:"Про програму",lang:"Мова інтерфейсу",theme:"Тема",light:"Світла",dark:"Темна",system:"Системна",accent:"Акцентний колір",font:"Розмір шрифту",small:"Малий",medium:"Середній",large:"Великий",density:"Щільність",cozy:"Комфортна",compact:"Компактна",manage:"Керування моделями",done:"Готово"},
    es:{set:"Ajustes",general:"General",appearance:"Apariencia",chat:"Chat",privacy:"Privacidad",models:"Modelos",about:"Acerca de",lang:"Idioma de la interfaz",theme:"Tema",light:"Claro",dark:"Oscuro",system:"Sistema",accent:"Color de acento",font:"Tamaño de fuente",small:"Pequeño",medium:"Medio",large:"Grande",density:"Densidad",cozy:"Cómoda",compact:"Compacta",manage:"Gestionar modelos",done:"Listo"},
    de:{set:"Einstellungen",general:"Allgemein",appearance:"Darstellung",chat:"Chat",privacy:"Datenschutz",models:"Modelle",about:"Über",lang:"Oberflächensprache",theme:"Design",light:"Hell",dark:"Dunkel",system:"System",accent:"Akzentfarbe",font:"Schriftgröße",small:"Klein",medium:"Mittel",large:"Groß",density:"Dichte",cozy:"Bequem",compact:"Kompakt",manage:"Modelle verwalten",done:"Fertig"},
    fr:{set:"Paramètres",general:"Général",appearance:"Apparence",chat:"Chat",privacy:"Confidentialité",models:"Modèles",about:"À propos",lang:"Langue de l\u0027interface",theme:"Thème",light:"Clair",dark:"Sombre",system:"Système",accent:"Couleur d\u0027accent",font:"Taille du texte",small:"Petit",medium:"Moyen",large:"Grand",density:"Densité",cozy:"Confortable",compact:"Compacte",manage:"Gérer les modèles",done:"Terminé"}
  };
  function T(k){ var l=readLang(); return (DICT[l] && DICT[l][k]) || DICT.en[k] || k; }

  function applyTheme(mode){ var r = mode==="system" ? ((mm && mm.matches)?"dark":"light") : mode; document.documentElement.setAttribute("data-theme", r); set("nyx-theme", r); set("nyx.themeMode", mode); }
  function applyAccent(a){ if(!a) return; document.documentElement.style.setProperty("--accent", a[0]); document.documentElement.style.setProperty("--accent2", a[1]); }
  function applyFont(s){ document.documentElement.setAttribute("data-fontsize", s||"m"); }
  function applyDensity(d){ document.documentElement.setAttribute("data-density", d||"cozy"); }

  (function boot(){
    var tm = ls("nyx.themeMode"); if(tm) applyTheme(tm);
    var ac = ls("nyx.accent"); if(ac){ try { applyAccent(JSON.parse(ac)); } catch(e){} }
    applyFont(ls("nyx.fontsize")||"m");
    applyDensity(ls("nyx.density")||"cozy");
    if(mm && mm.addEventListener) mm.addEventListener("change", function(){ if(ls("nyx.themeMode")==="system") applyTheme("system"); });
  })();

  function css(){
    if(document.getElementById("nyx-settings-css")) return;
    var s=document.createElement("style"); s.id="nyx-settings-css";
    s.textContent=[
      ".topbar #lang,.topbar #themeBtn{display:none!important}",
      "[data-fontsize=s] .bubble{font-size:13px}[data-fontsize=l] .bubble{font-size:17px}",
      "[data-density=compact] .msg{margin:7px 0}[data-density=compact] .bubble{padding:8px 12px}",
      "#nyxSettingsBtn{cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;border:1px solid var(--line,#2a2a35);background:rgba(255,255,255,.04);color:var(--ink,#eee)}",
      "#nyxSettingsBtn:hover{background:rgba(255,255,255,.1)}",
      ".nyxset-ov{position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;background:rgba(6,6,10,.55);backdrop-filter:blur(6px);padding:20px}",
      ".nyxset{width:100%;max-width:860px;height:600px;max-height:88vh;display:flex;background:var(--panel,#14141b);color:var(--ink,#eee);border:1px solid var(--line,#2a2a35);border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.5);overflow:hidden}",
      ".nyxset-nav{width:216px;flex:none;border-right:1px solid var(--line,#2a2a35);padding:16px 10px;display:flex;flex-direction:column;gap:2px;background:rgba(0,0,0,.12)}",
      ".nyxset-nav h4{font-size:16px;margin:6px 10px 12px}",
      ".nsi{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;cursor:pointer;font-size:14px;color:var(--muted,#aaa)}",
      ".nsi:hover{background:rgba(255,255,255,.05);color:var(--ink,#eee)}",
      ".nsi.on{background:color-mix(in srgb,var(--accent,#7c5cff) 16%,transparent);color:var(--ink,#eee)}",
      ".nyxset-main{flex:1;display:flex;flex-direction:column;min-width:0}",
      ".nyxset-body{flex:1;overflow:auto;padding:22px 26px}",
      ".nsec{display:none}.nsec.on{display:block}",
      ".nsec h3{font-size:18px;margin:0 0 16px}",
      ".nrow{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 0;border-bottom:1px solid var(--line,#23232c)}",
      ".nrow:last-child{border-bottom:none}",
      ".nrow .lb{font-size:14px;font-weight:600}.nrow .ds{font-size:12px;color:var(--muted,#999);margin-top:3px;max-width:420px}",
      ".nrow .ctl{flex:none;display:flex;gap:8px;align-items:center}",
      ".nsel{background:rgba(0,0,0,.25);border:1px solid var(--line,#2a2a35);color:var(--ink,#eee);border-radius:9px;padding:8px 12px;font-size:14px}",
      ".seg{display:inline-flex;border:1px solid var(--line,#2a2a35);border-radius:10px;overflow:hidden}",
      ".seg button{background:transparent;border:none;color:var(--muted,#aaa);padding:8px 14px;font-size:13px;cursor:pointer}",
      ".seg button.on{background:color-mix(in srgb,var(--accent,#7c5cff) 22%,transparent);color:var(--ink,#eee)}",
      ".sw{display:flex;gap:8px}.sw b{width:26px;height:26px;border-radius:50%;cursor:pointer;border:2px solid transparent;display:inline-block}",
      ".sw b.on{border-color:var(--ink,#eee)}",
      ".nbtn{cursor:pointer;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:600;border:1px solid var(--line,#2a2a35);background:rgba(255,255,255,.05);color:var(--ink,#eee)}",
      ".nbtn:hover{background:rgba(255,255,255,.1)}",
      ".nbtn.danger{border-color:var(--bad,#ef4444);color:var(--bad,#ef4444)}",
      ".nbtn.pri{background:linear-gradient(90deg,var(--accent,#7c5cff),var(--accent2,#19e3b1));color:#0b0b12;border:none}",
      ".nyxset-foot{display:flex;justify-content:space-between;align-items:center;padding:14px 22px;border-top:1px solid var(--line,#2a2a35)}",
      ".nyxset-foot .pv{font-size:12px;color:var(--muted,#999)}",
      ".alink{color:var(--accent2,#19e3b1);text-decoration:none;font-size:13px;margin-right:14px}"
    ].join("");
    document.head.appendChild(s);
  }

  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m];}); }

  function seg(id, opts, val){
    var h = '<div class="seg" id="'+id+'">';
    for(var i=0;i<opts.length;i++) h += '<button data-v="'+opts[i][0]+'" class="'+(opts[i][0]===val?"on":"")+'">'+esc(opts[i][1])+'</button>';
    return h + '</div>';
  }
  function row(lb, ds, ctl){ return '<div class="nrow"><div><div class="lb">'+esc(lb)+'</div>'+(ds?'<div class="ds">'+esc(ds)+'</div>':'')+'</div><div class="ctl">'+ctl+'</div></div>'; }

  function build(){
    var ov=document.createElement("div"); ov.id="nyx-settings"; ov.className="nyxset-ov";
    var pn=document.createElement("div"); pn.className="nyxset";
    var navKeys=[["general","\u2699"],["appearance","\uD83C\uDFA8"],["chat","\uD83D\uDCAC"],["privacy","\uD83D\uDD12"],["models","\uD83E\uDDE0"],["about","\u2139"]];
    var nav='<h4>'+esc(T("set"))+'</h4>';
    for(var i=0;i<navKeys.length;i++) nav+='<div class="nsi'+(navKeys[i][0]===cur?" on":"")+'" data-s="'+navKeys[i][0]+'"><span>'+navKeys[i][1]+'</span><span>'+esc(T(navKeys[i][0]))+'</span></div>';

    var langOpts=""; for(var j=0;j<LANGS.length;j++) langOpts+='<option value="'+LANGS[j][0]+'"'+(LANGS[j][0]===readLang()?" selected":"")+'>'+esc(LANGS[j][1])+'</option>';
    var accHtml='<div class="sw" id="nyxAcc">'; var savedAcc=ls("nyx.accent");
    for(var a=0;a<ACCENTS.length;a++){ var on = savedAcc && savedAcc===JSON.stringify(ACCENTS[a]); accHtml+='<b data-i="'+a+'" class="'+(on?"on":"")+'" style="background:linear-gradient(135deg,'+ACCENTS[a][0]+','+ACCENTS[a][1]+')"></b>'; }
    accHtml+='</div>';

    var startNew = ls("nyx.startNew")==="1";
    var snapOn = ls("nyx.snapshots")!=="0";

    var body='';
    body+='<div class="nsec'+(cur==="general"?" on":"")+'" data-s="general"><h3>'+esc(T("general"))+'</h3>'
      + row(T("lang"), T("langD"), '<select class="nsel" id="nyxLang">'+langOpts+'</select>')
      + row(T("startNew"), T("startND"), seg("nyxStart",[["1",T("done").length?"On":"On"],["0","Off"]], startNew?"1":"0"))
      + '</div>';
    body+='<div class="nsec'+(cur==="appearance"?" on":"")+'" data-s="appearance"><h3>'+esc(T("appearance"))+'</h3>'
      + row(T("theme"), null, seg("nyxTheme",[["light",T("light")],["dark",T("dark")],["system",T("system")]], ls("nyx.themeMode")||"dark"))
      + row(T("accent"), null, accHtml)
      + row(T("font"), null, seg("nyxFont",[["s",T("small")],["m",T("medium")],["l",T("large")]], ls("nyx.fontsize")||"m"))
      + row(T("density"), null, seg("nyxDens",[["cozy",T("cozy")],["compact",T("compact")]], ls("nyx.density")||"cozy"))
      + '</div>';
    body+='<div class="nsec'+(cur==="chat"?" on":"")+'" data-s="chat"><h3>'+esc(T("chat"))+'</h3>'
      + row(T("clear"), T("clearD"), '<button class="nbtn danger" id="nyxClear">'+esc(T("clearBtn"))+'</button>')
      + '</div>';
    body+='<div class="nsec'+(cur==="privacy"?" on":"")+'" data-s="privacy"><h3>'+esc(T("privacy"))+'</h3>'
      + '<div class="ds" style="margin-bottom:8px">'+esc(T("privD"))+'</div>'
      + row(T("snap"), T("snapD"), seg("nyxSnap",[["1","On"],["0","Off"]], snapOn?"1":"0"))
      + '</div>';
    body+='<div class="nsec'+(cur==="models"?" on":"")+'" data-s="models"><h3>'+esc(T("models"))+'</h3>'
      + row(T("curModel"), T("manageD"), '<span class="ds" id="nyxCurModel">…</span>')
      + row(T("manage"), null, '<button class="nbtn pri" id="nyxManage">'+esc(T("manage"))+'</button>')
      + '</div>';
    var ver = (window.NYX_MODELS && window.NYX_MODELS.version) || "1.0";
    var eng = (window.NYX_MODELS && window.NYX_MODELS.engine) || "QVAC Fabric LLM";
    body+='<div class="nsec'+(cur==="about"?" on":"")+'" data-s="about"><h3>Nyx</h3>'
      + row(T("ver"), null, '<span class="ds">'+esc(ver)+'</span>')
      + row(T("engine"), null, '<span class="ds">'+esc(eng)+'</span>')
      + '<div class="nrow"><div><div class="lb">Links</div></div><div class="ctl"><a class="alink" target="_blank" href="https://nyx-beryl.vercel.app">'+esc(T("site"))+'</a><a class="alink" target="_blank" href="https://github.com/aar0n4ik/Nyx">'+esc(T("gh"))+'</a><a class="alink" target="_blank" href="https://qvac.tether.io">QVAC</a></div></div>'
      + row(T("reset"), T("resetD"), '<button class="nbtn danger" id="nyxReset">'+esc(T("resetBtn"))+'</button>')
      + '</div>';

    pn.innerHTML = '<div class="nyxset-nav" id="nyxNav">'+nav+'</div><div class="nyxset-main"><div class="nyxset-body">'+body+'</div><div class="nyxset-foot"><span class="pv">Nyx '+esc(ver)+' · on-device</span><button class="nbtn pri" id="nyxDone">'+esc(T("done"))+'</button></div></div>';
    ov.appendChild(pn); document.body.appendChild(ov);
    ov.addEventListener("click", function(e){ if(e.target===ov) close(); });
    document.addEventListener("keydown", onEsc);
    wireModal(pn);
  }

  function switchSec(pn, s){
    cur=s;
    var nav=pn.querySelectorAll(".nsi"); for(var i=0;i<nav.length;i++) nav[i].classList.toggle("on", nav[i].getAttribute("data-s")===s);
    var sec=pn.querySelectorAll(".nsec"); for(var j=0;j<sec.length;j++) sec[j].classList.toggle("on", sec[j].getAttribute("data-s")===s);
  }
  function bindSeg(pn, id, fn){
    var seg=pn.querySelector("#"+id); if(!seg) return;
    seg.addEventListener("click", function(e){ var b=e.target.closest("button"); if(!b) return; var bs=seg.querySelectorAll("button"); for(var i=0;i<bs.length;i++) bs[i].classList.remove("on"); b.classList.add("on"); fn(b.getAttribute("data-v")); });
  }

  function wireModal(pn){
    pn.querySelector("#nyxNav").addEventListener("click", function(e){ var it=e.target.closest(".nsi"); if(it) switchSec(pn, it.getAttribute("data-s")); });
    pn.querySelector("#nyxDone").addEventListener("click", close);

    pn.querySelector("#nyxLang").addEventListener("change", function(e){
      var v=e.target.value; set("nyx.lang",v); set("nyx-lang",v); set("lang",v);
      try { window.dispatchEvent(new Event("focus")); } catch(er){}
      close(); build();
    });
    bindSeg(pn,"nyxStart", function(v){ set("nyx.startNew", v); });
    bindSeg(pn,"nyxTheme", function(v){ applyTheme(v); });
    bindSeg(pn,"nyxFont", function(v){ applyFont(v); set("nyx.fontsize", v); });
    bindSeg(pn,"nyxDens", function(v){ applyDensity(v); set("nyx.density", v); });
    bindSeg(pn,"nyxSnap", function(v){ set("nyx.snapshots", v); });

    var acc=pn.querySelector("#nyxAcc");
    if(acc) acc.addEventListener("click", function(e){ var b=e.target.closest("b"); if(!b) return; var i=+b.getAttribute("data-i"); var bs=acc.querySelectorAll("b"); for(var k=0;k<bs.length;k++) bs[k].classList.remove("on"); b.classList.add("on"); applyAccent(ACCENTS[i]); set("nyx.accent", JSON.stringify(ACCENTS[i])); });

    var clr=pn.querySelector("#nyxClear");
    if(clr) clr.addEventListener("click", function(){ if(confirm(T("clearD"))){ del("nyx.chats"); location.reload(); } });
    var mng=pn.querySelector("#nyxManage");
    if(mng) mng.addEventListener("click", function(){ close(); if(window.nyxOpenPicker) window.nyxOpenPicker(); });
    var rst=pn.querySelector("#nyxReset");
    if(rst) rst.addEventListener("click", function(){ if(confirm(T("resetD"))){ try { var ks=[]; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k && k.indexOf("nyx")===0) ks.push(k); } ks.forEach(function(k){ del(k); }); } catch(e){} location.reload(); } });

    var cm=pn.querySelector("#nyxCurModel");
    if(cm) fetch("/api/model/status").then(function(r){return r.json();}).then(function(s){ cm.textContent = (s && s.ready && s.model) ? s.model : T("notInst"); }).catch(function(){ cm.textContent=T("notInst"); });
  }

  function onEsc(e){ if(e.key==="Escape") close(); }
  function close(){ var o=document.getElementById("nyx-settings"); if(o) o.remove(); document.removeEventListener("keydown", onEsc); }
  function open(){ if(document.getElementById("nyx-settings")) return; css(); build(); }
  window.nyxOpenSettings = open;

  function wire(){
    css();
    var bar=document.querySelector(".topbar");
    if(bar && !document.getElementById("nyxSettingsBtn")){
      var b=document.createElement("button"); b.id="nyxSettingsBtn"; b.title=T("set");
      b.innerHTML="<svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'/></svg>";
      b.addEventListener("click", open);
      bar.appendChild(b);
    }
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();
