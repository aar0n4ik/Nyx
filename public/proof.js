(function () {
  "use strict";
  if (window.__nyxProof) return;
  window.__nyxProof = true;

  function elt(tag, style, text){ var e=document.createElement(tag); if(style)e.setAttribute("style",style); if(text!=null)e.textContent=text; return e; }
  function api(path, opts){ return fetch(path, opts).then(function(r){return r.json();}); }
  function num(x){ return (x==null?"—":String(x)); }

  var CARD="flex:1;min-width:130px;padding:16px 18px;border-radius:16px;background:rgba(127,127,127,.08);border:1px solid rgba(127,127,127,.16)";
  var BIG="font-size:28px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums";
  var SUB="margin-top:4px;font-size:12.5px;opacity:.62;line-height:1.35";
  var PANEL="margin-top:18px;padding:18px;border-radius:16px;background:rgba(127,127,127,.06);border:1px solid rgba(127,127,127,.16)";
  var BTN="padding:9px 16px;border-radius:10px;border:1px solid rgba(127,127,127,.25);background:transparent;color:inherit;cursor:pointer;font:inherit;font-size:13px;font-weight:600";
  var OUT="font-family:ui-monospace,Menlo,monospace;font-size:13px;white-space:pre-wrap;padding:12px 14px;border-radius:12px;background:rgba(127,127,127,.10);min-height:20px;opacity:.9;margin-top:12px;max-height:240px;overflow:auto";

  function statCard(v,l){ var c=elt("div",CARD); c.appendChild(elt("div",BIG,v)); c.appendChild(elt("div",SUB,l)); return c; }

  function fillMetrics(m){
    m=m||{};
    var vals=[num(m.installs), num(m.tasksDone), num(m.dangerousBlocked)];
    var bigs=document.querySelectorAll(".metric .big");
    var found=bigs.length>=3;
    if(found){ for(var i=0;i<3;i++) bigs[i].textContent=vals[i]; }
    var map={installs:m.installs, tasks:m.tasksDone, blocked:m.dangerousBlocked, activation:num(m.activationPct)+"%", queries:m.queries};
    Object.keys(map).forEach(function(k){ var ns=document.querySelectorAll('[data-nyx-metric="'+k+'"]'); for(var j=0;j<ns.length;j++) ns[j].textContent=num(map[k]); });
    return found;
  }

  function safetyPanel(){
    var safe=elt("div",PANEL);
    safe.appendChild(elt("div","font-weight:700;margin-bottom:4px","Check the safety yourself"));
    safe.appendChild(elt("div",SUB,"The command goes to the validator. Nothing runs — you only get the verdict."));
    var btns=elt("div","display:flex;flex-wrap:wrap;gap:10px;margin-top:14px");
    var out=elt("div",OUT);
    function mk(label,script){
      var b=elt("button",BTN,label);
      b.addEventListener("click",function(){
        out.textContent="Checking…";
        api("/api/agent/validate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({script:script,shell:"powershell"})})
        .then(function(d){ var v=(d&&d.verdict)||{}; var mark=v.safe?"ALLOWED":"BLOCKED"; var reasons=(v.reasons&&v.reasons.length)?("\n- "+v.reasons.join("\n- ")):""; out.textContent=mark+"  (risk: "+(v.risk||"?")+")\n$ "+script+reasons; })
        .catch(function(){ out.textContent="Server not responding — run: node server.js"; });
      });
      return b;
    }
    btns.appendChild(mk("Safe: read system info","Get-ComputerInfo | Select-Object CsName, OsName"));
    btns.appendChild(mk("Dangerous: wipe System32","Remove-Item -Recurse -Force C:\\Windows\\System32"));
    safe.appendChild(btns); safe.appendChild(out);
    return safe;
  }

  function copyPanel(){
    var copy=elt("div",PANEL);
    copy.appendChild(elt("div","font-weight:700;margin-bottom:4px","Your system in one file"));
    copy.appendChild(elt("div",SUB,"Nyx builds a tiny signed blueprint of this machine. Drop the file on a fresh PC and Nyx knows what to restore. Read-only, nothing runs."));
    var cbtns=elt("div","display:flex;flex-wrap:wrap;gap:10px;margin-top:14px");
    var cbtn=elt("button",BTN,"Build blueprint");
    var dl=elt("a",BTN+";text-decoration:none;display:none","Download .nyx");
    var cout=elt("div",OUT);
    cbtn.addEventListener("click",function(){
      cout.textContent="Scanning system…"; dl.style.display="none";
      api("/api/snapshot").then(function(d){
        if(!d||d.error||!d.snapshot){ cout.textContent="Could not build blueprint"+(d&&d.error?(": "+d.error):""); return; }
        cout.textContent=d.text||JSON.stringify(d.summary||d.snapshot,null,2);
        var blob=new Blob([JSON.stringify(d.snapshot,null,2)],{type:"application/json"});
        dl.href=URL.createObjectURL(blob); dl.download="nyx-system.nyx"; dl.style.display="inline-flex";
      }).catch(function(){ cout.textContent="Server not responding — run: node server.js"; });
    });
    cbtns.appendChild(cbtn); cbtns.appendChild(dl);
    copy.appendChild(cbtns); copy.appendChild(cout);
    return copy;
  }

  function run(){
    if(document.getElementById("nyx-live-proof")) return;
    var sec=elt("section","max-width:1080px;margin:20px auto 80px;padding:0 24px");
    sec.id="nyx-live-proof";
    var mount=function(){ var foot=document.querySelector("footer"); if(foot&&foot.parentNode) foot.parentNode.insertBefore(sec,foot); else (document.querySelector("main")||document.body).appendChild(sec); };
    function finish(m){
      var hasBuiltin=fillMetrics(m||{});
      if(!hasBuiltin){
        sec.appendChild(elt("div","font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.5","Live · signed on-device"));
        sec.appendChild(elt("h2","font-size:clamp(24px,4vw,34px);margin:8px 0 14px;letter-spacing:-.02em","Proof, not promises"));
        var row=elt("div","display:flex;flex-wrap:wrap;gap:12px");
        row.appendChild(statCard(num((m||{}).installs),"Testers onboarded (unique, signed)"));
        row.appendChild(statCard(num((m||{}).tasksDone),"Real tasks completed"));
        row.appendChild(statCard(num((m||{}).dangerousBlocked),"Dangerous commands blocked"));
        sec.appendChild(row);
      }
      sec.appendChild(safetyPanel());
      sec.appendChild(copyPanel());
      mount();
    }
    api("/api/metrics").then(finish).catch(function(){ finish({}); });
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",run);
  else run();
})();
