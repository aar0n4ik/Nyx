(function () {
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m];}); }

  function injectCss(n){
    var s=document.getElementById("nyx-cards-css"); if(!s){ s=document.createElement("style"); s.id="nyx-cards-css"; document.head.appendChild(s); }
    s.textContent=[
      ".models{grid-template-columns:repeat("+n+",minmax(0,1fr))}",
      "@media(max-width:860px){.models{grid-template-columns:1fr!important}}",
      ".mcard.rec{border-color:var(--text)}",
      ".mfor{color:var(--faint);font-size:13px;margin-top:14px;line-height:1.5}",
      ".mspec{margin-top:16px;display:flex;flex-direction:column;gap:8px}",
      ".mrow{display:flex;justify-content:space-between;gap:12px;font-size:13px;border-top:1px solid var(--line);padding-top:8px}",
      ".mrow .mk{color:var(--faint)}",
      ".mrow .mv{text-align:right}",
      ".mnote{margin-top:16px;font:600 11px/1 'JetBrains Mono',monospace;color:var(--faint);letter-spacing:.03em;text-transform:uppercase}"
    ].join("");
  }

  function card(m){
    var c=document.createElement("div"); c.className="mcard"+(m.recommended?" rec":"");
    var rows=[["Runs on",m.runs],["Memory",m.ram],["Feel",m.feel],["Best for",m.best]];
    var rowsHtml=rows.map(function(r){ return '<div class="mrow"><span class="mk">'+esc(r[0])+'</span><span class="mv">'+esc(r[1])+'</span></div>'; }).join("");
    c.innerHTML =
      (m.recommended && m.badge ? '<span class="mbadge">'+esc(m.badge)+'</span>' : '')
      + '<div class="mtier">'+esc(m.tier)+'</div>'
      + '<div class="msize">'+esc(m.label)+' \u00B7 '+esc(m.size)+'</div>'
      + '<div class="mfor">'+esc(m.forWho)+'</div>'
      + '<div class="mspec">'+rowsHtml+'</div>'
      + '<div class="mnote">Downloaded inside the app</div>';
    return c;
  }

  function build(){
    var data=window.NYX_MODELS; if(!data || !data.models || !data.models.length) return;
    var grid=document.querySelector(".models"); if(!grid) return;
    var models=data.models;
    injectCss(models.length);
    var oldCards=Array.prototype.slice.call(grid.querySelectorAll(".mcard"));
    var anchor=oldCards[0]||null;
    var frag=document.createDocumentFragment();
    models.forEach(function(m){ frag.appendChild(card(m)); });
    grid.insertBefore(frag, anchor);
    oldCards.forEach(function(n){ if(n.parentNode) n.parentNode.removeChild(n); });
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
