try{
(function(){
"use strict";
var $=function(s,r){return (r||document).querySelector(s)},
    $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
/* hidden is an HTMLElement property. SVG elements do not have it, so set the attribute. */
function hide(el,on){ if(!el) return; if(on) el.setAttribute("hidden",""); else el.removeAttribute("hidden"); }

/* ---- storage, best effort ---------------------------------------------------------- */
var KEY="patandfam.diabetes.v1", state={seen:{},opened:{},lens:null,theme:null,notes:{},vivas:[],mcq:{},praised:{},hl:{},cued:{},pct:{},signup:{},exams:{},fc:{},mine:{},read:{},chk:{},tried:{},gameBest:0,wallYears:0,lesionBest:0};
function load(){try{var r=localStorage.getItem(KEY); if(r){var p=JSON.parse(r);
  if(p&&typeof p==="object"){state.seen=p.seen||{};state.opened=p.opened||{};state.lens=p.lens||null;state.at=p.at||null;state.atT=p.atT||0;state.theme=p.theme||null;state.notes=p.notes||{};
    state.vivas=p.vivas||[];state.mcq=p.mcq||{};state.read=p.read||{};state.chk=p.chk||{};state.praised=p.praised||{};state.pct=p.pct||{};state.cued=p.cued||{};state.vivaHide=!!p.vivaHide;state.signup=p.signup||{};state.time=p.time||0;state.hl=p.hl||{};state.gameBest=p.gameBest||0;state.wallYears=p.wallYears||0;state.lesionBest=p.lesionBest||0;state.exams=p.exams||{};state.fc=p.fc||{};state.mine=p.mine||{};state.tried=p.tried||{};}}}catch(e){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){storageOk=false;}
  if(window.pfSync) window.pfSync(); nbCount();}
var storageOk=true;
/* the timed exams (build/exam.py) run in their own script and keep their results here too */
/* try first: without an account, a few questions, two stations and one viva topic; then a free
   account carries on. Signed in means the account script has a user, or Supabase left a session */
var FREE={mcq:3,stations:2,viva:1};
function signedIn(){ if(window.pfUser&&window.pfUser()) return true;
  try{ for(var i=0;i<localStorage.length;i++) if(/^sb-.*-auth-token$/.test(localStorage.key(i))) return true; }catch(e){}
  return false; }
function gate(){ if(signedIn()) return false;
  if(window.pfOpenAccount) window.pfOpenAccount({title:uiStr("gate_title"),text:uiStr("gate_text")}); return true; }
window.pfApp={state:state,save:save,gate:gate,vivaStart:function(){ vvStart(); }};
try{ localStorage.setItem(KEY+".p","1"); localStorage.removeItem(KEY+".p"); }catch(e){ storageOk=false; }
load();

/* ---- theme ------------------------------------------------------------------------- */
/* light or dark is one choice for the whole site, kept under its own key; older visits kept it in
   the module's record, which still counts until the student chooses again */
var THEME_KEY="patandfam.theme";
function themePref(){ try{ return localStorage.getItem(THEME_KEY); }catch(e){ return null; } }
function setTheme(t){ if(t){document.documentElement.setAttribute("data-theme",t);}
  else {document.documentElement.removeAttribute("data-theme");}
  state.theme=t; save(); try{ if(t) localStorage.setItem(THEME_KEY,t); }catch(e){}
  var b=$("#themeb"); if(b){var d=isDark(); b.setAttribute("aria-checked", d?"true":"false");} }
function isDark(){ var t=document.documentElement.getAttribute("data-theme");
  return t?t==="dark":!!(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches); }
if(themePref()||state.theme) setTheme(themePref()||state.theme);
else { var _b=$("#themeb"); if(_b){ _b.setAttribute("aria-checked",isDark()?"true":"false"); } }

/* ---- lens switching ---------------------------------------------------------------- */
/* Moving between lenses makes a real history entry, and each entry remembers how far down the
   page the reader was. So the device's back button, or a swipe back, returns to the same spot. */
try{ history.scrollRestoration="manual"; }catch(e){}
function show(id, how){
  how=how||{};
  var prev=state.lens;
  if(how.push&&prev&&prev!==id){
    var pL=$("#L-"+prev), pPg=pL&&pL.classList.contains("paged")?+(pL.getAttribute("data-pg")||0):null;
    try{ history.replaceState({lens:prev,y:window.scrollY,pg:pPg},"","#"+prev);
         history.pushState({lens:id,y:0},"","#"+id); }catch(e){}
  } else if(!how.pop){
    try{ history.replaceState({lens:id,y:0},"","#"+id); }catch(e){}
  }
  $$(".lens").forEach(function(s){ hide(s, s.id!=="L-"+id); });
  $$(".rail a").forEach(function(a){
    var on = a.getAttribute("data-lens")===id;
    a.setAttribute("aria-current", on?"page":"false"); });
  var crumb=$("#crumb"); var cur=$("#L-"+id);
  /* the module is always named; the lens follows it, except on the module's own introduction */
  if(crumb&&cur) crumb.textContent = id==="orientation" ? "" : (cur.getAttribute("data-title")||"");
  // the logo's slash takes the colour of the open lens
  var isLens=cur&&cur.hasAttribute("style")&&/--lens:/.test(cur.getAttribute("style"));
  document.documentElement.style.setProperty("--logo-slash", isLens ? "var(--lens-"+id+")" : "");
  if($$("#L-"+id+" .sec[id]").length&&!(state.at&&$("#L-"+id+" #"+state.at))){ state.at=null; state.atT=Date.now(); }
  state.lens=id; save();
  var ml=$("#menub-l"); /* the names students use, short enough for the phone's top bar */
  if(ml&&cur) ml.textContent=cur.getAttribute("data-short")||(cur.getAttribute("data-title")||"").split(" and ")[0];
  if(id==="notes") nbRender();
  if(id==="cards") fcOpen();
  window.scrollTo(0, how.pop?(how.y||0):0);
  document.body.classList.toggle("has-pg", !!(cur&&cur.hasAttribute("data-paged")));
  if(cur&&cur.hasAttribute("data-paged")&&!how.keepPage){
    var secs=pgSecs(cur), at=state.at&&$("#L-"+id+" #"+state.at), k=at?secs.indexOf(at.closest(".sec")):-1;
    page(id, how.pop&&how.pg!=null?how.pg:Math.max(0,k), {noScroll:true});
  }
  markSeen(id);
}

/* ---- paged lenses: one section at a time ----------------------------------------------- */
/* Every section stays in the page, so search, highlights, notes and links find it; only the one
   being read is shown. Before the first section sit the lens's video and introduction; after the
   last, its notes and the way on. */
function pgSecs(L){ return $$(".sec",L).filter(function(s){ return s.parentNode===L&&!s.classList.contains("np-wrap"); }); }
function page(id,i,o){
  o=o||{}; var L=$("#L-"+id); if(!L||!L.hasAttribute("data-paged")) return;
  var secs=pgSecs(L), n=secs.length; i=Math.max(0,Math.min(n-1,i));
  L.classList.add("paged"); L.classList.toggle("pg-first",i===0); L.classList.toggle("pg-last",i===n-1);
  secs.forEach(function(s,k){ s.classList.toggle("pg-off",k!==i); });
  /* a section counts as read once its page has been opened, whatever order they're read in */
  var key=function(k){ return secs[k].hasAttribute("data-checks")||!secs[k].id?id+":checks":secs[k].id; };
  state.read=state.read||{}; if(!state.read[key(i)]) state.read[key(i)]=Date.now();
  $$(".pg-seg",L).forEach(function(b,k){ b.classList.toggle("done",k!==i&&!!state.read[key(k)]); b.classList.toggle("on",k===i);
    if(k===i) b.setAttribute("aria-current","step"); else b.removeAttribute("aria-current"); });
  $$(".toc li",L).forEach(function(li,k){ li.classList.toggle("read",!!state.read[key(k)]);
    var a=$("a",li); if(a){ if(k===i) a.setAttribute("aria-current","true"); else a.removeAttribute("aria-current"); } });
  var c=$(".pg-n",L); if(c){ $(".pg-n-c",c).textContent=c.getAttribute("data-of").replace("{i}",i+1).replace("{n}",n);
    var h=$("h2",secs[i]); $(".pg-n-t",c).textContent=h?(h.lastChild&&h.lastChild.textContent||h.textContent):""; }
  pgMissed(L); pgTopics(L,false);
  var back=$(".pg-b[data-pd='-1']",L), nx=$(".pg-b[data-pd='1']",L);
  if(back) back.style.visibility=i===0?"hidden":"";
  if(nx){ var last=i===n-1, ln=nx.getAttribute("data-lensnext");
    nx.hidden=last&&!ln; $("span",nx).textContent=last&&ln?ln:nx.getAttribute("data-next");
    /* on the last page Next goes on to the next lens, in that lens's colour */
    var nl=nx.getAttribute("data-nextlens"); nx.classList.toggle("to-lens",last&&!!nl);
    if(last&&nl) nx.style.setProperty("--lens","var(--lens-"+nl+")"); else nx.style.removeProperty("--lens"); }
  L.setAttribute("data-pg",i);
  if(secs[i]&&secs[i].id){ state.at=secs[i].id; state.atT=Date.now(); save(); }
  try{ history.replaceState({lens:id,y:0,pg:i},"",location.hash); }catch(e){}
  if(!o.noScroll){ window.scrollTo(0,0);
    /* a reader using the keyboard or a screen reader lands on the new section's heading */
    var hd=$("h2",secs[i]); if(hd){ hd.setAttribute("tabindex","-1"); try{ hd.focus({preventScroll:true}); }catch(e){} } }
}
/* a section where a quick check was missed, and not since put right, is marked in the topics list */
function pgMissed(L){ if(!L) return; var miss={};
  Object.keys(state.chk||{}).forEach(function(k){ var r=state.chk[k]; if(r&&!r.ok&&!r.fx) miss[r.s]=1; });
  $$(".toc li",L).forEach(function(li){ var a=$("a",li), id=a&&(a.getAttribute("href")||"").slice(1);
    li.classList.toggle("miss",!!miss[id]); if(a){ if(miss[id]) a.setAttribute("title",L.getAttribute("data-missed")||""); else a.removeAttribute("title"); } });
  var any=$$(".toc li.miss",L).length>0, b=$(".pg-n",L); if(b) b.classList.toggle("has-miss",any);
  /* the end of the lens lists the sections to go back to, and shows nothing when there are none */
  var rv=$(".le-rev",L); if(rv){ var lst=$(".le-rev-l",rv); lst.innerHTML="";
    $$(".toc li.miss a",L).forEach(function(a){ var r=document.createElement("a"); r.className="rr-link";
      r.href=a.getAttribute("href"); r.setAttribute("data-lens",a.getAttribute("data-lens"));
      r.textContent=a.textContent; var ar=document.createElement("span"); ar.setAttribute("aria-hidden","true"); ar.textContent=" \u2192";
      r.appendChild(ar); lst.appendChild(r); });
    hide(rv,!any); } }
/* the list of the lens's topics, opened from the count in the footer */
function pgTopics(L,open){ if(!L) return; var was=L.classList.contains("toc-open"); L.classList.toggle("toc-open",open);
  var b=$(".pg-n",L); if(b) b.setAttribute("aria-expanded",open?"true":"false");
  /* the list sits at the top of the lens, the button at the foot: focus goes into the list, and back to the button */
  var t=$(".toc",L);
  if(open&&!was&&t){ var a=$('a[aria-current="true"]',t)||$("a",t); if(a) a.focus({preventScroll:true}); }
  else if(!open&&was&&t&&t.contains(document.activeElement)&&b) b.focus({preventScroll:true}); }
document.addEventListener("click",function(ev){
  var L=$("#L-"+state.lens); if(!L||!L.classList.contains("paged")) return;
  var b=ev.target.closest&&ev.target.closest(".pg-n");
  if(b) return pgTopics(L,!L.classList.contains("toc-open"));
  if(L.classList.contains("toc-open")&&!(ev.target.closest&&ev.target.closest(".toc"))) pgTopics(L,false);
});
document.addEventListener("keydown",function(ev){ if(ev.key==="Escape") pgTopics($("#L-"+state.lens),false); });
function pgStep(d){
  var L=$("#L-"+state.lens); if(!L||!L.classList.contains("paged")) return false;
  var i=+(L.getAttribute("data-pg")||0)+d, n=pgSecs(L).length;
  if(i>=n){ var nx=$(".pg-b[data-nextlens]",L), nl=nx&&nx.getAttribute("data-nextlens");
    if(nl) show(nl,{push:true}); return true; }
  if(i<0) return true;
  page(state.lens,i); return true;
}
/* bring a target into view: in a paged lens, turn to its section first */
function reveal(el){
  var L=el&&el.closest&&el.closest(".lens"); if(!L||!L.hasAttribute("data-paged")) return;
  var s=el.closest(".sec"), k=pgSecs(L).indexOf(s);
  if(k>=0&&+(L.getAttribute("data-pg")||-1)!==k) page(L.id.slice(2),k,{noScroll:true});
}
document.addEventListener("keydown",function(ev){
  if(ev.metaKey||ev.ctrlKey||ev.altKey) return;
  if(ev.key!=="ArrowRight"&&ev.key!=="ArrowLeft") return;
  var t=ev.target; if(t&&t.closest&&t.closest("input,textarea,select,video,audio,[role=tab],[contenteditable],.lb,#srwrap,#vvx,.pv")) return;
  if(pgStep(ev.key==="ArrowRight"?1:-1)) ev.preventDefault();
});
/* a swipe across the screen turns the page, unless it starts on something that moves sideways itself */
var _sx=null,_sy=null;
document.addEventListener("touchstart",function(ev){
  var t=ev.target; if(ev.touches.length!==1||(t.closest&&t.closest("input,textarea,.tbl,.tbl-wrap,.sl-range,.gz,.fig-img,.cards,.lb,.pv,table"))){ _sx=null; return; }
  _sx=ev.touches[0].clientX; _sy=ev.touches[0].clientY; },{passive:true});
document.addEventListener("touchend",function(ev){
  if(_sx==null) return; var dx=ev.changedTouches[0].clientX-_sx, dy=ev.changedTouches[0].clientY-_sy; _sx=null;
  if(Math.abs(dx)>70&&Math.abs(dx)>2*Math.abs(dy)) pgStep(dx<0?1:-1); },{passive:true});
window.addEventListener("popstate",function(ev){
  var st=ev.state, id=st&&st.lens||(location.hash||"").slice(1);
  if(!$("#L-"+id)) return;
  closePivot(); show(id,{pop:true,y:st?st.y:0,pg:st?st.pg:null});
});
/* keep the current entry's position fresh, so leaving it saves where the reader was */
var _yT=null;
window.addEventListener("scroll",function(){ clearTimeout(_yT); _yT=setTimeout(function(){
  var _L=$("#L-"+state.lens), _pg=_L&&_L.classList.contains("paged")?+(_L.getAttribute("data-pg")||0):null;
  try{ history.replaceState({lens:state.lens,y:window.scrollY,pg:_pg},"",location.hash); }catch(e){}
  if(_pg!=null) return;
  /* the section being read, so the modules page can offer to continue from it */
  var at=null; $$("#L-"+state.lens+" .sec[id]").forEach(function(s){ if(s.getBoundingClientRect().top<140) at=s.id; });
  if(at&&at!==state.at){ state.at=at; state.atT=Date.now(); save(); } },250); },{passive:true});
function markSeen(id){
  var sec=$("#L-"+id); if(!sec) return;
  state.seen[id]=state.seen[id]||{};
  save(); ring(id);
}
/* ---- praise: a short note at the moments that count, each shown once ---------------- */
var _toastT=null;
function toast(msg,lens){ var t=$("#toast"); if(!t||!msg) return; t.textContent=msg;
  if(lens) t.style.setProperty("--lens","var(--lens-"+lens+")"); else t.style.removeProperty("--lens");
  hide(t,false); t.classList.remove("in"); void t.offsetWidth; t.classList.add("in");
  clearTimeout(_toastT); _toastT=setTimeout(function(){ t.classList.remove("in"); setTimeout(function(){ hide(t,true); },300); },4200); }
function praiseOnce(key,msg,lens){ if(state.praised[key]) return; state.praised[key]=1; save(); toast(msg,lens); }
function uiStr(k){ try{ return (JSON.parse($("#viva-ui").textContent)||{})[k]||""; }catch(e){ return ""; } }
function ring(id){
  var sec=$("#L-"+id); if(!sec) return;
  var total=$$("[data-track]",sec).length, done=Object.keys(state.seen[id]||{}).length;
  var r=$(".ring[data-lens='"+id+"']"); if(!r||!total) return;
  var pct=Math.min(1,done/total), c=r.querySelector(".ring-p");
  state.pct=state.pct||{}; if(state.pct[id]!==Math.round(pct*100)){ state.pct[id]=Math.round(pct*100); save(); }
  if(c){ var len=2*Math.PI*7; c.style.strokeDasharray=len.toFixed(1);
         c.style.strokeDashoffset=(len*(1-pct)).toFixed(1); }
  r.setAttribute("aria-label", Math.round(pct*100)+"% of this lens opened");
  if(pct>=1&&id!=="assessment"&&id!=="orientation")
    praiseOnce("lens:"+id, uiStr("lens_done_toast").replace("{lens}",titleOf(id)), id);
}
function track(lensId,key){
  if(!lensId) return;
  state.seen[lensId]=state.seen[lensId]||{}; state.seen[lensId][key]=1; save(); ring(lensId);
}
function lensOf(el){ var s=el.closest(".lens"); return s?s.id.replace(/^L-/,""):null; }


/* ---- notes and the deck they leave with ------------------------------------------- */
/* Nothing here reaches a network. The notes live in this browser, for this copy of the
   file, which is why export is the loud button and not the quiet one. */
function titleOf(id){ var s=$("#L-"+id); return s?(s.getAttribute("data-title")||id):id; }
function notesList(){
  return $$(".np").map(function(t){
    var id=t.getAttribute("data-np"), v=(state.notes[id]||"").trim();
    var h=hlOf(id).map(function(x){ return "> "+x.t.replace(/\s+/g," ")+(x.n?"\n\n"+x.n.trim():""); });
    if(h.length) v=(v?v+"\n\n":"")+h.join("\n\n");
    return v?{id:id,title:titleOf(id),text:v}:null; }).filter(Boolean);
}
function deckData(){ var el=$("#deck"), d=[];
  try{ d=el?JSON.parse(el.textContent)||[]:[]; }catch(e){}
  return d.concat(mineCards()); }
/* the cards a student saved from a key facts box or a flip card, tagged like the module's own */
function mineCards(){ return Object.keys(state.mine||{}).filter(function(k){ return !state.mine[k].off; }).map(function(k){
  var m=state.mine[k]; return {f:m.f,b:m.b,t:["diabetes::"+m.l,"diabetes::sec::"+m.s,"diabetes::mine"]}; }); }
function mineMarks(){ $$(".kf-save").forEach(function(b){ var m=state.mine[b.getAttribute("data-save")];
  b.setAttribute("aria-pressed",m&&!m.off?"true":"false"); }); }
function mineToggle(b){ var k=b.getAttribute("data-save"), m=state.mine[k];
  if(m&&!m.off){ state.mine[k]={off:1,at:Date.now()}; }
  else { var ln=b.closest(".lens"), sc=b.closest(".sec");
    state.mine[k]={f:esc(b.getAttribute("data-f")),b:b.getAttribute("data-b"),l:ln?ln.id.replace(/^L-/,""):"",s:sc?sc.id:"",at:Date.now()};
    toast(b.getAttribute("data-done")||"",""); }
  save(); mineMarks(); if(typeof fcChips==="function") fcChips(); }
mineMarks();
function fld(x){ return String(x).replace(/[\t\r]/g," ").replace(/\n/g,"<br>"); }
function ankiFile(withNotes){
  var rows=["#separator:tab","#html:true","#deck:Diabetes mellitus","#tags column:3"];
  deckData().forEach(function(c){ rows.push(fld(c.f)+"\t"+fld(c.b)+"\t"+c.t.join(" ")); });
  if(withNotes) notesList().forEach(function(n){
    rows.push(fld("Your note on "+n.title)+"\t"+fld(esc(n.text))+"\tdiabetes diabetes::note"); });
  return rows.join("\n")+"\n";
}
function esc(x){ return String(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function notesFile(){
  var out=["# Diabetes mellitus, through four lenses","","My notes.",""];
  notesList().forEach(function(n){ out.push("## "+n.title,"",n.text,""); });
  if(out.length===4) out.push("_Nothing written yet._","");
  return out.join("\n");
}
function dl(name,text,mime){
  var b=new Blob([text],{type:mime+";charset=utf-8"}), u=URL.createObjectURL(b);
  var a=document.createElement("a"); a.href=u; a.download=name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(u); },1000);
}
function openExport(){
  var n=notesList().length, c=deckData().length, T={};
  try{ T=JSON.parse($("#ex-ui").textContent); }catch(e){}
  $("#ex-cards").textContent=(T.export_cards||"{n}").replace("{n}",c);
  $("#ex-nn").textContent=n?(n===1?T.export_notes_one:(T.export_notes_many||"").replace("{n}",n)):T.export_notes_none;
  /* nothing to download, or to add to the deck, until a note exists */
  $("#ex-notes").disabled=!n; var inc=$("#ex-inc"); inc.disabled=!n; if(!n) inc.checked=false;
  inc.closest("label").classList.toggle("off",!n);
  hide($("#ex-warn"), storageOk);
  var was=$("#exwrap").hasAttribute("hidden"); hide($("#exwrap"), false); if(was) modal(true,$("#exwrap"));
  var b=$("#ex-close"); if(b) b.focus();
}
function closeExport(){ var w=$("#exwrap"); if(!w||w.hasAttribute("hidden")) return;
  hide(w, true); modal(false); var b=$("#expb"); if(b) b.focus(); }
/* the page behind a dialog goes inert (build/account.py defines it; a page without it just skips) */
function modal(on,el){ if(window.pfModal) window.pfModal(on,el); }
/* a scroll glides, unless the reader asked their phone for less motion */
function glide(){ return window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"; }

/* ---- steppers and the flow charts they light --------------------------------------- */
function step(gid,i){
  var root=$("#"+gid); if(!root) return;
  var panes=$$(".step[data-st='"+gid+"']"), n=panes.length;
  i=Math.max(0,Math.min(n-1,i));
  panes.forEach(function(p,k){ hide(p, k!==i); });
  // the chain: steps before this one are done, this one is open
  $$(".ch-i[data-st='"+gid+"']").forEach(function(li,k){
    li.classList.toggle("done",k<i); li.classList.toggle("on",k===i);
    if(k===i) li.setAttribute("aria-current","step"); else li.removeAttribute("aria-current");
    var b=$(".ch-b",li); if(b) b.setAttribute("aria-expanded",k===i?"true":"false"); });
  // beside a flow chart: how far along
  var c=$(".st-count b",root); if(c) c.textContent=i+1;
  var bar=$(".st-bar",root); if(bar) bar.style.setProperty("--p",((i+1)/n*100).toFixed(1)+"%");
  var fid=root.getAttribute("data-flow");
  if(fid){
    $$(".fl-node[data-flow='"+fid+"']").forEach(function(x){ x.classList.remove("lit"); });
    var lights=(panes[i].getAttribute("data-lights")||"").split(/\s+/);
    lights.forEach(function(id){ var el=id&&document.getElementById(id); if(el) el.classList.add("lit"); });
    /* on a phone the chart scrolls in its own frame: bring the lit box to its middle, without moving the page */
    var lit=$(".fl-node.lit[data-flow='"+fid+"']"), box=lit&&lit.closest(".dgm-wrap");
    if(box&&box.scrollHeight>box.clientHeight+1){
      var top=lit.getBoundingClientRect().top-box.getBoundingClientRect().top+box.scrollTop;
      box.scrollTo({top:Math.max(0,top-(box.clientHeight-lit.offsetHeight)/2),behavior:glide()}); }
  }
  track(lensOf(root), gid+":"+i);
}

/* ---- sliders, including the two drawn diagrams ------------------------------------- */
function slide(gid,i){
  var root=$("#"+gid); if(!root) return;
  var stops=$$(".stop[data-sl='"+gid+"']"); i=Math.max(0,Math.min(stops.length-1,i));
  stops.forEach(function(s,k){ hide(s, k!==i); });
  $$(".tick[data-sl='"+gid+"']").forEach(function(t,k){ t.setAttribute("aria-current",k===i?"true":"false"); });
  var r=$(".sl-range[data-sl='"+gid+"']"); if(r&&+r.value!==i) r.value=i;
  var ctl=$(".sl-ctl",root); if(ctl) ctl.style.setProperty("--f", stops.length>1 ? i/(stops.length-1) : 0);
  $$(".gi-frame",root).forEach(function(f,k){ hide(f, k!==i); });
  var rt=$(".rt",root);
  if(rt){ var x0=54,w=46, now=rt.querySelector(".rt-now");
          var month=[0,1,2,4,6][i]; if(now){ now.setAttribute("x1",x0+month*w); now.setAttribute("x2",x0+month*w); }
          $$(".rt-bar",rt).forEach(function(b){
            var spans=+b.getAttribute("width")/w; b.classList.toggle("off", month>spans); }); }
  track(lensOf(root), gid+":"+i);
}

/* ---- video posters: each loads when its video comes near the screen (build.py, video_html) ---- */
(function(){ var vs=$$("video[data-poster]"); if(!vs.length) return;
  function put(v){ if(v.getAttribute("data-poster")){ v.poster=v.getAttribute("data-poster"); v.removeAttribute("data-poster"); } }
  if(!("IntersectionObserver" in window)) return vs.forEach(put);
  var io=new IntersectionObserver(function(es){ es.forEach(function(en){ if(en.isIntersecting){ put(en.target); io.unobserve(en.target); } }); },
    {rootMargin:"400px 0px"});
  vs.forEach(function(v){ io.observe(v); }); })();

/* ---- everything else --------------------------------------------------------------- */
function tabTo(gid,i){
  $$(".pane[data-tb='"+gid+"']").forEach(function(p,k){ hide(p, k!==i); });
  $$(".tab[data-tb='"+gid+"']").forEach(function(t,k){ t.setAttribute("aria-selected",k===i?"true":"false"); t.tabIndex=k===i?0:-1; });
  track(lensOf($("#"+gid)), gid+":"+i);
}
/* the tabs' own keys: arrows move along the row, Home and End jump to its ends */
document.addEventListener("keydown",function(ev){
  var t=ev.target; if(!t||!t.matches||!t.matches("[role=tab].tab")) return;
  var all=$$(".tab[data-tb='"+t.getAttribute("data-tb")+"']"), k=all.indexOf(t), n=all.length, j=null;
  if(ev.key==="ArrowRight") j=(k+1)%n; else if(ev.key==="ArrowLeft") j=(k-1+n)%n;
  else if(ev.key==="Home") j=0; else if(ev.key==="End") j=n-1;
  if(j===null) return; ev.preventDefault(); tabTo(t.getAttribute("data-tb"),j); all[j].focus();
});
function pin(gid,i){
  $$(".hs-cap[data-hs='"+gid+"']").forEach(function(c,k){ hide(c, k!==i); });
  $$(".pin[data-hs='"+gid+"']").forEach(function(p,k){ p.classList.toggle("on",k===i); });
  $$(".hs-jump[data-hs='"+gid+"']").forEach(function(p,k){ p.classList.toggle("on",k===i); });
  var hint=$("#"+gid+" .hs-hint"); hide(hint, true);
  track(lensOf($("#"+gid)), gid+":"+i);
}
/* find it on the slide: the labels go, and the student taps each feature as it's named */
var HS={};
function hsLabel(p){ return (p.getAttribute("data-label")||p.getAttribute("aria-label")||"").replace(/^[^:]*:\s*/,""); }
function hsStart(gid){
  var root=$("#"+gid), pins=$$(".pin[data-hs='"+gid+"']"); if(!root||!pins.length) return;
  pins.forEach(function(p,k){ if(!p.getAttribute("data-label")) p.setAttribute("data-label",p.getAttribute("aria-label"));
    p.setAttribute("aria-label","Marker"); p.classList.remove("on","ok","no","hint"); });
  $$(".hs-cap[data-hs='"+gid+"']").forEach(function(c){ hide(c,true); });
  var order=pins.map(function(_,k){ return k; }); fcShuffle(order);
  HS[gid]={order:order,at:0,first:0,miss:false}; root.classList.add("testing");
  hide($(".hs-nav",root),true); hide($(".hs-quiz",root),false); hide($(".hs-retry",root),true); hsAsk(gid);
}
function hsAsk(gid){ var s=HS[gid], root=$("#"+gid), q=$(".hs-quiz",root), pins=$$(".pin[data-hs='"+gid+"']");
  if(s.at>=s.order.length){   /* every feature found: the labels come back, and the result is kept */
    $(".hs-ask",q).textContent=q.getAttribute("data-score").replace("{r}",s.first).replace("{n}",s.order.length);
    hide($(".hs-retry",root),false);
    var sc=root.closest(".sec"), ln=lensOf(root);
    if(sc&&sc.id&&ln){ var qid=sc.id+":find"+$$(".hs",sc).indexOf(root), ok=s.first===s.order.length, r=state.chk[qid];
      if(!r) state.chk[qid]={ok:ok,at:Date.now(),s:sc.id,l:ln}; else if(!r.ok&&!!r.fx!==ok){ r.fx=ok?1:0; r.at=Date.now(); }
      save(); pgMissed($("#L-"+ln)); }
    return; }
  s.miss=false; s.wrong=0; $(".hs-ask",q).textContent=q.getAttribute("data-ask").replace("{label}",hsLabel(pins[s.order[s.at]])); }
function hsPick(gid,i){ var s=HS[gid], pins=$$(".pin[data-hs='"+gid+"']"); if(!s||s.at>=s.order.length) return;
  var p=pins[i]; if(p.classList.contains("ok")) return;
  if(i===s.order[s.at]){ p.classList.remove("no","hint"); p.classList.add("ok"); p.setAttribute("aria-label",p.getAttribute("data-label"));
    if(!s.miss) s.first++; s.at++; track(lensOf(p),gid+":"+i); hsAsk(gid); }
  else { s.miss=true; s.wrong=(s.wrong||0)+1; p.classList.remove("no"); void p.offsetWidth; p.classList.add("no");
    /* a wrong tap teaches too: name what was tapped, and after two misses show where the feature is */
    var want=pins[s.order[s.at]], ask=$("#"+gid+" .hs-ask"), w=uiStr("hs_wrong");
    if(ask&&w) ask.textContent=w.replace("{label}",hsLabel(p)).replace("{target}",hsLabel(want));
    if(s.wrong>=2&&want) want.classList.add("hint"); }
}
function hsEnd(gid){ var root=$("#"+gid); if(!root) return; delete HS[gid]; root.classList.remove("testing");
  $$(".pin[data-hs='"+gid+"']").forEach(function(p){ p.classList.remove("ok","no","hint"); if(p.getAttribute("data-label")) p.setAttribute("aria-label",p.getAttribute("data-label")); });
  hide($(".hs-nav",root),false); hide($(".hs-quiz",root),true); }
function opt(gid,i,force){
  var o=$(".out[data-q='"+gid+"'][data-i='"+i+"']"),
      b=$(".opt-b[data-q='"+gid+"'][data-i='"+i+"']");
  if(!o) return;
  if(o.closest("#L-assessment")&&!state.mcq[gid]&&Object.keys(state.mcq).length>=FREE.mcq&&gate()) return;
  var openIt = force===true ? true : o.hasAttribute("hidden");
  hide(o, !openIt); if(b) b.setAttribute("aria-expanded", openIt?"true":"false");
  if(openIt) track(lensOf(o), gid+":"+i);
  /* a quick check inside a lens: the first answer is the one that counts, and a right answer later
     clears the section from the list to revisit */
  if(openIt&&force!==true&&!o.closest("#L-assessment")){
    var qa=o.closest(".qa"), sc=o.closest(".sec"), ln=lensOf(o);
    if(qa&&sc&&sc.id&&ln){ var qid=qa.getAttribute("data-qid")||sc.id+":"+$$(".qa",sc).indexOf(qa), ok=o.classList.contains("out-right"), r=state.chk[qid];
      if(!r) state.chk[qid]={ok:ok,at:Date.now(),s:sc.id,l:ln};
      else if(!r.ok&&!!r.fx!==ok){ r.fx=ok?1:0; r.at=Date.now(); }
      save(); pgMissed($("#L-"+ln)); } }
  /* the first answer to an assessment question is the one that counts */
  if(openIt&&force!==true&&o.closest("#L-assessment")&&!state.mcq[gid]){
    state.mcq[gid]={ok:o.classList.contains("out-right"),at:Date.now()}; save(); mcqSummary(true); }
}
function mcqSummary(justAnswered){
  var box=$("#mcq-sum"); if(!box) return; var qs=$$("#L-assessment .qa"), of=qs.length;
  var done=qs.filter(function(q){ return state.mcq[q.id]; }), right=done.filter(function(q){ return state.mcq[q.id].ok; }).length;
  hide(box,!done.length); if(!done.length) return;
  $("#mcq-line").textContent=uiStr("mcq_progress").replace("{n}",done.length).replace("{of}",of).replace("{r}",right);
  /* where to reread, one link per section, from the questions missed */
  var seen={}, links=[];
  done.forEach(function(q){ if(state.mcq[q.id].ok||!q.dataset.sec||seen[q.dataset.sec]) return; seen[q.dataset.sec]=1;
    links.push('<a class="rr-link" href="#'+q.dataset.sec+'" data-lens="'+q.dataset.lens+'" style="--lens:var(--lens-'+q.dataset.lens+')">'
      +esc(q.dataset.secTitle)+'<span aria-hidden="true"> →</span></a>'); });
  $("#mcq-reread").innerHTML=links.length?'<p class="rr-h">'+esc(uiStr("mcq_reread"))+'</p>'+links.join(""):"";
  if(justAnswered&&done.length===of) praiseOnce("mcq:all:"+right, uiStr("mcq_done_toast").replace("{of}",of).replace("{r}",right)); }

/* ---- lightbox ---------------------------------------------------------------------- */
var lb=null, lastFocus=null;
function openLb(el){
  lb=$("#lb"); if(!lb) return;
  lastFocus=document.activeElement;
  var box=$("#lb .fig-img");
  box.style.setProperty("--f", getComputedStyle(el).getPropertyValue("--f"));
  box.style.aspectRatio=getComputedStyle(el).aspectRatio;
  box.setAttribute("aria-label", el.getAttribute("aria-label")||"");
  var was=lb.hasAttribute("hidden"); hide(lb, false); if(was) modal(true,lb); $("#lb-close").focus();
}
/* on a phone the picture fills the width; a tap zooms it in to pan around, a second tap zooms out */
$("#lb .fig-img")&&$("#lb .fig-img").addEventListener("click",function(ev){
  var L=$("#lb"), z=L.classList.toggle("zoom"), lb=L;
  if(z){ var r=this.getBoundingClientRect(); lb.scrollLeft=Math.max(0,r.width*((ev.clientX)/innerWidth)-innerWidth/2);
    lb.scrollTop=Math.max(0,r.height*((ev.clientY)/innerHeight)-innerHeight/2); } });
function closeLb(){ if(!lb||lb.hasAttribute("hidden")) return; hide(lb, true); modal(false); lb.classList.remove("zoom");
  if(lastFocus&&lastFocus.focus) lastFocus.focus(); }

/* ---- pivot panel ------------------------------------------------------------------- */
function openPivot(id, from){
  var p=$("#pv-"+id); if(!p) return;
  var was=$("#pvwrap").hasAttribute("hidden"); if(was) lastFocus=document.activeElement;
  hide($("#pvwrap"), false);
  $$("#pvwrap .pv").forEach(function(x){ hide(x, x.id!=="pv-"+id); });
  /* the reader is already in one of these lenses; show only the others */
  $$(".pv-view",p).forEach(function(v){ hide(v, !!from&&v.getAttribute("data-lens")===from); });
  if(was) modal(true,$("#pvwrap"));
  var c=p.querySelector(".pv-x"); if(c) c.focus();
}
function closePivot(){ var w=$("#pvwrap"); if(!w||w.hasAttribute("hidden")) return; hide(w, true); modal(false);
  if(lastFocus&&lastFocus.focus) lastFocus.focus(); }

/* ---- flashcards: the deck, studied on the page ---------------------------------------- */
/* Each card's progress is a box: Got it moves it up a box and further away, Again sends it back
   to the first box and brings it round again this session. A card is known by its front, so a
   rebuild that leaves a card's words alone keeps its progress. */
var FC={lens:"mix",q:[],cur:null,done:0,size:0,extra:false}, FC_DAYS=[1,3,7,16,35,90], DAY=864e5, FC_SET=20;
function fcKey(c){ var h=5381, x=c.f; for(var i=0;i<x.length;i++) h=((h<<5)+h+x.charCodeAt(i))|0; return (h>>>0).toString(36); }
function fcLens(c){ for(var i=0;i<c.t.length;i++){ var m=/^diabetes::([a-z-]+)$/.exec(c.t[i]); if(m&&m[1]!=="dictionary"&&m[1]!=="mine") return m[1]; } return ""; }
function fcSec(c){ for(var i=0;i<c.t.length;i++){ var m=/^diabetes::sec::(.+)$/.exec(c.t[i]); if(m) return m[1]; } return ""; }
function fcCards(lens){ return deckData().filter(function(c){ return lens==="mine"?c.t.indexOf("diabetes::mine")>=0:(!lens||lens==="mix"||fcLens(c)===lens); }); }
/* today's mix: ten items in one sitting. Questions the student missed come back as cards to answer from
   memory, then cards that are due, then new cards taken in turn from each lens, all shuffled together:
   mixing topics is harder than one at a time, and it sticks better */
var MIX_N=10;
/* a copy of a question for a card: no pop-up definitions, tags or verdicts in its text */
function chkPlain(n){ $$(".term-tip,.rev-tag,.out-v",n).forEach(function(x){ x.parentNode.removeChild(x); });
  $$("button.term",n).forEach(function(b){ b.parentNode.replaceChild(document.createTextNode(b.textContent),b); }); return n; }
/* a miss from the timed paper, the stations, the viva or a game (r.x names which) comes back as a card
   built from that paper's own data; a game's miss carries its words with it, as the game has its own page */
function xmCard(qid,r){
  /* a game's record may not name its lens: the section it links to does */
  var sc=r.s&&document.getElementById(r.s), ln=r.l||(sc&&sc.closest&&sc.closest(".lens")?sc.closest(".lens").id.slice(2):"");
  var t=["diabetes::"+ln,"diabetes::sec::"+(r.s||"")], D, one=function(a){ return (a||[]).filter(function(x){ return x.id===r.id; })[0]; };
  if(r.x==="mcq"){ D=vvData("xm-data"); var q=D&&one(D.mcq); if(!q) return null;
    var ko=q.opts.filter(function(o){ return o[0]===q.key; })[0];
    return {f:esc(q.stem)+"<b>"+esc(q.lead)+"</b>",b:"<b>"+esc(ko?ko[1]:q.key)+"</b><br>"+esc(q.why),t:t,_chk:qid,long:1}; }
  if(r.x==="st"){ D=vvData("xm-data"); var s=D&&one(D.osce), sq=s&&s.qs[r.k]; if(!sq) return null;
    var fm=/--fig-([\w-]+)/.exec(s.fig||"");
    return {f:esc(sq[0]),b:esc(sq[1]),i:fm?fm[1]:"",t:t,_chk:qid}; }
  if(r.x==="vv"){ var tp=one(vvData("viva-bank")); if(!tp) return null;
    var pts=tp.open.points||[];
    return {f:esc(tp.open.q),b:(pts.length?"<ul>"+pts.map(function(p){ return "<li>"+esc(p)+"</li>"; }).join("")+"</ul>":"")+"<p>"+esc(tp.open.a)+"</p>",t:t,_chk:qid}; }
  if(r.x==="gm"&&r.f) return {f:esc(r.f)+" <b>"+esc(uiStr("mix_tf"))+"</b>",b:"<b>"+esc(uiStr(r.a?"mix_true":"mix_trap"))+"</b><br>"+esc(r.b||""),t:t,_chk:qid,long:1};
  if(r.x==="ls"&&r.f) return {f:esc(r.f),b:"<b>"+esc(r.ans||"")+"</b><br>"+esc(r.b||""),img:r.img||"",t:t,_chk:qid};
  return null; }
function chkCard(qid,r){
  if(r.x) return xmCard(qid,r);
  var sc=document.getElementById(r.s), el=null, m; if(!sc) return null;
  if((m=/:r(\d+)$/.exec(qid))){ var g=$$(".rev-g",sc)[+m[1]]; el=g&&g.closest("details"); if(!el) return null;
    var q=chkPlain($(".rev-q",el).cloneNode(true));
    var body=chkPlain(el.cloneNode(true)); $$("summary,.rev-g",body).forEach(function(x){ x.parentNode.removeChild(x); });
    return {f:esc(q.textContent.trim()),b:body.innerHTML,t:["diabetes::"+r.l,"diabetes::sec::"+r.s],_chk:qid}; }
  if(/:find\d+$/.test(qid)) return null;
  el=$('.qa[data-qid="'+qid+'"]',sc)||((m=/:(\d+)$/.exec(qid))&&$$(".qa",sc)[+m[1]]); if(!el) return null;
  var right=$(".out-right",el); if(!right) return null;
  var stem=$$(".scen,.q",el).map(function(p){ return esc(chkPlain(p.cloneNode(true)).textContent.trim()); }).join("<br><br>");
  var ob=$('.opt-b[data-i="'+right.getAttribute("data-i")+'"]',el), ot=ob?ob.lastElementChild.textContent:"";
  var why=chkPlain(right.cloneNode(true));
  return {f:stem,b:"<b>"+esc(ot)+"</b><br>"+why.innerHTML,t:["diabetes::"+r.l,"diabetes::sec::"+r.s],_chk:qid};
}
function mixQueue(){
  var now=Date.now(), all=deckData(), q=[];
  Object.keys(state.chk||{}).filter(function(k){ var r=state.chk[k]; return r&&!r.ok&&!r.fx; })
    .sort(function(a,b){ return state.chk[b].at-state.chk[a].at; }).some(function(k){ var c=chkCard(k,state.chk[k]); if(c) q.push(c); return q.length>=6; });
  fcShuffle(all.filter(function(c){ return fcDue(c,now); })).some(function(c){ q.push(c); return q.length>=MIX_N; });
  /* new cards, one lens after another, so no lens is left out */
  var by={}, order=[]; fcShuffle(all.filter(fcIsNew)).forEach(function(c){ var l=fcLens(c)||"-"; if(!by[l]){ by[l]=[]; order.push(l); } by[l].push(c); });
  for(var i=0; q.length<MIX_N&&order.length; i++){ var l=order[i%order.length], c=by[l].shift();
    if(c) q.push(c); else { order.splice(i%order.length,1); i--; } }
  return fcShuffle(q);
}
function fcDue(c,now){ var r=state.fc[fcKey(c)]; return r&&r.d<=now; }
function fcIsNew(c){ return !state.fc[fcKey(c)]; }
function fcChips(){
  $$(".fc-chip").forEach(function(b){ var l=b.getAttribute("data-fc");
    b.setAttribute("aria-pressed",l===FC.lens?"true":"false"); var k=b.querySelector("b");
    if(!k) return; var now=Date.now();
    if(l==="mine"){ var n=fcCards("mine").length; k.textContent=n; b.hidden=!n; }
    /* the mix counts what's left in today's sitting; a lens counts what's waiting in it: due or new */
    else if(l==="mix") k.textContent=FC.lens==="mix"?(FC.q.length+(FC.cur?1:0))||"":(FC.mixN===undefined?(FC.mixN=mixQueue().length):FC.mixN)||"";
    else k.textContent=fcCards(l).filter(function(c){ return fcDue(c,now)||fcIsNew(c); }).length||""; }); }
function fcShuffle(q){ for(var i=q.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=q[i]; q[i]=q[j]; q[j]=t; } return q; }
function fcDeal(extra){
  /* a set is 20 cards, so it can be finished in one sitting: the cards that are due come first,
     then cards not yet seen; another set is one tap away */
  var now=Date.now(), cs=fcCards(FC.lens);
  FC.right=0; FC.again=0; FC.rated={}; FC.extra=!!extra;
  if(FC.lens==="mix"&&!extra){ FC.q=mixQueue(); FC.size=FC.q.length; FC.done=0; return fcNext(); }
  var q=fcShuffle(cs.filter(function(c){ return fcDue(c,now); })).concat(fcShuffle(cs.filter(fcIsNew)));
  /* past that, the cards coming up soonest */
  if(extra&&!q.length) q=cs.slice().sort(function(a,b){ return (state.fc[fcKey(a)]||{}).d-(state.fc[fcKey(b)]||{}).d; });
  q=q.slice(0,FC_SET); FC.q=q; FC.size=q.length; FC.done=0; fcNext();
}
function fcOpen(){ if(!$("#fc-card")) return; fcChips(); fcDeal(false); }
function fcNext(){
  var card=$("#fc-card"); FC.cur=FC.q.shift()||null; fcChips();
  hide($("#fc-play"),!FC.cur); hide($("#fc-done"),!!FC.cur);
  if(!FC.cur){ var t=$("#fc-done-t"), now=Date.now(), all=fcCards(FC.lens), hd=$("#fc-done b"), mb=$("#fc-more"),
      rest=all.filter(function(c){ return fcDue(c,now)||fcIsNew(c); }).length,
      n=all.filter(function(c){ var r=state.fc[fcKey(c)]; return r&&r.d>now&&r.d<=now+DAY; }).length;
    FC.rest=rest;
    /* today's mix is a day's work: it ends the day, with more cards one tap away for anyone who wants them.
       A set from a lens is a set: more cards are waiting, or the deck is done for now */
    var mix=FC.lens==="mix"&&!FC.extra, tally=FC.right+FC.again>0;
    if(mix) FC.mixN=0;
    hd.textContent=hd.getAttribute(mix?"data-mix":rest?"data-set":"data-all");
    hide($("#fc-sum"),!tally); $("#fc-sum-r").textContent=FC.right; $("#fc-sum-a").textContent=FC.again;
    hide($("#fc-home"),!mix); mb.className=mix?"btn btn-md":"vv-go";
    mb.textContent=mb.getAttribute(mix?"data-mix":rest?"data-set":"data-all");
    t.textContent=mix?(n?t.getAttribute("data-n").replace("{n}",n):t.getAttribute("data-0"))
      :rest?t.getAttribute("data-rest").replace("{n}",rest):(n?t.getAttribute("data-n").replace("{n}",n):t.getAttribute("data-0")); return; }
  var c=FC.cur, l=fcLens(c), sec=fcSec(c), lt=l?titleOf(l):"";
  card.classList.remove("flip"); card.style.setProperty("--lens", l?"var(--lens-"+l+")":"var(--ink-2)");
  var ic=l&&$('.rail a[data-lens="'+l+'"] .ic'), lab=(ic?ic.outerHTML:"")+esc(lt);
  $("#fc-l").innerHTML=lab; $("#fc-l2").innerHTML=lab;
  $("#fc-f").innerHTML=c.f; $("#fc-q").innerHTML=c.f; $("#fc-b").innerHTML=c.b;
  card.classList.toggle("fc-long",!!c.long||c.f.length>160);
  var fig=$("#fc-fig"); hide(fig,!c.i&&!c.img);
  if(c.i) fig.style.setProperty("--f","var(--fig-"+c.i+")"); else if(c.img) fig.style.setProperty("--f",'url("'+c.img.replace(/"/g,"%22")+'")');
  /* under each rating, when the card comes back: Again soon, Got it in its next box's days */
  var ui0=$("#fc-ui"), r0=state.fc[fcKey(c)]||{s:-1}, nd=FC_DAYS[Math.min(FC_DAYS.length-1,r0.s<0?0:r0.s+1)];
  $("#fc-again-h").textContent=ui0.getAttribute("data-soon");
  $("#fc-got-h").textContent=c._chk?"":nd===1?ui0.getAttribute("data-d1"):ui0.getAttribute("data-dn").replace("{n}",nd);
  var go=$("#fc-go"); hide(go,!l); go.setAttribute("href","#"+(sec||l)); go.setAttribute("data-lens",l);
  hide($("#fc-show"),false); hide($("#fc-again"),true); hide($("#fc-got"),true);
  var ui=$("#fc-ui"), left=FC.q.length+1;
  $("#fc-left").textContent=ui.getAttribute("data-left").replace("{n}",left);
  $("#fc-bar").style.width=(FC.size?100*FC.done/FC.size:0)+"%";
}
function fcFlip(){ var card=$("#fc-card"); if(!FC.cur) return;
  var on=card.classList.toggle("flip");
  hide($("#fc-show"),on); hide($("#fc-again"),!on); hide($("#fc-got"),!on);
  if(on) $("#fc-got").focus({preventScroll:true}); }
function fcRate(ok){ var c=FC.cur; if(!c) return;
  /* the sitting's tally counts each card's first rating only */
  var tk=c._chk||fcKey(c); if(FC.rated&&!FC.rated[tk]){ FC.rated[tk]=1; if(ok) FC.right++; else FC.again++; }
  /* a missed question, come back as a card: answered from memory it leaves the list to revisit */
  if(c._chk){ var rr=state.chk[c._chk];
    if(ok){ if(rr&&!rr.ok){ rr.fx=1; rr.at=Date.now(); } FC.done++; pgMissed($("#L-"+(rr&&rr.l))); }
    else FC.q.splice(Math.min(3,FC.q.length),0,c);
    save(); return fcNext(); }
  var k=fcKey(c), r=state.fc[k]||{s:-1}, now=Date.now();
  if(ok){ var s=Math.min(FC_DAYS.length-1,(r.s<0?0:r.s+1)); state.fc[k]={s:s,d:now+FC_DAYS[s]*DAY,at:now}; FC.done++; }
  else { state.fc[k]={s:0,d:now+10*60e3,at:now};
    /* missed: it comes round again a few cards later */
    FC.q.splice(Math.min(3,FC.q.length),0,c); }
  save(); fcNext(); }
document.addEventListener("click",function(ev){
  var t=ev.target; if(!t.closest) return;
  var sv=t.closest(".kf-save"); if(sv){ ev.preventDefault(); ev.stopPropagation(); return mineToggle(sv); }
  var chip=t.closest(".fc-chip"); if(chip){ FC.lens=chip.getAttribute("data-fc"); fcChips(); fcDeal(false); return; }
  if(t.closest("#fc-go")) return;
  if(t.closest("#fc-card")||t.closest("#fc-show")) return fcFlip();
  if(t.closest("#fc-again")) return fcRate(false);
  if(t.closest("#fc-got")) return fcRate(true);
  if(t.closest("#fc-more")) return fcDeal(FC.lens==="mix"||!FC.rest);
  if(t.closest("#fc-anki")) return dl("diabetes-anki.txt", ankiFile(false), "text/plain");
});
document.addEventListener("keydown",function(ev){
  if(state.lens!=="cards"||!FC.cur||ev.target.matches&&ev.target.matches("input,textarea")) return;
  var flipped=$("#fc-card").classList.contains("flip");
  if(ev.key===" "||ev.key==="Enter"){ if(ev.target.closest&&ev.target.closest("a,.fc-r,.fc-chip")) return; ev.preventDefault(); fcFlip(); }
  else if(flipped&&ev.key==="1") fcRate(false);
  else if(flipped&&ev.key==="2") fcRate(true);
});
/* each game's card shows the student's best, once they have one */
$$(".gc-best").forEach(function(el){ var b=+state[el.getAttribute("data-best")]||0; if(!b) return;
  el.textContent=el.getAttribute("data-t").replace("{b}",b).replace("{t}",el.getAttribute("data-of")); el.hidden=false; });
/* ---- one delegated listener -------------------------------------------------------- */
document.addEventListener("click",function(ev){
  var t=ev.target.closest("button, a[data-lens], [data-zoom], .card, .gz, .gz-mk");
  if(!t) return;
  if(t.matches("a[data-lens]")){ ev.preventDefault(); closePivot(); if(VV&&t.closest("#vvx")) vvClose();
    var fromSearch=!!t.closest("#srwrap"); if(fromSearch) closeSearch(true);
    show(t.getAttribute("data-lens"),{push:true});
    /* a link out of a section lands on the section it names, not the top of the lens */
    var h=(t.getAttribute("href")||"").slice(1), tg=h&&h!==t.getAttribute("data-lens")&&document.getElementById(h);
    if(tg){ reveal(tg); tg.scrollIntoView(); if(fromSearch) flashHit(tg); } return; }
  if(t.matches("[data-zoom]")){ openLb(t); return; }
  if(t.matches(".card")){ var open=t.classList.toggle("flip");
    t.setAttribute("aria-expanded",open?"true":"false");
    var cs=t.closest(".cards")||t.parentNode;   /* the same key as before the save buttons wrapped each card */
    if(open) track(lensOf(t), (cs.id||"cards")+":"+$$(".card",cs).indexOf(t)); return; }
  if(t.matches(".dept-b")){ var open=t.getAttribute("aria-expanded")!=="true";
    t.setAttribute("aria-expanded",open?"true":"false");
    hide($("#"+t.getAttribute("aria-controls")), !open);
    if(open) track("orientation","dept:"+t.getAttribute("aria-controls")); return; }
  if(t.matches(".is-dot")){ var g=t.getAttribute("data-is"), k=+t.getAttribute("data-i");
    $$("[data-is='"+g+"'].is-frame,[data-is='"+g+"'].is-cap").forEach(function(x){ hide(x, +x.getAttribute("data-i")!==k); });
    $$(".is-dot[data-is='"+g+"']").forEach(function(x){ x.setAttribute("aria-selected", +x.getAttribute("data-i")===k?"true":"false"); });
    return track(lensOf(t), g+":"+k); }
  if(t.matches(".rev-b")){ var sc=t.closest(".sec"), ln=lensOf(t), g=t.closest(".rev-g");
    $$(".rev-b",g).forEach(function(b){ b.setAttribute("aria-pressed",b===t?"true":"false"); });
    /* a bonus question is open-ended: its answer is the student's own, so it never marks a section missed */
    if(sc&&sc.id&&ln&&!g.closest("[data-bonus]")){ var qid=sc.id+":r"+$$(".rev-g",sc).indexOf(g), ok=t.getAttribute("data-rev")==="1", r=state.chk[qid];
      if(!r) state.chk[qid]={ok:ok,at:Date.now(),s:sc.id,l:ln};
      else if(!r.ok&&!!r.fx!==ok){ r.fx=ok?1:0; r.at=Date.now(); }
      save(); pgMissed($("#L-"+ln)); }
    return; }
  if(t.matches(".vid-play")){ var vv=t.parentNode.querySelector("video"); if(vv){ vv.controls=true; t.remove();
      try{ var pr=vv.play(); if(pr&&pr.catch) pr.catch(function(){}); }catch(e){} vv.focus(); } return; }
  if(t.matches(".pg-b")) return pgStep(+t.getAttribute("data-pd"));
  if(t.matches(".pg-seg")) return page(state.lens,+t.getAttribute("data-pg"));
  if(t.matches(".ch-b")) return step(t.getAttribute("data-st"),+t.getAttribute("data-i"));
  if(t.matches(".sn")){ var g=t.getAttribute("data-st");
    var cur=$$(".step[data-st='"+g+"']").findIndex(function(p){return !p.hasAttribute("hidden");});
    return step(g,cur+(+t.getAttribute("data-d"))); }
  if(t.matches(".tick")) return slide(t.getAttribute("data-sl"),+t.getAttribute("data-i"));
  if(t.matches(".tab")) return tabTo(t.getAttribute("data-tb"),+t.getAttribute("data-i"));
  if(t.matches(".hs-test,.hs-retry")) return hsStart(t.getAttribute("data-hs"));
  if(t.matches(".hs-end")) return hsEnd(t.getAttribute("data-hs"));
  if(t.matches(".pin")&&HS[t.getAttribute("data-hs")]) return hsPick(t.getAttribute("data-hs"),+t.getAttribute("data-i"));
  if(t.matches(".pin,.hs-jump")) return pin(t.getAttribute("data-hs"),+t.getAttribute("data-i"));
  if(t.matches(".opt-b")) return opt(t.getAttribute("data-q"),+t.getAttribute("data-i"));
  if(t.matches(".openall")){ var q=t.getAttribute("data-q");
    if(!state.mcq[q]&&Object.keys(state.mcq).length>=FREE.mcq&&gate()) return;
    $$(".out[data-q='"+q+"']").forEach(function(o,k){ opt(q,k,true); }); return; }
  if(t.matches(".gz-btn,.gz-mk,.gz")) { var z=t.getAttribute("data-z");
    $$(".gz-pane").forEach(function(p){ hide(p, p.getAttribute("data-z")!==z); });
    $$(".gz,.gz-btn").forEach(function(c){ c.classList.toggle("on", c.getAttribute("data-z")===z); });
    track(lensOf(t), "gz:"+z); return; }
  if(t.matches(".gr-dot")){ var i=+t.getAttribute("data-i");
    $$(".gr-frame").forEach(function(f,k){ hide(f, k!==i); });
    $$(".gr-cap").forEach(function(c,k){ hide(c, k!==i); });
    $$(".gr-dot").forEach(function(d,k){ d.setAttribute("aria-current",k===i?"true":"false"); });
    track(lensOf(t), "gr:"+i); return; }
  if(t.matches(".pivot,.term")) return openPivot(t.getAttribute("data-pivot"), lensOf(t));
  if(t.matches(".pv-x")) return closePivot();
  if(t.matches(".bm-site")){ var g=t.getAttribute("data-bm"), r=t.getAttribute("data-r"),
      on=t.getAttribute("aria-pressed")!=="true";
    $$(".bm-site[data-bm='"+g+"']").forEach(function(b){ b.setAttribute("aria-pressed", on&&b===t?"true":"false"); });
    $$(".bm-r[data-bm='"+g+"']").forEach(function(x){ x.classList.toggle("on", on&&x.getAttribute("data-r")===r); });
    if(on) track(lensOf(t), g+":"+r); return; }
  if(t.id==="lb-close") return closeLb();
  if(t.id==="expb") return openExport();
  if(t.id==="srchb") return openSearch();
  if(t.hasAttribute("data-click")&&!t.closest("#drawer")){ var tg2=$("#"+t.getAttribute("data-click")); if(tg2) tg2.click(); return; }
  if(t.matches(".asx-done")){ var g=$("#"+t.getAttribute("data-asx")); if(g){ g.open=false; g.scrollIntoView({block:"start"}); } return; }
  if(t.id==="nb-anki") return dl("diabetes-anki.txt", ankiFile(true), "text/plain");
  if(t.id==="sr-close") return closeSearch();
  if(t.id==="ex-close") return closeExport();
  if(t.id==="ex-anki") return dl("diabetes-anki.txt",
    ankiFile($("#ex-inc")&&$("#ex-inc").checked), "text/plain");
  if(t.id==="ex-notes") return dl("diabetes-notes.md", notesFile(), "text/markdown");
  if(t.id==="themeb"){ return setTheme(isDark()?"light":"dark"); }
});
document.addEventListener("input",function(ev){
  if(ev.target.matches(".sl-range")) slide(ev.target.getAttribute("data-sl"), +ev.target.value);
  if(ev.target.matches(".np")){ state.notes[ev.target.getAttribute("data-np")]=ev.target.value; save(); }
});
document.addEventListener("keydown",function(ev){
  if(ev.key==="Escape"){ closeLb(); closePivot(); closeExport(); closeSearch(); }
  /* "/" opens search, as on most sites, unless the reader is typing somewhere */
  if(ev.key==="/"&&!/INPUT|TEXTAREA|SELECT/.test((ev.target.tagName||""))&&!ev.target.isContentEditable&&$("#srchb")){ ev.preventDefault(); openSearch(); }
  if(ev.target.matches&&ev.target.matches("[data-zoom]")&&(ev.key==="Enter"||ev.key===" ")){ ev.preventDefault(); openLb(ev.target); }
});
$("#lb")&&$("#lb").addEventListener("click",function(ev){ if(ev.target.id==="lb") closeLb(); });
$("#pvwrap")&&$("#pvwrap").addEventListener("click",function(ev){ if(ev.target.id==="pvwrap") closePivot(); });
$("#exwrap")&&$("#exwrap").addEventListener("click",function(ev){ if(ev.target.id==="exwrap") closeExport(); });
$("#srwrap")&&$("#srwrap").addEventListener("click",function(ev){ if(ev.target.id==="srwrap") closeSearch(); });
document.addEventListener("click",function(ev){
  var s=ev.target.closest("#stations .case summary, #viva details.viva>summary"); if(!s) return;
  var d=s.parentNode; if(d.open) return;
  var kind=d.closest("#stations")?"stations":"viva", items=$$(kind==="stations"?"#stations .case":"#viva details.viva");
  var k=items.indexOf(kind==="stations"?d.closest(".case"):d);
  if(k>=FREE[kind]&&gate()){ ev.preventDefault(); }
},true);
document.addEventListener("toggle",function(ev){
  if(ev.target.matches("details.rev")&&ev.target.open)
    track(lensOf(ev.target), "rev:"+(ev.target.querySelector("summary")||{}).textContent.slice(0,40));
},true);

/* ---- viva: its own screen. The examiner's recorded voice asks; the student answers aloud; the
   browser's speech recognition listens for each point; the student checks the points; the next
   question depends on how many were made. Recordings load from viva/ beside the page. If the
   browser cannot listen, or the microphone is refused, the student ticks the points instead. */
var VV=null, VA=null;
var VV_TOPICS=6, VV_FOLLOW_CAP=3;
/* the answer is over when the student stops talking: this long after the last word heard,
   or sooner once every point has been made */
var VV_PAUSE=5000, VV_PAUSE_ALL=1200;
var VV_STOP={the:1,a:1,an:1,of:1,and:1,or:1,to:1,"in":1,on:1,is:1,are:1,by:1,"for":1,"with":1,from:1,at:1,
  it:1,its:1,be:1,as:1,that:1,"this":1,into:1,than:1,they:1,them:1,their:1,there:1,when:1,which:1,what:1,
  mostly:1,mainly:1,usually:1,often:1,about:1,most:1,some:1,may:1,can:1,only:1,also:1,
  mtb:1,rif:1};   /* "the GeneXpert" is the answer; MTB/RIF is the assay's full name */
var VV_NUM={zero:"0",one:"1",two:"2",three:"3",four:"4",five:"5",six:"6",seven:"7",eight:"8",nine:"9",ten:"10",
  eleven:"11",twelve:"12",twenty:"20",thirty:"30",forty:"40",fifty:"50",sixty:"60",seventy:"70",ii:"2",iii:"3",iv:"4",vi:"6",vii:"7"};
function vvData(id){ var el=$("#"+id); try{ return el?JSON.parse(el.textContent):null; }catch(e){ return null; } }
/* words that mean the same thing in an answer; a point's word is made by any word in its group */
var VV_SYN=[
  ["organisms","organism","bacilli","bacillus","bacteria","bacterium","strains","strain","mycobacteria","microbes"],
  ["dominate","dominant","dominates","predominate","predominant","overgrow","outgrow","selected","takeover"],
  ["destroy","destroyed","destroys","kill","kills","killed","damage","damaged","damages"],
  ["cannot","unable","fails","fail"],
  ["hepatitis","hepatotoxicity","hepatotoxic","liver"],
  ["pyridoxine","b6"],
  ["nodes","node","lymphadenopathy","glands"],
  ["lymphocytes","lymphocyte","lymphocytic"],
  ["macrophages","macrophage","histiocytes"],
  ["cavity","cavitation","cavitary","cavities"],
  ["sensitisation","sensitised","sensitized","sensitization","sensitivity"],
  ["resistant","resistance"],
  ["spread","spreads","transmitted","transmission"],
  ["inhaled","inhale","breathe","breathed","airborne"],
  ["structureless","structure","architecture","amorphous","featureless"],
  /* the recogniser often hears "caseous" as these */
  ["caseous","caseation","caseating","gaseous","kishas","cases","casey"],
  ["genexpert","genexperts"],["mtb","tb","tuberculosis"],["rif","rifampicin","riff"]];
var VV_SYNOF={}; VV_SYN.forEach(function(g){ g.forEach(function(w){ VV_SYNOF[w]=g; }); });
/* phrases said as one idea */
var VV_PHRASE=[[/\btake[sn]? over\b|\btook over\b|\btaking over\b/g,"takeover"],[/\bvitamin b ?6\b/g,"b6"],
  [/\bliver (damage|injury|toxicity)\b/g,"hepatotoxicity"],[/\bair ?borne\b/g,"airborne"],
  /* GeneXpert, as the recogniser writes it: "gene experts", "jean experts", "gene expats", "xpert" */
  [/\b(gene|jean|jeans|jin|gin|jane)[\s-]*(x ?perts?|ex ?perts?|ex ?pats?|expat)\b/g,"genexpert"],
  [/\bx ?perts?\b/g,"genexpert"],[/\bm\.? ?t\.? ?b\b/g,"mtb"]];
function vvWords(s){ s=(s||"").toLowerCase().replace(/[\u2018\u2019]/g,"'");
  /* "can't", "doesn't", "cannot" all carry a "not" that must survive */
  s=s.replace(/\b(ca|do|does|is|are|wo|was|were|did|could|should|would|has|have|had|need)n'?t\b/g,"$1 not")
     .replace(/\bcannot\b/g,"can not")
     /* "I don't know" is not an answer, and its "not" must not count as one */
     .replace(/\b(i )?(do not|did not) know\b|\bnot sure\b|\bno idea\b/g," unsure ");
  VV_PHRASE.forEach(function(p){ s=s.replace(p[0],p[1]); });
  return s.replace(/[^a-z0-9]+/g," ").trim().split(/\s+/)
  .filter(Boolean).map(function(w){ return VV_NUM[w]||w; }); }
function vvLev(a,b){ if(Math.abs(a.length-b.length)>2) return 9; var d=[],i,j;
  for(i=0;i<=a.length;i++){ d[i]=[i]; } for(j=0;j<=b.length;j++) d[0][j]=j;
  for(i=1;i<=a.length;i++) for(j=1;j<=b.length;j++)
    d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return d[a.length][b.length]; }
/* forgiving on purpose: a word counts if it is said, shares its first five letters (caseous,
   caseation), or is a near miss the recogniser might produce */
function vvHas(heard,t){ return heard.some(function(w){
  if(w===t) return true;
  if(t.length>=5&&w.length>=5&&w.slice(0,5)===t.slice(0,5)) return true;
  if(t.length>=4&&vvLev(w,t)<=(t.length>=7?2:1)) return true;
  return false; }); }
/* words that set the direction of a finding: a point that says "low" is not made by "high" */
var VV_DIR={low:["low","reduced","decreased","falls","fall","lower"],high:["high","raised","elevated","increased","rises","rise","higher"],
  raised:["raised","high","elevated","increased","rises"],normal:["normal"],no:["no","not","absent","without","none"],
  absent:["absent","no","not","without"],not:["not","no","never","without","unable","fails","fail","neither","nor"],never:["never","not","no"],suppressed:["suppressed","low","reduced"],preserved:["preserved","normal","kept"],
  falls:["falls","fall","low","drops"],rises:["rises","rise","high","raised"]};
/* a point's qualifier ("against paired plasma", "from blocked cisterns") is detail; saying the
   finding before it is enough */
var VV_QUAL={against:1,from:1,compared:1,due:1,because:1,via:1,since:1,down:1};
function vvContent(ws){ return ws.filter(function(w){ return !VV_STOP[w]&&(w.length>=3||/\d/.test(w)||VV_DIR[w]); }); }
function vvPointMade(point,heard){
  var all=vvWords(point), ts=vvContent(all);
  if(!ts.length) return false;
  var said=function(t){ if(VV_DIR[t]) return VV_DIR[t].some(function(d){ return heard.indexOf(d)>=0; });
    return (VV_SYNOF[t]||[t]).some(function(w){ return vvHas(heard,w); }); };
  /* a direction word after "no" or "not" ("no preserved architecture") is part of the negation,
     and the negation is the word that has to be said */
  var negated=function(t){ var i=all.indexOf(t); return i>0&&(all[i-1]==="no"||all[i-1]==="not"); };
  var dirOk=ts.every(function(t){ return !VV_DIR[t]||negated(t)||said(t); });
  if(!dirOk) return false;
  var q=all.findIndex(function(w){ return VV_QUAL[w]; });
  var head=q>0?vvContent(all.slice(0,q)):[];
  if(head.length&&head.every(said)) return true;
  return ts.filter(function(t){ return said(t)||(VV_DIR[t]&&negated(t)); }).length>=Math.max(1,Math.ceil(ts.length*0.6)); }

/* choose the topics: every specialty once before any twice, never the same one twice running */
function vvChoose(bank){
  var by={}; bank.forEach(function(t){ (by[t.lens]=by[t.lens]||[]).push(t); });
  var lenses=Object.keys(by); lenses.forEach(function(l){ by[l].sort(function(){ return Math.random()-.5; }); });
  lenses.sort(function(){ return Math.random()-.5; });
  var out=[], k=0;
  while(out.length<Math.min(VV_TOPICS,bank.length)){ var l=lenses[k%lenses.length]; if(by[l].length) out.push(by[l].shift()); k++; }
  return out; }

/* ---- sound: one audio element for the examiner, analysers for the ring */
function vvAudioInit(){
  if(VA) return VA; VA={el:new Audio(), ctx:null, an:null, mic:null, micAn:null, buf:null};
  VA.el.preload="auto";
  try{ var AC=window.AudioContext||window.webkitAudioContext; VA.ctx=new AC();
    var src=VA.ctx.createMediaElementSource(VA.el); VA.an=VA.ctx.createAnalyser(); VA.an.fftSize=256;
    src.connect(VA.an); VA.an.connect(VA.ctx.destination); VA.buf=new Uint8Array(VA.an.frequencyBinCount);
  }catch(e){ VA.ctx=null; }
  return VA; }
/* play clips one after another; a missing clip is skipped, so the text alone still carries the viva */
/* a question's clip sits in the module's own viva folder; the examiner's shared lines sit in viva/ */
function vvClip(id){ return (/^(ma|mb|hi|cp|ph)\d\d-/.test(id)?"viva/diabetes/":"viva/")+id+".mp3"; }
function vvPlay(ids,done){
  /* each run of clips has its own token: changing the source rejects the old play() promise, and an
     older run must never carry on (it would turn the microphone back on after the viva ended) */
  var i=0, tok=VV.playTok=(VV.playTok||0)+1; VV.speaking=true; vvStatus("examiner");
  function next(){ if(!VV||VV.stopped||VV.playTok!==tok) return; if(i>=ids.length){ VV.speaking=false; return done&&done(); }
    var id=ids[i++], once=false, go=function(){ if(once) return; once=true; next(); };
    VA.el.onended=go; VA.el.onerror=go; VA.el.src=vvClip(id);
    var p=VA.el.play(); if(p&&p.catch) p.catch(go); }
  if(VA.ctx&&VA.ctx.state==="suspended") VA.ctx.resume(); next(); }

/* ---- listening */
function vvRecog(){ return window.SpeechRecognition||window.webkitSpeechRecognition||null; }
function vvMicStart(cb){
  if(VA.mic) return cb(true);
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) return cb(false);
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(s){
    /* on a phone the recogniser needs the microphone to itself: holding this stream open leaves it
       hearing silence on Android. So on phones the stream only asks permission and is let go at
       once, and the ring follows the recogniser instead. On a computer it drives the ring. */
    if(matchMedia("(pointer:coarse)").matches){ s.getTracks().forEach(function(t){ t.stop(); }); VA.mic=true; vvLog("mic: permission, released"); return cb(true); }
    VA.mic=s; if(VA.ctx){ var src=VA.ctx.createMediaStreamSource(s); VA.micAn=VA.ctx.createAnalyser();
      VA.micAn.fftSize=256; src.connect(VA.micAn); } cb(true); }).catch(function(e){ vvLog("mic: refused "+(e&&e.name)); cb(false); }); }
/* ?vivadebug on the address shows what the recogniser is doing, for testing on a phone */
var VV_DEBUG=/vivadebug/.test(location.search), VV_LOG=[];
function vvLog(m){ if(!VV_DEBUG) return; VV_LOG.push(new Date().toISOString().slice(14,21)+" "+m); VV_LOG=VV_LOG.slice(-12);
  var b=$("#vvx-debug"); if(b){ b.hidden=false; b.textContent=VV_LOG.join("\n"); } }
/* One recogniser for the whole viva. Chrome refuses to start a second while the first is still
   stopping, so it is only ever started from rest, and restarted from its own end event. */
function vvRecInit(){
  if(VV.rec) return VV.rec; var R=vvRecog(), r=new R(); VV.rec=r; VV.recOn=false;
  /* Android Chrome resends everything said so far in continuous mode, so there it listens one
     phrase at a time and restarts itself between phrases */
  r.lang="en-GB"; r.continuous=!/Android/i.test(navigator.userAgent); r.interimResults=true;
  r.onstart=function(){ VV&&(VV.recOn=true); vvLog("rec: start"); };
  r.onaudiostart=function(){ vvLog("rec: audio start"); };
  r.onspeechstart=function(){ vvLog("rec: speech start"); if(VV) VV.lastSound=Date.now(); };
  r.onsoundstart=function(){ if(VV) VV.lastSound=Date.now(); };
  /* the words of this session, rebuilt from all its results each time: a result that repeats and
     extends the one before replaces it, rather than adding to it */
  r.onresult=function(ev){ if(!VV||!VV.listening) return; var kept=[];
    for(var i=0;i<ev.results.length;i++){ var t=(ev.results[i][0].transcript||"").trim(), lt=t.toLowerCase(); if(!t) continue;
      var last=kept.length?kept[kept.length-1].toLowerCase():null;
      if(last!==null&&lt.indexOf(last)===0) kept[kept.length-1]=t;
      else if(last!==null&&last.indexOf(lt)===0) continue;
      else kept.push(t); }
    VV.sess=kept.join(" "); vvHeard(); VV.lastWord=Date.now(); };
  r.onerror=function(ev){ if(!VV) return; vvLog("rec: error "+ev.error);
    /* errors used to pass silently; now the ones that stop listening say so, and the student ticks instead */
    var k=ev.error==="not-allowed"||ev.error==="service-not-allowed"?"viva_mic_blocked"
      :ev.error==="audio-capture"?"viva_mic_busy":ev.error==="network"?"viva_rec_network":null;
    if(k){ VV.canListen=false; VV.listening=false; vvNote(k); hide($("#vvx-heardwrap"),true); vvStatus("turn"); } };
  /* it stops itself after a silence, and after any error; keep it going while the student answers */
  r.onend=function(){ if(!VV) return; VV.recOn=false; vvLog("rec: end");
    if(VV.sess){ VV.final=(VV.final+" "+VV.sess).trim(); VV.sess=""; }
    if(VV.listening&&!VV.stopped) vvRecStart(); };
  return r; }
function vvRecStart(){ if(!VV||VV.recOn) return; try{ VV.rec.start(); }
  catch(e){ setTimeout(function(){ if(VV&&VV.listening&&!VV.recOn) try{ VV.rec.start(); }catch(e2){} },300); } }
function vvListen(){
  VV.heard=""; VV.final=""; VV.sess=""; $("#vvx-heard").textContent="";
  hide($("#vvx-heardwrap"),!VV.canListen);
  if(!VV.canListen){ vvStatus("turn"); return; }
  vvStatus("listening"); vvShowPoints(false);
  vvRecInit(); VV.listening=true; VV.lastWord=0;
  vvRecStart();                       /* if the last answer's session is still stopping, its end event restarts it */
  clearInterval(VV.pauseTimer);
  VV.pauseTimer=setInterval(function(){
    if(!VV||!VV.listening||!VV.lastWord) return;   /* nothing said yet: the student may be thinking */
    var all=$$("#vvx-dots i").length&&$$("#vvx-dots i.on").length===$$("#vvx-dots i").length;
    if(Date.now()-VV.lastWord>(all?VV_PAUSE_ALL:VV_PAUSE)) vvDone(); },250); }
/* what the student has said so far; the screen shows only the last few words, so a long answer
   doesn't fill the screen while they talk */
function vvHeard(){ VV.heard=(VV.final+" "+(VV.sess||"")).trim();
  var w=VV.heard.split(/\s+/); $("#vvx-heard").textContent=w.length>14?"\u2026 "+w.slice(-14).join(" "):VV.heard;
  vvLight(); vvLog("rec: heard "+w.length+" words"); }
function vvStopListening(){ if(!VV) return; VV.listening=false; clearInterval(VV.pauseTimer);
  if(VV.rec&&VV.recOn){ try{ VV.rec.stop(); }catch(e){} } }
/* while the student talks, each point made fills a dot; the points themselves stay hidden */
function vvLight(){ var heard=vvWords(VV.heard), dots=$$("#vvx-dots i"), lis=$$("#vvx-pts li");
  /* a point is made by its own words or by any of its accepted phrasings */
  (VV.cur.points||[]).forEach(function(p,i){ var alts=[p].concat((VV.cur.accept||[])[i]||[]);
    if(alts.some(function(x){ return vvPointMade(x,heard); })){
    if(dots[i]) dots[i].classList.add("on"); if(lis[i]){ lis[i].classList.add("lit"); lis[i].querySelector("input").checked=true; } } }); }

/* ---- the screen */
function vvStatus(k){ VV.mode=k; var s=$("#vvx-status");
  s.textContent=k==="examiner"?VV.ui.viva_examiner:k==="listening"?VV.ui.viva_listening:k==="check"?VV.ui.viva_checking:k==="turn"?VV.ui.viva_you:k==="marking"?VV.ui.viva_marking:"";
  $("#vvx").setAttribute("data-mode",k); }
function vvNote(k){ var n=$("#vvx-note"); n.textContent=k?VV.ui[k]:""; hide(n,!k); }
/* only one main button shows at a time; Enter presses it */
function vvButtons(main,links){ ["vvx-done","vvx-next","vvx-finish"].forEach(function(id){ hide($("#"+id),id!==main); });
  ["vvx-repeat","vvx-hideq","vvx-end","vvx-again","vvx-retry"].forEach(function(id){ hide($("#"+id),(links||[]).indexOf(id)<0); });
  if(main) VV.main=main; else VV.main=null;
  hide($("#vvx-stuck"), main!=="vvx-done"); }
function vvHideLabel(){ var b=$("#vvx-hideq"); if(!b) return; var l=VV.hideText?b.getAttribute("data-show"):b.getAttribute("data-hide");
  b.setAttribute("aria-label",l); b.setAttribute("data-tip",l); b.classList.toggle("q-off",!!VV.hideText); }
function vvBuildPoints(){
  var ul=$("#vvx-pts"), dots=$("#vvx-dots"); ul.innerHTML=""; dots.innerHTML="";
  (VV.cur.points||[]).forEach(function(p){
    var li=document.createElement("li"), lb=document.createElement("label"), cb=document.createElement("input");
    cb.type="checkbox"; lb.appendChild(cb); var sp=document.createElement("span"); sp.textContent=p; lb.appendChild(sp);
    li.appendChild(lb); ul.appendChild(li); dots.appendChild(document.createElement("i")); });
  $("#vvx-a").textContent=VV.cur.a; var d=$("#vvx-ptswrap details"); if(d) d.open=false; vvScoreText(); }
function vvScoreText(){ var n=$$("#vvx-pts input").length, got=$$("#vvx-pts input").filter(function(x){ return x.checked; }).length;
  $$("#vvx-pts li").forEach(function(li){ li.classList.toggle("lit",li.querySelector("input").checked); });
  $("#vvx-score").textContent=VV.ui.viva_score.replace("{got}",got).replace("{of}",n); }
function vvShowPoints(on){ hide($("#vvx-ptswrap"),!on); hide($("#vvx-checknote"),!on||!VV.canListen);
  hide($("#vvx-dots"),on||!VV.canListen||VV.mode!=="listening"); if(on) vvScoreText(); }
/* the progress bar: one segment per topic, in its specialty's colour */
function vvProgress(){ var bar=$("#vvx-prog");
  if(!bar.children.length) VV.topics.forEach(function(t){ var i=document.createElement("i");
    i.style.setProperty("--c","var(--lens-"+t.lens+")"); bar.appendChild(i); });
  Array.prototype.forEach.call(bar.children,function(el,k){ el.className=k<VV.ti?"done":k===VV.ti?"now":""; }); }
function vvTopicHead(){ var t=VV.topics[VV.ti];
  $("#vvx-spec").textContent=t.title; $("#vvx").style.setProperty("--lens","var(--lens-"+t.lens+")");
  $("#vvx-count").textContent=VV.ui.viva_topic_of.replace("{n}",VV.ti+1).replace("{of}",VV.topics.length); vvProgress(); }
function vvStageLabel(){ return VV.stage==="open"?VV.ui.viva_stage_open:VV.stage==="nudge"?VV.ui.viva_stage_nudge
  :VV.ui.viva_stage_follow.replace("{n}",VV.stage); }
function vvAsk(item,lead){
  VV.cur=item; VV.retryHad=null; VV.retried=false; vvHush(); hide($("#vvx-coach"),true); vvTopicHead(); vvNote(VV.canListen?null:(VV.micBlocked?"viva_mic_blocked":"viva_no_listen"));
  $("#vvx-stage").textContent=vvStageLabel();
  var q=$("#vvx-q"); q.textContent=item.q; hide(q,VV.hideText);
  hide($("#vvx-heardwrap"),true); vvBuildPoints(); vvShowPoints(false); hide($("#vvx-dots"),true);
  vvButtons(null,["vvx-hideq","vvx-end"]);
  vvPlay((lead||[]).concat([item.id]),function(){ vvListen(); vvButtons("vvx-done",["vvx-repeat","vvx-hideq","vvx-end"]); }); }
/* the answer is over. The keyword match ticks what it can at once; then the marking service, when
   it answers, ticks the points the student made in their own words and adds one line of coaching.
   Offline, or if it fails, the keyword match stands. */
function vvDone(){ if(!VV||!VV.cur) return; vvStopListening(); if(VV.canListen) vvLight(); hide($("#vvx-q"),false);
  var item=VV.cur, heard=(VV.heard||"").trim();
  var signedIn=!!(window.pfUser&&window.pfUser());
  if(VV.canListen&&heard.split(/\s+/).length>=3&&window.pfJudge&&signedIn&&navigator.onLine!==false){
    vvStatus("marking"); vvButtons(null,["vvx-end"]); hide($("#vvx-coach"),true);
    var credited=$$("#vvx-pts input").map(function(cb,i){ return cb.checked?i:-1; }).filter(function(i){ return i>=0; });
    return window.pfJudge({q:item.q,a:item.a,points:item.points||[],heard:heard,credited:credited}).then(function(r){
        if(!VV||VV.cur!==item||VV.stopped) return;
        $$("#vvx-pts input").forEach(function(cb,i){ if(r&&r.made&&r.made[i]) cb.checked=true; });
        vvCheck(r&&r.coach); },
      function(){ if(VV&&VV.cur===item&&!VV.stopped) vvCheck(null); }); }
  vvCheck(null);
  /* the AI marking needs an account; the keyword match still marks, and the note says what signing in adds, once */
  if(VV.canListen&&!signedIn&&!VV.signinNoted){ VV.signinNoted=true; vvNote("viva_signin"); } }
/* the check: the points, the examiner's note, and the examiner saying the score and what was missed */
function vvCheck(coach){
  var silent=VV.canListen&&!(VV.heard||"").trim()&&!VV.retryHad;
  if(VV.retryHad) $$("#vvx-pts input").forEach(function(cb,i){ if(VV.retryHad[i]) cb.checked=true; });
  vvStatus("check"); vvShowPoints(true);
  var c=$("#vvx-coach"); $("#vvx-coachline").textContent=coach||""; hide(c,!coach);
  var missed=$$("#vvx-pts li").filter(function(li){ return !li.querySelector("input").checked; })
    .map(function(li){ return li.querySelector("span").textContent; });
  var canRetry=VV.canListen&&missed.length&&!VV.retried;
  if(silent){ vvNote("viva_heard_nothing"); canRetry=true; }
  vvButtons("vvx-next",canRetry?["vvx-retry","vvx-end"]:["vvx-end"]);
  if(VV.canListen&&!silent) vvSpeak(missed, coach); }
/* the examiner's voice when every clip is recorded (export_viva.py names them), else the phone's */
function vvSpeak(missed, coach){
  var have={}; (VV.ui.fbClips||[]).forEach(function(c){ have[c]=1; });
  var lis=$$("#vvx-pts li"), n=lis.length, idx=[];
  lis.forEach(function(li,i){ if(!li.querySelector("input").checked) idx.push(i); });
  /* one missed point: "You missed …"; several: "You missed the following: …" once that clip exists */
  var lead=idx.length>1&&have["fb-missed-list"]?"fb-missed-list":"fb-missed";
  var ids=!idx.length?["fb-all"]:["fb-"+(n-idx.length)+"-"+n,lead];
  idx.forEach(function(i,k){ if(k&&k===idx.length-1) ids.push("fb-and"); ids.push(VV.cur.id+"-p"+i); });
  if(ids.every(function(c){ return have[c]; })) return vvPlayQuiet(ids);
  vvSay(vvFeedback(missed), coach); }
/* clips one after another without changing the screen; any spoken feedback stops when the student moves on */
function vvPlayQuiet(ids){ var i=0, el=VA&&VA.el; if(!el||!VV) return; var tok=VV.playTok=(VV.playTok||0)+1;
  function next(){ if(!VV||VV.stopped||VV.playTok!==tok||VV.mode!=="check"||i>=ids.length) return;
    var once=false, go=function(){ if(once) return; once=true; next(); };
    el.onended=go; el.onerror=go; el.src=vvClip(ids[i++]); var p=el.play(); if(p&&p.catch) p.catch(go); }
  if(VA.ctx&&VA.ctx.state==="suspended") VA.ctx.resume(); next(); }
function vvFeedback(missed){ var U=VV.ui, n=$$("#vvx-pts input").length, got=n-missed.length;
  if(!missed.length) return U.viva_say_all;
  /* said mid-sentence, so a point starts in lower case unless it starts with an abbreviation */
  missed=missed.map(function(m){ return m.replace(/\.$/,"").replace(/^([A-Z])(?![A-Z])/,function(c){ return c.toLowerCase(); }); });
  var list=missed.length>1?missed.slice(0,-1).join(", ")+" "+U.viva_say_and+" "+missed[missed.length-1]:missed[0];
  return U.viva_say_score.replace("{got}",got).replace("{of}",n)+" "+(missed.length>1?U.viva_say_missed_list:U.viva_say_missed).replace("{list}",list.replace(/\.$/,"")); }
/* the examiner's spoken feedback. For now the phone's own voice reads it; recorded clips in the
   examiner's voice will take over. Nothing plays if the phone has no voice. */
function vvSay(text, coach){ var ss=window.speechSynthesis; if(!ss||!window.SpeechSynthesisUtterance) return;
  try{ ss.cancel(); var u=new SpeechSynthesisUtterance(text+(coach?" "+coach:"")); u.rate=1; u.lang="en-GB";
    var v=(ss.getVoices()||[]).filter(function(x){ return /^en(-|_)(GB|NG)/i.test(x.lang); })[0]; if(v) u.voice=v;
    ss.speak(u); }catch(e){} }
function vvHush(){ try{ window.speechSynthesis&&window.speechSynthesis.cancel(); }catch(e){}
  if(VA&&VA.el&&VV&&VV.mode==="check"){ try{ VA.el.pause(); }catch(e){} } }
/* one more go at the same question: what was made stays ticked */
function vvRetry(){ if(!VV||!VV.cur) return; vvHush();
  VV.retryHad=$$("#vvx-pts input").map(function(cb){ return cb.checked; }); VV.retried=true;
  hide($("#vvx-coach"),true); vvNote(null); vvShowPoints(false); $("#vvx-stage").textContent=VV.ui.viva_retry_lead;
  vvListen(); vvButtons("vvx-done",["vvx-hideq","vvx-end"]); }
function vvScore(){ var n=(VV.cur.points||[]).length, got=$$("#vvx-pts input").filter(function(x){ return x.checked; }).length;
  var t=VV.topics[VV.ti]; var r=VV.tally[t.id]=VV.tally[t.id]||{title:t.title,lens:t.lens,q:t.open.q,sec:t.sec,secTitle:t.secTitle,got:0,of:0,asked:[],missed:[]};
  var missed=$$("#vvx-pts li").filter(function(li){ return !li.querySelector("input").checked; })
    .map(function(li){ return li.querySelector("span").textContent; });
  r.got+=got; r.of+=n; r.asked.push({q:VV.cur.q,a:VV.cur.a,got:got,of:n}); r.missed=r.missed.concat(missed);
  return n?got>=Math.ceil(n/2):true; }
/* the branching: strong goes deeper, weak gets one simpler question on the opener, then a new topic */
function vvNext(){ if(!VV||!VV.cur) return; var strong=vvScore(), t=VV.topics[VV.ti];
  if(VV.stage==="open"){
    if(strong&&t.follow.length){ VV.stage=1; return vvAsk(t.follow[0],["x-good"]); }
    if(!strong){ VV.stage="nudge"; return vvAsk(t.nudge,["x-rephrase"]); } }
  else if(typeof VV.stage==="number"&&strong&&VV.stage<Math.min(VV_FOLLOW_CAP,t.follow.length)){
    VV.stage++; return vvAsk(t.follow[VV.stage-1],["x-good"]); }
  var lead=(typeof VV.stage==="number"&&!strong)?["x-move-on"]:["x-okay"];
  if(VV.ti===0&&!signedIn()){ state.tried.viva=1; save(); VV.gated=true; VV.ti++; return vvFinish(lead.concat(["x-end"])); }
  VV.ti++; VV.stage="open";
  if(VV.ti>=VV.topics.length) return vvFinish(lead.concat(["x-end"]));
  vvAsk(VV.topics[VV.ti].open,lead.concat(["x-new-topic"])); }
/* the end: the examiner closes, then the results show on the same screen */
function vvFinish(lead){
  /* nothing answered: there is nothing to report, so just close */
  if(!Object.keys(VV.tally).length) return vvClose();
  VV.early=VV.ti<VV.topics.length; vvStopListening(); vvButtons(null,[]); vvShowPoints(false); hide($("#vvx-dots"),true);
  hide($("#vvx-heardwrap"),true); vvNote(null); $("#vvx-q").textContent=""; $("#vvx-stage").textContent="";
  /* the bar shows the topics covered, so ending early leaves the rest empty */
  Array.prototype.forEach.call($("#vvx-prog").children,function(el,k){ el.className=k<VV.ti||(k===VV.ti&&VV.tally[VV.topics[k].id])?"done":""; });
  vvRecordResult();
  vvPlay(lead||[],function(){ vvStatus("end"); hide($("#vvx-live"),true); vvEndList(); vvVerdict(); hide($("#vvx-endpanel"),false);
    $("#vvx-spec").textContent=""; $("#vvx").style.removeProperty("--lens"); vvButtons("vvx-finish",["vvx-again"]);
    if(VV.gated) gate(); }); }
/* every finished viva is kept in this browser, so progress shows across attempts */
function vvPct(t){ var g=0,o=0; Object.keys(t).forEach(function(k){ g+=t[k].got; o+=t[k].of; }); return o?Math.round(100*g/o):0; }
function vvRecordResult(){ if(!Object.keys(VV.tally).length) return;
  VV.prev=state.vivas.length?state.vivas[state.vivas.length-1].pct:null;
  var topics=Object.keys(VV.tally).map(function(k){ var r=VV.tally[k];
    return {id:k,lens:r.lens,title:r.title,q:r.q,sec:r.sec,secTitle:r.secTitle,got:r.got,of:r.of}; });
  state.vivas.push({at:Date.now(),pct:vvPct(VV.tally),topics:topics});
  if(state.vivas.length>30) state.vivas=state.vivas.slice(-30);
  /* a topic under 60% comes back in Today's mix as its opening question; a strong one later puts it right */
  topics.forEach(function(t){ var key="vv:"+t.id, r=state.chk[key], weak=t.of&&t.got/t.of<0.6;
    if(weak) state.chk[key]={x:"vv",id:t.id,s:t.sec||"",l:t.lens,ok:0,at:Date.now()};
    else if(r&&!r.ok&&!r.fx){ r.fx=1; r.at=Date.now(); } });
  state.viva={at:Date.now(),tally:VV.tally}; save(); track("assessment","viva"); vvHistory(); }
function vvVerdict(){ var pct=vvPct(VV.tally), U=VV.ui, T=Object.keys(VV.tally).map(function(k){ return VV.tally[k]; });
  $("#vvx-endh").textContent=VV.early?U.viva_ended_early:U.viva_complete;
  $("#vvx-pct").textContent=pct+"%";
  var band=pct>=75?"hi":pct>=50?"mid":"lo"; $("#vvx-sring").className="vvx-score-ring "+band;
  var arc=$("#vvx-sarc"), L=2*Math.PI*52; arc.style.strokeDasharray=L.toFixed(1); arc.style.strokeDashoffset=(L*(1-pct/100)).toFixed(1);
  $("#vvx-praise").textContent=band==="hi"?U.viva_praise_high:band==="mid"?U.viva_praise_mid:U.viva_praise_low;
  var p=VV.prev, c=$("#vvx-cmp"), has=p!==null&&p!==undefined;
  c.textContent=!has?U.viva_first:pct>p?U.viva_up.replace("{p}",p):pct<p?U.viva_down.replace("{p}",p):U.viva_same;
  c.className="vvx-cmp"+(has&&pct>p?" up":"");
  var q=0,g=0,o=0; T.forEach(function(r){ q+=r.asked.length; g+=r.got; o+=r.of; });
  $("#vvx-stats").textContent=U.viva_stats.replace("{t} topics",T.length+(T.length===1?" topic":" topics"))
    .replace("{q} questions",q+(q===1?" question":" questions")).replace("{g}",g).replace("{o}",o);
  var best=T.filter(function(r){ return r.of&&r.got/r.of>=0.75; }).sort(function(a,b){ return b.got/b.of-a.got/a.of; })[0];
  var sEl=$("#vvx-strong"); if(best&&T.length>1){ sEl.textContent=U.viva_strongest.replace("{topic}",best.q.replace(/^Tell me what you know about /,"").replace(/\.$/,"")); hide(sEl,false); } else hide(sEl,true);
  /* the sections to reread: every topic under 60%, with the points that were missed */
  var weak=Object.keys(VV.tally).map(function(k){ return VV.tally[k]; }).filter(function(r){ return r.sec&&r.of&&r.got/r.of<0.6; });
  var box=$("#vvx-rereadlist"); box.innerHTML="";
  weak.forEach(function(r){ var a=document.createElement("a"); a.className="rr-link"; a.href="#"+r.sec;
    a.setAttribute("data-lens",r.lens); a.style.setProperty("--lens","var(--lens-"+r.lens+")");
    a.innerHTML=esc(r.secTitle)+' <span class="rr-lens">'+esc(r.title)+'</span><span aria-hidden="true"> →</span>';
    box.appendChild(a);
    if(r.missed&&r.missed.length){ var m=document.createElement("p"); m.className="rr-missed"; m.textContent=r.missed.slice(0,4).join(" · "); box.appendChild(m); } });
  hide($("#vvx-reread"),!weak.length);
  $("#vvx-hint").textContent=weak.length?U.viva_reread_hint:""; }
/* the progress panel on the viva card: recent scores as bars, and the best */
function vvHistory(){ var body=$("#vv-histbody"); if(!body) return; var h=state.vivas||[], U=vvData("viva-ui")||{};
  if(!h.length){ body.innerHTML='<p class="vv-hnone">'+esc(U.viva_none||"")+'</p>'; return; }
  var last=h.slice(-10), best=Math.max.apply(null,h.map(function(x){ return Math.round(Number(x.pct))||0; }));
  body.innerHTML='<div class="vv-bars">'+last.map(function(x){ var d=new Date(x.at);
      var p=Math.round(Number(x.pct))||0;   /* a stored record is still data: only ever a number here */
      return '<span class="vv-bar" title="'+d.toLocaleDateString()+': '+p+'%"><i style="height:'+Math.max(4,p)+'%"></i><b>'+p+'</b></span>'; }).join("")
    +'</div><p class="vv-best">'+esc((U.viva_best||"").replace("{p}",best))+'</p>'; }
function vvEndList(){ var box=$("#vvx-endlist"); box.innerHTML="";
  Object.keys(VV.tally).forEach(function(k){ var r=VV.tally[k], row=document.createElement("details"); row.className="vvx-row";
    row.style.setProperty("--c","var(--lens-"+r.lens+")");
    var s=document.createElement("summary"), name=document.createElement("span"), bar=document.createElement("span"), n=document.createElement("span");
    name.className="vvx-row-t"; name.textContent=r.q.replace(/^Tell me what you know about /,"").replace(/\.$/,"");
    bar.className="vvx-row-bar"; var f=document.createElement("i"); f.style.width=(r.of?Math.round(100*r.got/r.of):0)+"%"; bar.appendChild(f);
    n.className="vvx-row-n"; n.textContent=r.got+"/"+r.of; s.appendChild(name); s.appendChild(bar); s.appendChild(n); row.appendChild(s);
    r.asked.forEach(function(x){ var p=document.createElement("p"), b=document.createElement("b"); b.textContent=x.q+" ";
      p.appendChild(b); p.appendChild(document.createTextNode(x.a)); row.appendChild(p); });
    box.appendChild(row); }); }
function vvClose(finished){ if(!VV) return; var hadResult=state.vivas&&state.vivas.length&&Object.keys(VV.tally).length;
  VV.stopped=true; vvStopListening(); if(hadResult) setTimeout(suShow,1500);
  if(VV.rec){ try{ VV.rec.abort(); }catch(e){} } try{ VA.el.pause(); }catch(e){}
  if(VA.mic&&VA.mic.getTracks){ VA.mic.getTracks().forEach(function(x){ x.stop(); }); } VA.mic=null; VA.micAn=null;
  try{ window.speechSynthesis&&window.speechSynthesis.cancel(); }catch(e){}
  hide($("#vvx"),true); document.body.style.overflow="";
  VV=null; var b=$("#vv-start"); if(b) b.focus(); }
/* leaving the page, or switching away from it, ends the viva: the microphone must never stay on */
window.addEventListener("pagehide",function(){ if(VV) vvClose(); });
document.addEventListener("visibilitychange",function(){ if(document.hidden&&VV&&VV.listening){ vvStopListening(); if(VV.rec){ try{ VV.rec.abort(); }catch(e){} } } });
function vvStart(){
  var bank=vvData("viva-bank")||[]; if(!bank.length) return;
  if(state.tried.viva&&gate()) return;
  vvAudioInit();
  VV={ui:vvData("viva-ui")||{},topics:vvChoose(bank),ti:0,stage:"open",tally:{},
      hideText:!!state.vivaHide,canListen:!!vvRecog(),micBlocked:false,stopped:false};
  $("#vvx-prog").innerHTML=""; hide($("#vvx-live"),false); hide($("#vvx-endpanel"),true);
  hide($("#vvx"),false); document.body.style.overflow="hidden";
  $("#vvx-close").focus(); vvRing(); vvHideLabel();
  function go(){ vvAsk(VV.topics[0].open,["x-start"]); }
  if(VV.canListen) vvMicStart(function(ok){ if(!VV) return; if(!ok){ VV.canListen=false; VV.micBlocked=true; } go(); });
  else go(); }

/* ---- the ring: the examiner's voice in the specialty's colour, the student's in ink */
function vvRing(){
  var cv=$("#vvx-ring"); if(!cv) return; var g=cv.getContext("2d"), N=72, buf=new Uint8Array(128);
  function lvl(an){ if(!an) return null; an.getByteFrequencyData(buf); return buf; }
  function frame(t){ if(!VV||VV.stopped){ g.clearRect(0,0,cv.width,cv.height); return; }
    var W=cv.width, H=cv.height, cx=W/2, cy=H/2, r0=W*0.26; g.clearRect(0,0,W,H);
    var cs=getComputedStyle($("#vvx")), lens=cs.getPropertyValue("--lens").trim()||"#888", ink=cs.getPropertyValue("--ink").trim();
    var src=VV.mode==="examiner"?lvl(VA.an):(VV.mode==="listening"?lvl(VA.micAn):null);
    if(!src&&VV.mode==="listening"&&VV.lastSound&&t-0>0&&Date.now()-Math.max(VV.lastSound,VV.lastWord||0)<900){
      src=buf; for(var j=0;j<buf.length;j++) buf[j]=110+80*Math.sin(t/120+j*0.9); }
    var col=VV.mode==="examiner"?lens:ink, idle=!src;
    g.lineCap="round"; g.lineWidth=W*0.012;
    for(var i=0;i<N;i++){ var a=i/N*Math.PI*2-Math.PI/2;
      var v=idle?(0.08+0.05*Math.sin(t/600+i*0.5)):(src[(i%36)+2]/255);
      var len=W*0.03+v*W*0.16;
      g.strokeStyle=col; g.globalAlpha=idle?0.35:0.55+0.45*v;
      g.beginPath(); g.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);
      g.lineTo(cx+Math.cos(a)*(r0+len),cy+Math.sin(a)*(r0+len)); g.stroke(); }
    g.globalAlpha=1; g.fillStyle=col; g.globalAlpha=0.12; g.beginPath(); g.arc(cx,cy,r0*0.86,0,Math.PI*2); g.fill(); g.globalAlpha=1;
    requestAnimationFrame(frame); }
  requestAnimationFrame(frame); }

document.addEventListener("click",function(ev){
  if(ev.target.closest("#mcq-reset")){ state.mcq={}; save();
    $$("#L-assessment .out").forEach(function(o){ hide(o,true); }); $$("#L-assessment .opt-b").forEach(function(b){ b.setAttribute("aria-expanded","false"); });
    return mcqSummary(false); }
  var t=ev.target.closest("#vv-start,#vvx-close,#vvx-repeat,#vvx-done,#vvx-next,#vvx-end,#vvx-finish,#vvx-again,#vvx-hideq,#vvx-retry"); if(!t) return;
  if(t.id==="vvx-retry") return vvRetry();
  if(t.id==="vvx-next"||t.id==="vvx-end"||t.id==="vvx-close") vvHush();
  if(t.id==="vv-start") return vvStart();
  if(!VV) return;
  if(t.id==="vvx-close"||t.id==="vvx-finish") return vvClose();
  if(t.id==="vvx-end") return vvFinish([]);
  if(t.id==="vvx-again"){ vvClose(); return vvStart(); }
  if(t.id==="vvx-repeat"){ vvStopListening(); vvButtons(null,["vvx-hideq","vvx-end"]);
    return vvPlay([VV.cur.id],function(){ vvListen(); vvButtons("vvx-done",["vvx-repeat","vvx-hideq","vvx-end"]); }); }
  /* exam conditions: hear the question without reading it; it shows again once answered */
  if(t.id==="vvx-hideq"){ VV.hideText=!VV.hideText; state.vivaHide=VV.hideText; save(); vvHideLabel();
    if(VV.mode!=="check") hide($("#vvx-q"),VV.hideText); return; }
  if(t.id==="vvx-done") return vvDone();
  if(t.id==="vvx-next") return vvNext();
});
document.addEventListener("keydown",function(ev){ if(!VV) return;
  if(ev.key==="Escape") return vvClose();
  if(ev.key==="Enter"&&VV.main&&!ev.target.closest("button,summary,input")){ ev.preventDefault(); $("#"+VV.main).click(); } });
document.addEventListener("change",function(ev){ if(VV&&ev.target.closest("#vvx-pts")) vvScoreText(); });

vvHistory(); mcqSummary(false);

/* ---- the sign-up bubble: after about eight minutes of reading, or a finished viva. A dismissal
   waits a week; a second one, or a sign-up, ends it. */
var SU_AFTER=480, SU_WAIT=7*864e5;
function suEligible(){ var u=state.signup||{}; if(u.done||(u.dismissed||0)>=2) return false;
  return !(u.at&&Date.now()-u.at<SU_WAIT); }
var SU_T0=Date.now();
function suShow(){ if(!suEligible()||!$("#su")||VV||(window.pfUser&&window.pfUser())||Date.now()-SU_T0<180e3) return; hide($("#su"),false); $("#su").classList.add("in"); }
setInterval(function(){ if(document.visibilityState!=="visible") return; state.time=(state.time||0)+15;
  if(state.time%60===0) save(); if(state.time>=SU_AFTER&&$("#su")&&$("#su").hidden) suShow(); },15000);
function suDismiss(){ var u=state.signup=state.signup||{}; u.dismissed=(u.dismissed||0)+1; u.at=Date.now(); save(); hide($("#su"),true); }
if($("#su-go")) $("#su-go").addEventListener("click",function(){ hide($("#su"),true);
  state.signup=state.signup||{}; state.signup.at=Date.now(); save(); if(window.pfOpenAccount) window.pfOpenAccount(); });
if($("#su-x")) $("#su-x").addEventListener("click",suDismiss);

/* ---- first-use cues: the first time an interactive block comes into view, its main control
   pulses, until the student uses it. Once used, a block never pulses again. */
var CUE_SEL=".sn,.card,.pin,.tab,.is-dot,.bm-site,.gz-mk,.sl-range,.rev>summary,.tick";
function cueKey(b){ var l=b.closest(".lens"); if(!l) return null;
  return l.id+":"+$$(".blk",l).indexOf(b); }
if("IntersectionObserver" in window){
  /* a quarter in view is enough: some blocks (a flow chart beside its steps) are taller than the screen */
  var cueObs=new IntersectionObserver(function(es){ es.forEach(function(en){ if(!en.isIntersecting) return;
      var b=en.target, k=cueKey(b); cueObs.unobserve(b);
      if(k&&!state.cued[k]) b.classList.add("cue-on"); }); },{threshold:0.25});
  $$(".lens .blk").forEach(function(b){ if(b.querySelector(CUE_SEL)) cueObs.observe(b); });
}
function cueDone(ev){ var b=ev.target.closest&&ev.target.closest(".blk.cue-on"); if(!b) return;
  b.classList.remove("cue-on"); var k=cueKey(b); if(k){ state.cued[k]=1; save(); } }
document.addEventListener("pointerdown",cueDone,true);
document.addEventListener("keydown",cueDone,true);
document.addEventListener("input",cueDone,true);

/* ---- highlights: select any text, keep it, and add a note to it ---------------------- */
/* A highlight is stored as its words plus the few characters before them, so it finds its place
   again after a reload or on another device. Removing one leaves a dated marker, so a device that
   still has it doesn't bring it back when the two records are merged. */
var HLSKIP=".np-wrap,.term-tip,script,style,svg,textarea,input,select,.hlbar,.hlnote,[aria-hidden='true']";
function hlSkip(n){ var p=n.parentNode; return !p||!p.closest||!!p.closest(HLSKIP); }
function hlLens(n){ var el=n&&(n.nodeType===1?n:n.parentNode); if(!el||!el.closest) return null;
  if(el.closest(HLSKIP+",button:not(.term),a,label,.topbar,.rail,.vvx")) return null;
  return el.closest(".lens"); }
function hlText(lens){ var w=document.createTreeWalker(lens,NodeFilter.SHOW_TEXT,{acceptNode:function(n){ return hlSkip(n)?2:1; }}),
    T={nodes:[],s:""}; while(w.nextNode()){ T.nodes.push([w.currentNode,T.s.length]); T.s+=w.currentNode.nodeValue; } return T; }
function hlPos(lens,T,c,o){
  if(c.nodeType===3) for(var i=0;i<T.nodes.length;i++) if(T.nodes[i][0]===c) return T.nodes[i][1]+o;
  var pre=document.createRange(); pre.selectNodeContents(lens); pre.setEnd(c,o); var x=0;
  for(var j=0;j<T.nodes.length;j++){ var n=T.nodes[j][0]; if(!pre.intersectsNode(n)) break; x=T.nodes[j][1]+n.nodeValue.length; }
  return x; }
function hlWrap(T,a,b,id,note){
  T.nodes.forEach(function(e){ var n=e[0], o=e[1], L=n.nodeValue.length, s=Math.max(a,o)-o, f=Math.min(b,o+L)-o;
    if(f<=s||!n.nodeValue.slice(s,f).trim()) return;
    if(f<L) n.splitText(f); if(s>0) n=n.splitText(s);
    var m=document.createElement("mark"); m.className="hl"+(note?" has-note":""); m.setAttribute("data-hl",id);
    n.parentNode.insertBefore(m,n); m.appendChild(n); }); }
function hlUnwrap(id){ $$('mark[data-hl="'+id+'"]').forEach(function(m){ var p=m.parentNode;
  while(m.firstChild) p.insertBefore(m.firstChild,m); p.removeChild(m); p.normalize(); }); }
function hlPlace(id){ var h=state.hl[id], lens=h&&!h.del&&$("#L-"+h.l); if(!lens) return false;
  var T=hlText(lens), i=T.s.indexOf((h.p||"")+h.t), a=i>=0?i+(h.p||"").length:T.s.indexOf(h.t);
  if(a<0) return false; hlWrap(T,a,a+h.t.length,id,h.n); return true; }
function hlOf(l){ return Object.keys(state.hl).map(function(k){ var h=state.hl[k]; return h&&!h.del&&h.l===l?Object.assign({id:k},h):null; })
  .filter(Boolean).sort(function(x,y){ var a=$('mark[data-hl="'+x.id+'"]'), b=$('mark[data-hl="'+y.id+'"]');
    return a&&b?(a.compareDocumentPosition(b)&4?-1:1):(x.at-y.at); }); }
function hlList(l){ var box=$('.hl-list[data-hll="'+l+'"]'); if(!box) return; var hs=hlOf(l);
  hide(box,!hs.length); if(!hs.length){ box.innerHTML=""; return; }
  box.innerHTML='<h3>'+esc(box.getAttribute("data-h"))+'</h3>'+hs.map(function(h){
    var t=h.t.replace(/\s+/g," "); if(t.length>140) t=t.slice(0,137)+"…";
    return '<button class="hl-i" data-go="'+h.id+'"><q>'+esc(t)+'</q>'+(h.n?'<span>'+esc(h.n)+'</span>':'')+'</button>'; }).join(""); }
var hlSel=null, hlCur=null, hlT=null;
function hlBar(rect,mode){ var b=$("#hlbar"); if(!b) return; hlCur=mode==="sel"?null:hlCur;
  $$("[data-a]",b).forEach(function(x){ var a=x.getAttribute("data-a");
    hide(x, mode==="sel"?(a==="del"||a==="edit"):(a==="hl"||a==="note"&&!!(state.hl[hlCur]||{}).n||a==="edit"&&!(state.hl[hlCur]||{}).n)); });
  hide(b,false); var coarse=matchMedia("(pointer:coarse)").matches, w=b.offsetWidth, h=b.offsetHeight;
  b.classList.toggle("hl-dock",coarse); if(coarse){ b.style.left=""; b.style.top=""; return; }
  var x=Math.max(8,Math.min(innerWidth-w-8,rect.left+rect.width/2-w/2)), y=coarse||rect.top<h+70?rect.bottom+10:rect.top-h-8;
  b.style.left=(x+scrollX)+"px"; b.style.top=(y+scrollY)+"px"; }
function hlHide(){ hide($("#hlbar"),true); }
function hlCheck(){ var sel=getSelection(); if(!sel||!sel.rangeCount||sel.isCollapsed){ hlSel=null; if(!hlCur) hlHide(); return; }
  var r=sel.getRangeAt(0), lens=hlLens(r.startContainer); if(!lens||hlLens(r.endContainer)!==lens||!r.toString().trim()){ hlSel=null; hlHide(); return; }
  hlSel={r:r.cloneRange(),lens:lens}; hlCur=null; hlBar(r.getBoundingClientRect(),"sel"); }
document.addEventListener("selectionchange",function(){ clearTimeout(hlT); hlT=setTimeout(hlCheck,matchMedia("(pointer:coarse)").matches?450:180); });
function hlMake(){ if(!hlSel) return null; var lens=hlSel.lens, T=hlText(lens), r=hlSel.r;
  var a=hlPos(lens,T,r.startContainer,r.startOffset), b=hlPos(lens,T,r.endContainer,r.endOffset);
  while(a<b&&/\s/.test(T.s[a])) a++; while(b>a&&/\s/.test(T.s[b-1])) b--;
  if(b-a<2||b-a>2000) return null;
  var id="h"+Date.now().toString(36)+Math.random().toString(36).slice(2,6), l=lens.id.replace(/^L-/,"");
  state.hl[id]={l:l,t:T.s.slice(a,b),p:T.s.slice(Math.max(0,a-24),a),at:Date.now()};
  hlWrap(T,a,b,id,""); getSelection().removeAllRanges(); hlSel=null; save(); hlList(l);
  praiseOnce("hl",uiStr("hl_first"),l); return id; }
function hlNote(id){ var h=state.hl[id], box=$("#hlnote"), m=$('mark[data-hl="'+id+'"]'); if(!h||!box||!m) return;
  box.style.setProperty("--lens","var(--lens-"+h.l+")");
  hlCur=id; hlHide(); var t=h.t.replace(/\s+/g," "); $("#hlnote-q").textContent=t.length>120?t.slice(0,117)+"…":t;
  var ta=$("#hlnote-t"); ta.value=h.n||""; hide(box,false);
  var r=m.getBoundingClientRect(), w=box.offsetWidth, x=Math.max(8,Math.min(innerWidth-w-8,r.left));
  box.style.left=(x+scrollX)+"px"; box.style.top=(r.bottom+scrollY+10)+"px"; ta.focus(); }
function hlNoteSave(){ var h=state.hl[hlCur]; if(h){ h.n=$("#hlnote-t").value.trim(); h.at=Date.now(); save();
    $$('mark[data-hl="'+hlCur+'"]').forEach(function(m){ m.classList.toggle("has-note",!!h.n); }); hlList(h.l); }
  hide($("#hlnote"),true); hlCur=null; }
document.addEventListener("mousedown",function(ev){ if(ev.target.closest("#hlbar")) ev.preventDefault(); });
document.addEventListener("click",function(ev){
  var b=ev.target.closest("#hlbar [data-a]");
  if(b){ var a=b.getAttribute("data-a");
    if(a==="hl"){ hlMake(); hlHide(); }
    else if(a==="note"&&hlSel){ var id=hlMake(); if(id) hlNote(id); }
    else if((a==="note"||a==="edit")&&hlCur) hlNote(hlCur);
    else if(a==="del"&&hlCur){ var l=state.hl[hlCur].l; hlUnwrap(hlCur); state.hl[hlCur]={del:1,at:Date.now()}; save(); hlList(l); hlCur=null; hlHide(); }
    return; }
  var n=ev.target.closest("#hlnote [data-a]");
  if(n){ if(n.getAttribute("data-a")==="save") hlNoteSave(); else { hide($("#hlnote"),true); hlCur=null; } return; }
  var g=ev.target.closest(".hl-i");
  if(g){ var m=$('mark[data-hl="'+g.getAttribute("data-go")+'"]'), ml=m&&m.closest(".lens");
    if(ml&&ml.hasAttribute("hidden")){ show(ml.id.slice(2),{push:true}); reveal(m); m.scrollIntoView({block:"center"}); }
    if(m){ reveal(m); m.scrollIntoView({block:"center",behavior:glide()});
      m.classList.remove("flash"); void m.offsetWidth; m.classList.add("flash"); } return; }
  var mk=ev.target.closest("mark.hl");
  if(mk&&getSelection().isCollapsed&&!ev.target.closest(".term")){ hlCur=mk.getAttribute("data-hl"); hlBar(mk.getBoundingClientRect(),"mark"); return; }
  if(!ev.target.closest("#hlnote")){ hide($("#hlnote"),true); if(!hlSel){ hlCur=null; hlHide(); } }
});
document.addEventListener("keydown",function(ev){ if(ev.key==="Escape"){ hide($("#hlnote"),true); hlHide(); hlCur=null; }
  if(ev.key==="Enter"&&(ev.metaKey||ev.ctrlKey)&&ev.target.id==="hlnote-t") hlNoteSave(); });
function hlRestore(){ Object.keys(state.hl).forEach(hlPlace); $$(".hl-list").forEach(function(b){ hlList(b.getAttribute("data-hll")); }); }

/* ---- open ------------------------------------------------------------------------- */
var start=(location.hash||"").slice(1), deep=null;
/* a link to a section (from the game, say) opens its lens and scrolls to it */
if(!$("#L-"+start)){ var el=start&&document.getElementById(start), ln=el&&el.closest&&el.closest(".lens");
  if(ln){ deep=el; start=ln.id.replace(/^L-/,""); } else start=state.lens&&$("#L-"+state.lens)?state.lens:($("#L-orientation")?"orientation":($(".lens")||{id:"L-orientation"}).id.slice(2)); }
show(start);
if(deep) setTimeout(function(){ reveal(deep); deep.scrollIntoView({block:"start"}); },60);
$$(".lens").forEach(function(s){ ring(s.id.replace(/^L-/,"")); });
$$(".np").forEach(function(t){ var v=state.notes[t.getAttribute("data-np")]; if(v) t.value=v; });
hlRestore();
/* show the reader's earlier judgement on each open question */
$$(".sec[id]").forEach(function(sc){ $$(".rev-g",sc).forEach(function(g,k){ var r=state.chk[sc.id+":r"+k]; if(!r) return;
  var yes=r.ok||r.fx; $$(".rev-b",g).forEach(function(b){ b.setAttribute("aria-pressed",(b.getAttribute("data-rev")==="1")===!!yes?"true":"false"); }); }); });


/* ---- my notes: every lens's notes and highlights in one place ----------------------- */
function nbLenses(){ return $$(".rail a[data-lens]").map(function(a){ return a.getAttribute("data-lens"); })
  .filter(function(l){ return l!=="notes"&&$('.np[data-np="'+l+'"]'); }); }
function nbCount(){ var b=$("#nb-count"); if(!b) return;
  var n=Object.keys(state.hl||{}).filter(function(k){ var h=state.hl[k]; return h&&!h.del&&(h.n||"").trim(); }).length
    + Object.keys(state.notes||{}).filter(function(k){ return (state.notes[k]||"").trim(); }).length;
  b.textContent=n; hide(b,!n); var b2=$("#nb-count2"); if(b2){ b2.textContent=n; hide(b2,!n); } }
function nbRender(){
  var box=$("#nb-list"); if(!box) return; var any=false;
  box.innerHTML=nbLenses().map(function(l){
    var hs=hlOf(l).filter(function(h){ return (h.n||"").trim(); }), txt=state.notes[l]||""; if(hs.length||txt.trim()) any=true;
    var ic=$('.rail a[data-lens="'+l+'"] .ic'), go=esc(box.getAttribute("data-go").replace("{lens}",titleOf(l)));
    /* the same cues as the rest of the module: the lens's icon and colour name it, an arrow goes there */
    return '<div class="nb-card" style="--lens:var(--lens-'+l+',var(--ink-2))"><div class="nb-h">'+(ic?ic.outerHTML:'')+'<b>'+esc(titleOf(l))+'</b>'
      +'<a class="nb-go tip" href="#'+l+'" data-lens="'+l+'" aria-label="'+go+'" data-tip="'+go+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div>'
      +'<textarea class="nb-ta" data-nb="'+l+'" rows="'+(txt.trim()?4:2)+'" placeholder="'+esc(box.getAttribute("data-ph"))+'" aria-label="'+esc(titleOf(l))+'">'+esc(txt)+'</textarea>'
      +(hs.length?'<div class="nb-hl">'+hs.map(function(h){ var t=h.t.replace(/\s+/g," "); if(t.length>160) t=t.slice(0,157)+"…";
        return '<button class="hl-i" data-go="'+h.id+'"><q>'+esc(t)+'</q>'+(h.n?'<span>'+esc(h.n)+'</span>':'')+'</button>'; }).join("")+'</div>':'')
      +'</div>'; }).join("");
  hide($("#nb-empty"),any);
}
document.addEventListener("input",function(ev){ var t=ev.target; if(!t.matches||!t.matches(".nb-ta")) return;
  var l=t.getAttribute("data-nb"); state.notes[l]=t.value; save();
  var np=$('.np[data-np="'+l+'"]'); if(np) np.value=t.value; });
$("#nb-dl")&&$("#nb-dl").addEventListener("click",function(){ dl("diabetes-notes.md", notesFile(), "text/markdown"); });
nbCount();
/* ---- search -------------------------------------------------------------------------- */
/* The whole module is already on the page, so search reads it straight from the page: every
   section of every lens, its heading and its words. Assessment and self-check answers are left out (they would give away
   answers). A result opens its lens and lands on the
   section. */
var SR=null, srSel=-1;
function srNorm(x){ return (x||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," "); }
function srIndex(){
  var out=[], n=0;
  $$(".lens").forEach(function(L){
    var lens=L.id.slice(2); if(lens==="assessment") return;
    var title=L.getAttribute("data-title")||"";
    $$(".sec",L).forEach(function(sec){
      var h=$("h2",sec); if(!h||sec.classList.contains("np-wrap")) return;
      if(!sec.id) sec.id="sr-"+(++n);
      var c=sec.cloneNode(true);
      /* keep the teaching, drop the chrome: answers, credits, marker numbers, button labels */
      $$("h2, button:not(.card):not(.ch-b), .ch-n, script, style, textarea, video, .hl-list, .attrib, .fig-lab, .hs-hint, .hs-n, details.rev > p, .sec-links, .card-turn",c).forEach(function(x){ x.remove(); });
      /* a space between blocks, so words from a cell and the next don't run together */
      $$("p, li, div, td, th, dt, dd, h3, h4, b, strong, figcaption, blockquote, summary, tr, br, label, figure, text, .fl-branch, .ch-t",c).forEach(function(x){ x.after(" "); });
      var text=(c.textContent||"").replace(/\s+/g," ").replace(/\s+([.,;:!?)])/g,"$1").trim();
      var hc=h.cloneNode(true); $$(".slot",hc).forEach(function(x){ x.remove(); });
      var head=(hc.textContent||"").replace(/\s+/g," ").trim();
      out.push({lens:lens, title:title, id:sec.id, head:head, text:text, nh:srNorm(head), nt:srNorm(text)});
    });
  });
  return out;
}
function srEsc(x){ return x.replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function srMark(x, words){
  var safe=srEsc(x); if(!words.length) return safe;
  var re=new RegExp("("+words.map(function(w){ return w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }).join("|")+")","gi");
  return safe.replace(re,"<mark>$1</mark>");
}
function srRun(q){
  var list=$("#sr-list"), words=srNorm(q).trim().split(" ").filter(function(w){ return w.length>1; });
  srSel=-1;
  if(!words.length){ list.innerHTML='<p class="sr-msg">'+srEsc(list.getAttribute("data-hint"))+'</p>'; return; }
  var hits=[];
  SR.forEach(function(r){
    var all=r.nh+" "+r.nt, ok=words.every(function(w){ return all.indexOf(w)>=0; });
    if(!ok) return;
    var score=0;
    words.forEach(function(w){ if(r.nh.indexOf(w)>=0) score+=10; score+=Math.min(5,r.nt.split(w).length-1); });
    hits.push({r:r, score:score});
  });
  hits.sort(function(a,b){ return b.score-a.score; });
  if(!hits.length){ list.innerHTML='<p class="sr-msg">'+srEsc(list.getAttribute("data-none"))+'</p>'; return; }
  list.innerHTML=hits.slice(0,25).map(function(h){
    var r=h.r, i=r.nt.indexOf(words[0]), snip;
    if(i<0) snip=r.text.slice(0,140);
    else { var a=Math.max(0,i-60); snip=(a?"…":"")+r.text.slice(a,a+150)+(a+150<r.text.length?"…":""); }
    return '<a class="sr-r" href="#'+r.id+'" data-lens="'+r.lens+'" style="--lens:var(--lens-'+r.lens+')">'
      +'<span class="sr-l">'+srEsc(r.title)+'</span><b>'+srMark(r.head,words)+'</b>'
      +'<span class="sr-s">'+srMark(snip,words)+'</span></a>';
  }).join("");
}
function openSearch(){
  var w=$("#srwrap"); if(!w) return;
  if(!SR) SR=srIndex();
  var was=w.hasAttribute("hidden"); if(was) srFrom=document.activeElement;
  hide(w,false); if(was) modal(true,w); var inp=$("#sr-q"); inp.focus(); inp.select(); srRun(inp.value);
}
var srFrom=null;
function closeSearch(keep){
  var w=$("#srwrap"); if(!w||w.hasAttribute("hidden")) return;
  hide(w,true); modal(false);
  if(!keep){ var b=srFrom&&document.contains(srFrom)&&srFrom.getClientRects().length?srFrom:$("#srchb"); if(b) b.focus(); }
}
function flashHit(el){ el.classList.remove("sr-hit"); void el.offsetWidth; el.classList.add("sr-hit");
  setTimeout(function(){ el.classList.remove("sr-hit"); },1800); }
$("#sr-q")&&$("#sr-q").addEventListener("input",function(ev){ srRun(ev.target.value); });
$("#sr-q")&&$("#sr-q").addEventListener("keydown",function(ev){
  var rs=$$(".sr-r"); if(!rs.length) return;
  if(ev.key==="ArrowDown"||ev.key==="ArrowUp"){ ev.preventDefault();
    srSel=(srSel+(ev.key==="ArrowDown"?1:-1)+rs.length)%rs.length;
    rs.forEach(function(r,k){ r.classList.toggle("on",k===srSel); }); rs[srSel].scrollIntoView({block:"nearest"}); }
  if(ev.key==="Enter"){ ev.preventDefault(); (rs[srSel<0?0:srSel]).click(); }
});
})();
}catch(e){setTimeout(function(){throw e})}
try{
(function(){
"use strict";
var A=window.pfApp, box=document.getElementById("xm-data"); if(!A||!box) return;
var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var D=JSON.parse(box.textContent), U=D.ui, PASS=U.pass, X=null, tick=null, actx=null, PAPER=null;
function esc(x){ return String(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function f(s,o){ return String(s).replace(/\{(\w+)\}/g,function(m,k){ return k in o?o[k]:m; }); }
function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function clock(s){ s=Math.max(0,Math.ceil(s)); return Math.floor(s/60)+":"+("0"+s%60).slice(-2); }
function hist(k){ var e=A.state.exams=A.state.exams||{}; return e[k]=e[k]||[]; }
/* each card says how the student did, once there's something to say; a paper left mid-way says so instead */
function records(){ var run=runGet();
  $$("[data-rec]").forEach(function(el){ var k=el.getAttribute("data-rec"),
    l=k==="viva"?(A.state.vivas||[]).map(function(v){ return {p:v.pct}; }):hist(k), live=k==="mcq"&&run;
  hide(el,!l.length&&!live); el.classList.toggle("run",!!live);
  el.textContent=live?(run.end>Date.now()?f(U.in_progress,{t:clock((run.end-Date.now())/1000)}):U.in_progress_out)
    :l.length?f(U.last,{p:l[l.length-1].p})+" · "+f(U.best,{p:Math.max.apply(null,l.map(function(x){ return x.p; }))}):""; });
  var g=$('[data-xstart="mcq"]'); if(g) g.textContent=g.getAttribute(run?"data-resume":"data-go"); }
/* the paper in progress is kept on this device after every answer, so a call or a closed tab doesn't lose it.
   Only the module's own paper: not a practice run, and not a paper made from the student's slides */
var RUN="patandfam.diabetes.v1.xm";
function runGet(){ try{ var r=JSON.parse(localStorage.getItem(RUN)||"null"); return r&&r.ids&&r.ids.length?r:null; }catch(e){ return null; } }
function runSave(){ if(!X||X.kind!=="mcq"||X.practice||!PAPER||PAPER.key!=="mcq"||X.stage==="result") return;
  try{ localStorage.setItem(RUN,JSON.stringify({ids:X.qs.map(function(q){ return q.id; }),ans:X.ans,flag:X.flag,i:X.i,end:X.end,t0:X.t0,secs:X.secs})); }catch(e){} }
function runClear(){ try{ localStorage.removeItem(RUN); }catch(e){} }
/* a two-tone bell, made in the browser, so there's no sound file to load */
function bell(){ try{ if(!actx) return; var t0=actx.currentTime;
  [[880,0],[660,.22]].forEach(function(n){ var o=actx.createOscillator(), g=actx.createGain(); o.type="sine"; o.frequency.value=n[0];
    g.gain.setValueAtTime(.0001,t0+n[1]); g.gain.exponentialRampToValueAtTime(.3,t0+n[1]+.015); g.gain.exponentialRampToValueAtTime(.0001,t0+n[1]+1.4);
    o.connect(g); g.connect(actx.destination); o.start(t0+n[1]); o.stop(t0+n[1]+1.5); }); }catch(e){} }
function sound(){ try{ actx=actx||new (window.AudioContext||window.webkitAudioContext)(); if(actx.state==="suspended") actx.resume(); }catch(e){} }
function body(h){ var b=$("#xm-body"); b.innerHTML=h; b.scrollTop=0; }
function foot(h){ $("#xm-foot").innerHTML=h; }
function hide(el,on){ if(on) el.setAttribute("hidden",""); else el.removeAttribute("hidden"); }
function open(name){ var s=$("#xm"); $("#xm-name").textContent=name; hide(s,false); hide($("#xm-clock"),true); hide($("#xm-bar"),true); hide($("#xm-nav"),true);
  hide($("#xm-close"),false); hide($("#xm-sheet"),true); document.documentElement.style.overflow="hidden"; }
function close(){ clearInterval(tick); tick=null; X=null; hide($("#xm"),true); hide($("#xm-sheet"),true); document.documentElement.style.overflow=""; records(); }
/* total: the paper's full time, for the bar, when a paper carries on with less than that left */
function timer(secs,warn,done,total){ clearInterval(tick); var end=Date.now()+secs*1000, c=$("#xm-clock"), bar=$("#xm-bar"), fill=$("#xm-barfill");
  hide(c,false); X.end=end; total=total||secs;
  function step(){ var left=(end-Date.now())/1000; $("#xm-time").textContent=clock(left);
    var low=left<=warn, out=left<=Math.min(10,warn/3); c.classList.toggle("xlow",low&&!out); c.classList.toggle("xout",out);
    bar.classList.toggle("xlow",low&&!out); bar.classList.toggle("xout",out); fill.style.transform="scaleX("+Math.max(0,left/total)+")";
    if(left<=0){ clearInterval(tick); tick=null; done(); } }
  step(); tick=setInterval(step,250); }
function rules(kind,name,list,go){ open(name);
  body('<div class="xm-rules"><h2>'+esc(name)+'</h2><h3>'+esc(U.rules_heading)+'</h3><ol>'
    +list.map(function(r){ return '<li>'+esc(r)+'</li>'; }).join("")+'</ol>'+(kind==="osce"?'<p class="xm-note">'+esc(U.sound_note)+'</p>':"")+'</div>');
  foot('<span class="xm-sp"></span><button class="vvx-go" data-x="begin">'+esc(U.begin)+'</button>'); X={kind:kind,stage:"rules",go:go}; }

/* ---- paper 1: multiple choice ------------------------------------------------------ */
/* the module's paper by default; a student's own slides pass their own questions, name, record
   key and pass mark, and a done() that hears which questions they got right */
function mcqStart(src){ PAPER=src&&src.qs?src:{qs:D.mcq,name:U.papers.mcq.title,key:"mcq",pass:U.pass}; PASS=PAPER.pass;
  var n=PAPER.qs.length, m=n*U.mcq_minutes_per_q;
  /* practising the missed ones: no rules, no clock, each answer marked as soon as it's chosen */
  if(PAPER.practice){ open(PAPER.name); X={kind:"mcq",stage:"paper",practice:true,qs:PAPER.qs.slice(),ans:{},flag:{},i:0,t0:Date.now(),secs:0};
    hide($("#xm-nav"),false); return mcqShow(0); }
  rules("mcq",PAPER.name,U.mcq_rules.map(function(r){ return f(r,{n:n,m:m,pass:PASS}); }),function(){
    runClear(); X={kind:"mcq",stage:"paper",qs:shuffle(PAPER.qs.slice()),ans:{},flag:{},i:0,t0:Date.now(),secs:m*60};
    hide($("#xm-nav"),false); timer(X.secs,300,function(){ mcqSubmit(true); }); mcqShow(0); runSave(); }); }
/* carry on with the paper left mid-way: same questions, same answers, the clock where it was */
function mcqResume(){ var r=runGet(); if(!r) return mcqStart();
  var by={}; D.mcq.forEach(function(q){ by[q.id]=q; }); var qs=r.ids.map(function(id){ return by[id]; }).filter(Boolean);
  if(!qs.length){ runClear(); return mcqStart(); }
  PAPER={qs:D.mcq,name:U.papers.mcq.title,key:"mcq",pass:U.pass}; PASS=PAPER.pass; open(PAPER.name);
  X={kind:"mcq",stage:"paper",qs:qs,ans:r.ans||{},flag:r.flag||{},i:Math.min(r.i||0,qs.length-1),t0:r.t0||Date.now(),secs:r.secs||qs.length*60};
  hide($("#xm-nav"),false); var left=(r.end-Date.now())/1000;
  if(left<=0){ X.end=r.end; return mcqSubmit(true); }
  timer(left,300,function(){ mcqSubmit(true); },X.secs); mcqShow(X.i); }
function mcqNav(){ $("#xm-nav").innerHTML=X.qs.map(function(q,i){ return '<button data-x="go" data-i="'+i+'" class="'+(X.ans[q.id]?"ans ":"")+(X.flag[q.id]?"flg ":"")
    +(i===X.i?"cur":"")+'" aria-label="'+esc(f(U.q_of,{n:i+1,t:X.qs.length}))+'">'+(i+1)+'</button>'; }).join("");
  var c=$("#xm-nav .cur"); if(c&&c.scrollIntoView) c.scrollIntoView({block:"nearest",inline:"center"}); }
function mcqShow(i){ X.i=i; X.stage="paper"; var q=X.qs[i], t=X.qs.length, last=i===t-1, a=X.ans[q.id], mark=X.practice&&a;
  body('<p class="xm-qn">'+esc(f(U.q_of,{n:i+1,t:t}))+'</p><p class="xm-stem">'+esc(q.stem)+'</p><p class="xm-lead">'+esc(q.lead)+'</p>'
    +'<div class="xm-opts" role="radiogroup">'+q.opts.map(function(o){ var c=mark?(o[0]===q.key?" ok":o[0]===a?" no":""):"";
      return '<button class="xm-opt'+c+'" role="radio" data-x="pick" data-l="'+o[0]+'" aria-checked="'
      +(a===o[0])+'"'+(mark?" disabled":"")+'><b>'+o[0]+'</b><span>'+esc(o[1])+'</span></button>'; }).join("")+'</div>'
    /* practice: the verdict, why the chosen option is wrong, then why the key is right */
    +(mark?'<div class="xm-fb" aria-live="polite"><p class="v '+(a===q.key?"ok":"no")+'">'+esc(a===q.key?U.fb_right:U.fb_wrong)+'</p>'
      +(a!==q.key&&q.dis&&q.dis[a]?'<p>'+esc(q.dis[a])+'</p>':"")+'<p>'+esc(q.why)+'</p></div>':""));
  foot((X.practice?"":'<button class="xm-sec xm-flag" data-x="flag" aria-pressed="'+!!X.flag[q.id]+'">'+esc(X.flag[q.id]?U.flagged:U.flag)+'</button>')+'<span class="xm-sp"></span>'
    +(i?'<button class="xm-sec" data-x="prev">'+esc(U.prev)+'</button>':"")
    +'<button class="vvx-go" data-x="'+(last?"finish":"next")+'">'+esc(last?U.finish:U.next)+'</button>');
  mcqNav(); runSave(); }
function mcqConfirm(){ X.stage="confirm"; var t=X.qs.length, a=Object.keys(X.ans).length,
    fl=X.qs.filter(function(q){ return X.flag[q.id]; }).length;
  body('<div class="xm-confirm"><h2>'+esc(U.submit_h)+'</h2><p>'+esc(f(U.submit_line,{a:a,t:t}))+'</p>'
    +(fl?'<p class="xm-warn">'+esc(f(U.submit_flag,{f:fl}))+'</p>':"")+(a<t?'<p>'+esc(U.submit_blank)+'</p>':"")+'</div>');
  foot('<button class="xm-sec" data-x="back">'+esc(U.back)+'</button><span class="xm-sp"></span><button class="vvx-go" data-x="submit">'+esc(U.submit)+'</button>'); }
function mcqSubmit(timeUp){ clearInterval(tick); tick=null; var t=X.qs.length, got=0, by={}, missed=[];
  X.qs.forEach(function(q){ var ok=X.ans[q.id]===q.key; if(ok) got++; else missed.push(q); var b=by[q.lens]=by[q.lens]||{g:0,t:0}; b.t++; if(ok) b.g++; });
  var p=Math.round(100*got/t), used=Math.min(X.secs,Math.round((Date.now()-X.t0)/1000));
  if(!X.practice) save(PAPER.key,p); runClear(); X.stage="result"; X.missed=missed; hide($("#xm-nav"),true); hide($("#xm-clock"),true);
  if(PAPER.done) PAPER.done(X.qs.map(function(q){ return {id:q.id,ok:X.ans[q.id]===q.key}; }),p);
  /* the module's own questions: a miss goes to Today's mix, and a later right answer takes it out */
  var own={}; D.mcq.forEach(function(q){ own[q.id]=1; });
  X.qs.forEach(function(q){ if(own[q.id]) miss("xm:"+q.id,X.ans[q.id]===q.key,{x:"mcq",id:q.id,s:q.sec||"",l:q.slens||q.lens}); }); A.save();
  var bars=Object.keys(D.lenses).filter(function(k){ return by[k]; }).map(function(k){ var b=by[k];
    return '<div class="xm-bar-r" style="--lens:var(--lens-'+k+')"><span>'+esc(D.lenses[k])+'</span><i><b style="width:'+Math.round(100*b.g/b.t)+'%"></b></i><em>'+b.g+'/'+b.t+'</em></div>'; }).join("");
  var rv=X.qs.map(function(q,i){ var a=X.ans[q.id], cls=!a?"blank":a===q.key?"ok":"no", txt=function(l){ var o=q.opts.filter(function(o){ return o[0]===l; })[0]; return o?l+". "+o[1]:""; };
    /* the row names the question asked and the student's letter; open, it holds the case, why their choice
       is wrong, the right answer and why */
    return '<details class="xm-rv '+cls+'"><summary><i class="xm-mark" aria-label="'+esc(cls==="ok"?U.mark_right:cls==="no"?U.mark_wrong:U.no_answer)+'">'+(cls==="ok"?"✓":cls==="no"?"✕":"–")+'</i>'
      +'<span><b>'+(i+1)+'.</b>'+esc(q.lead)+(cls==="no"?'<i> · '+esc(U.your_answer)+': '+esc(a)+'</i>':"")+'</span></summary><div class="xm-rv-in">'
      +'<p>'+esc(q.stem)+'</p>'
      +'<p class="'+(cls==="ok"?"ra":"yo")+'">'+esc(U.your_answer)+': '+esc(a?txt(a):U.no_answer)+'</p>'
      +(cls==="no"&&q.dis&&q.dis[a]?'<p class="xm-why">'+esc(q.dis[a])+'</p>':"")
      +(cls==="ok"?"":'<p class="ra">'+esc(U.right_answer)+': '+esc(txt(q.key))+'</p>')
      +'<p>'+esc(q.why)+'</p>'+(q.sec&&cls!=="ok"?'<a href="#'+esc(q.sec)+'" data-lens="'+esc(q.slens)+'">'+esc(U.reread)+': '+esc(q.secTitle)+' →</a>':"")
      +'</div></details>'; }).join("");
  var nm=missed.length, split=nm&&nm<t;
  var filt=split?'<div class="xm-rvf" role="group"><button class="fc-chip" data-x="rvf" data-v="no" aria-pressed="true">'+esc(f(U.show_missed,{n:nm}))+'</button>'
    +'<button class="fc-chip" data-x="rvf" data-v="all" aria-pressed="false">'+esc(f(U.show_all,{n:t}))+'</button></div>':"";
  result(p,(timeUp?'<p class="xm-toast">'+esc(U.times_up)+'</p>':""),
    '<p>'+esc(f(U.score_line,{g:got,t:t}))+'</p>'+(X.practice?"":'<p class="xm-small">'+esc(f(U.pass_line,{pass:PASS}))+' · '+esc(f(U.time_used,{m:clock(used)}))+'</p>'),
    '<h3 class="xm-h">'+esc(U.review)+'</h3>'+filt+'<div class="xm-rvs'+(split?" only-no":"")+'">'+rv+'</div>'
    +(X.practice?"":'<h3 class="xm-h">'+esc(U.by_lens)+'</h3><div class="xm-bars">'+bars+'</div>'),"mcq",nm); }

/* ---- paper 2: the station circuit --------------------------------------------------- */
function osceStart(){ var n=Math.min(U.osce_stations,D.osce.length), m=0;
  PASS=U.pass;
  rules("osce",U.papers.osce.title,U.osce_rules.map(function(r){ return f(r,{n:n,m:m,pass:PASS}); }),function(){
    /* half pots, half slides, in a shuffled order */
    var pots=shuffle(D.osce.filter(function(s){ return s.type==="pot"; })), slides=shuffle(D.osce.filter(function(s){ return s.type==="slide"; })),
        pick=shuffle(pots.slice(0,Math.ceil(n/2)).concat(slides.slice(0,Math.floor(n/2))));
    X={kind:"osce",stage:"station",st:pick,i:0,wrote:{},mark:{}}; hide($("#xm-bar"),false); osceShow(0); }); }
function osceShow(i){ X.i=i; X.stage="station"; var s=X.st[i], t=X.st.length, last=i===t-1;
  body('<div class="xm-station"><p class="xm-qn">'+esc(f(U.station_of,{n:i+1,t:t}))+' · '+esc(U.badge[s.type])+'</p>'+s.fig
    +s.qs.map(function(q,k){ var id="xw-"+i+"-"+k; return '<div class="xm-sq"><label for="'+id+'"><span>'+(k+1)+'.</span>'+esc(q[0])+'</label>'
      +'<textarea id="'+id+'" data-k="'+k+'" placeholder="'+esc(U.write_here)+'"></textarea></div>'; }).join("")+'</div>');
  foot('<span class="xm-sp"></span><button class="vvx-go" data-x="move">'+esc(last?U.finish:U.move_on)+'</button>');
  timer(U.osce_seconds[s.type]||180,30,function(){ bell(); osceKeep(); var b=document.createElement("div"); b.className="xm-bell"; b.setAttribute("role","alert");
    b.textContent=last?U.times_up:U.bell; document.body.appendChild(b);
    setTimeout(function(){ b.remove(); if(X&&X.kind==="osce") osceNext(); },1700); }); }
function osceKeep(){ var i=X.i; $$("#xm-body textarea").forEach(function(t){ X.wrote[i+"-"+t.getAttribute("data-k")]=t.value.trim(); }); }
function osceNext(){ osceKeep(); if(X.i<X.st.length-1) osceShow(X.i+1); else osceMark(); }
function osceMark(){ clearInterval(tick); tick=null; X.stage="mark"; hide($("#xm-clock"),true); hide($("#xm-bar"),true);
  body('<h2 style="margin:0 0 4px;border:0;padding:0">'+esc(U.mark_h)+'</h2><p class="xm-note" style="margin:0 0 var(--s-md)">'+esc(U.mark_note)+'</p>'
    +X.st.map(function(s,i){ return '<section class="xm-mk"><div class="xm-mk-h">'+s.fig+'<h3>'+esc(f(U.station_of,{n:i+1,t:X.st.length}))+' · '+esc(U.badge[s.type])+'</h3></div>'
      +s.qs.map(function(q,k){ var w=X.wrote[i+"-"+k], key=i+"-"+k;
        /* nothing written is already marked Missed, so the student marks only what they wrote */
        if(!w&&!(key in X.mark)) X.mark[key]="0";
        return '<div class="xm-mq"><p class="q">'+(k+1)+'. '+esc(q[0])+'</p>'
          +'<span class="xm-lab">'+esc(U.you_wrote)+'</span><p class="xm-yours'+(w?"":" none")+'">'+esc(w||U.nothing)+'</p>'
          +'<span class="xm-lab">'+esc(U.model)+'</span><p class="xm-model">'+esc(q[1])+'</p>'
          +'<div class="xm-marks" role="group">'+[["1",U.got],[".5",U.part],["0",U.miss]].map(function(m){
            return '<button data-x="mark" data-key="'+key+'" data-m="'+m[0]+'" aria-pressed="'+(X.mark[key]===m[0])+'">'+esc(m[1])+'</button>'; }).join("")+'</div></div>'; }).join("")
      +'</section>'; }).join(""));
  osceMarkFoot(); }
function osceMarkFoot(){ var all=X.st.reduce(function(n,s){ return n+s.qs.length; },0), left=all-Object.keys(X.mark).length;
  foot('<span class="xm-left">'+(left?esc(f(U.left_to_mark,{n:left})):"")+'</span><span class="xm-sp"></span><button class="vvx-go" data-x="osceresult"'+(left?" disabled":"")+'>'+esc(U.see_result)+'</button>'); }
function osceResult(){ var got=0, of=0, rows=[], seen={}, links=[];
  X.st.forEach(function(s,i){ var g=0; s.qs.forEach(function(q,k){ var mk=+X.mark[i+"-"+k]||0; g+=mk;
      /* a question not fully made goes to Today's mix */
      miss("st:"+s.id+":"+k,mk===1,{x:"st",id:s.id,k:k,s:s.sec||"",l:s.slens||s.lens}); }); got+=g; of+=s.qs.length;
    /* named by what it showed, now that naming it gives nothing away */
    rows.push('<div class="xm-bar-r" style="--lens:var(--lens-'+(s.lens||"morbid-anatomy")+')"><span>'+esc(s.name||f(U.station_of,{n:i+1,t:X.st.length}))+' · '+esc(U.badge[s.type])
      +'</span><i><b style="width:'+Math.round(100*g/s.qs.length)+'%"></b></i><em>'+g+'/'+s.qs.length+'</em></div>');
    if(g<s.qs.length&&s.sec&&!seen[s.secTitle]){ seen[s.secTitle]=1; links.push('<a class="rr-link" href="#'+esc(s.sec)+'" data-lens="'+esc(s.slens)+'">'
      +esc(s.secTitle)+'<span aria-hidden="true"> →</span></a>'); } });
  var p=Math.round(100*got/of); save("osce",p); X.stage="result";
  result(p,"",'<p>'+esc(f(U.points,{g:got,t:of}))+'</p><p class="xm-small">'+esc(f(U.pass_line,{pass:PASS}))+'</p>',
    '<h3 class="xm-h">'+esc(U.by_station)+'</h3><div class="xm-bars">'+rows.join("")+'</div>'
    +(links.length?'<h3 class="xm-h">'+esc(U.reread)+'</h3>'+links.join(""):""),"osce"); }

/* ---- shared ------------------------------------------------------------------------- */
function save(k,p){ var h=hist(k); h.push({at:Date.now(),p:p}); if(h.length>20) h.splice(0,h.length-20); A.save(); }
/* the record the flashcards' Today's mix reads (state.chk, as the quick checks keep it): a miss is kept, and
   newer misses replace older ones; a later right answer marks it put right (fx), as a right card does */
function miss(key,ok,rec){ var c=A.state.chk=A.state.chk||{}, r=c[key];
  if(!ok){ rec.ok=0; rec.at=Date.now(); c[key]=rec; } else if(r&&!r.ok&&!r.fx){ r.fx=1; r.at=Date.now(); } }
/* missed: how many to practise again (the multiple choice paper only) */
function result(p,top,lines,rest,kind,missed){ var pass=p>=PASS, drill=kind==="mcq"&&missed>0&&!X.practice;
  body(top+'<div class="xm-res"><div class="xm-ring" id="xm-ring" style="--c:var(--'+(pass?"correct":"wrong")+')"><b id="xm-pct">0%</b></div>'
    +(X.practice?"":'<span class="xm-verdict '+(pass?"pass":"fail")+'">'+esc(pass?U.passed:U.failed)+'</span>')+lines
    +(drill?'<button class="xc-pr" data-x="again" data-k="mcq">'+esc(U.again)+'</button>':"")+'</div>'+rest);
  /* the result's own footer is the way out; the top bar's Leave would be a second one */
  hide($("#xm-close"),true);
  foot('<button class="xm-sec" data-x="close">'+esc(U.close)+'</button><span class="xm-sp"></span>'
    +(drill?'<button class="vvx-go" data-x="drill">'+esc(missed===1?U.drill_1:f(U.drill,{n:missed}))+'</button>'
      :'<button class="vvx-go" data-x="again" data-k="'+kind+'">'+esc(U.again)+'</button>'));
  var ring=$("#xm-ring"), num=$("#xm-pct"), t0=null, calm=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches, dur=calm?0:900;
  (function step(t){ if(t===undefined) return requestAnimationFrame(step); if(t0===null) t0=t; var k=dur?Math.min(1,(t-t0)/dur):1, e=1-Math.pow(1-k,3);
    ring.style.setProperty("--p",p/100*e); num.textContent=Math.round(p*e)+"%"; if(k<1) requestAnimationFrame(step); })(); }
window.pfExam={mcq:mcqStart,hist:hist,records:records};
/* a practice run has nothing to lose, so leaving it doesn't ask */
function inProgress(){ return X&&!X.practice&&X.stage!=="result"&&X.stage!=="rules"; }

document.addEventListener("click",function(ev){
  var s=ev.target.closest("[data-xstart]");
  if(s){ var k=s.getAttribute("data-xstart"); if(k!=="viva"&&A.gate&&A.gate()) return; if(k==="mcq") return runGet()?mcqResume():mcqStart(); if(k==="osce") return osceStart();
    if(A.vivaStart) A.vivaStart(); return; }
  var o=ev.target.closest("[data-xopen]");
  if(o){ var d=document.getElementById(o.getAttribute("data-xopen")); if(d){ d.open=true; d.scrollIntoView({behavior:"smooth",block:"start"}); } return; }
  if(!X) return;
  /* leaving mid-paper asks first, in a sheet of the exam's own */
  if(ev.target.closest("#xm-close")){ if(!inProgress()) return close();
    var sh=$("#xm-sheet"); $("#xm-sheet-t").textContent=X.kind==="mcq"&&!X.practice&&PAPER&&PAPER.key==="mcq"?U.leave_mcq:U.leave_osce;
    hide(sh,false); var st=$('#xm-sheet [data-x="stay"]'); if(st) st.focus(); return; }
  if(ev.target.closest("#xm a[data-lens]")) return close();   /* the page's own handler opens the lens */
  var b=ev.target.closest("#xm [data-x]"); if(!b) return; var a=b.getAttribute("data-x");
  if(a==="stay") return hide($("#xm-sheet"),true);
  if(a==="leave"){ if(X.kind==="osce") clearInterval(tick); return close(); }
  if(a==="begin"){ sound(); return X.go(); }
  if(a==="close") return close();
  if(a==="again") return close(), (b.getAttribute("data-k")==="mcq"?mcqStart(PAPER&&PAPER.practice?null:PAPER):osceStart());
  if(a==="drill"){ var ms=X.missed||[]; close(); return mcqStart({qs:ms,name:U.drill_name,key:"mcq-missed",pass:U.pass,practice:true}); }
  if(a==="rvf"){ var all=b.getAttribute("data-v")==="all"; $(".xm-rvs").classList.toggle("only-no",!all);
    $$('[data-x="rvf"]').forEach(function(x){ x.setAttribute("aria-pressed",x===b); }); return; }
  if(X.kind==="mcq"){ var q=X.qs[X.i];
    if(a==="pick"){ if(X.practice){ if(X.ans[q.id]) return; X.ans[q.id]=b.getAttribute("data-l"); var y=$("#xm-body").scrollTop; mcqShow(X.i);
        /* the reason comes into view under the options */
        $("#xm-body").scrollTop=y; var fb=$(".xm-fb"); if(fb&&fb.scrollIntoView) fb.scrollIntoView({block:"nearest",behavior:"smooth"}); return; }
      X.ans[q.id]=b.getAttribute("data-l"); $$(".xm-opt").forEach(function(x){ x.setAttribute("aria-checked",x===b); }); runSave(); return mcqNav(); }
    if(a==="flag"){ X.flag[q.id]=!X.flag[q.id]; return mcqShow(X.i); }
    if(a==="go") return mcqShow(+b.getAttribute("data-i"));
    if(a==="prev") return mcqShow(X.i-1);
    if(a==="next") return mcqShow(X.i+1);
    if(a==="finish") return X.practice?mcqSubmit(false):mcqConfirm();
    if(a==="back") return mcqShow(X.i);
    if(a==="submit") return mcqSubmit(false); }
  if(X.kind==="osce"){
    if(a==="move") return osceNext();
    if(a==="mark"){ var key=b.getAttribute("data-key"); X.mark[key]=b.getAttribute("data-m");
      $$('[data-key="'+key+'"]').forEach(function(x){ x.setAttribute("aria-pressed",x===b); }); return osceMarkFoot(); }
    if(a==="osceresult") return osceResult(); } });
/* letters choose an option, as on a paper */
document.addEventListener("keydown",function(ev){ if(!X||X.kind!=="mcq"||X.stage!=="paper"||ev.target.matches("textarea,input")) return;
  var l=ev.key.toUpperCase(), btn=/^[A-E]$/.test(l)&&$('.xm-opt[data-l="'+l+'"]'); if(btn){ ev.preventDefault(); btn.click(); } });
/* the viva keeps its own record; refresh the card when its screen closes */
var vv=document.getElementById("vvx"); if(vv&&window.MutationObserver) new MutationObserver(records).observe(vv,{attributes:true,attributeFilter:["hidden"]});
records();
})();
}catch(e){setTimeout(function(){throw e})}
try{
(function(){
"use strict";
var A=window.pfApp, box=document.getElementById("fb"); if(!A||!box) return;
var $=function(s){ return document.querySelector(s); }, rating=0, moment=null, LENSES=["morbid-anatomy","microbiology","chemical-pathology","pharmacology"];
function hide(el,on){ if(on) el.setAttribute("hidden",""); else el.removeAttribute("hidden"); }
var T0=Date.now();
function rec(){ return A.state.fb=A.state.fb||{}; }
function progress(){ var p=A.state.pct||{}, s=0; LENSES.forEach(function(l){ s+=+p[l]||0; }); return Math.round(s/LENSES.length); }
function finished(){ var x=A.state.exams||{}; return (x.mcq||[]).length||(x.osce||[]).length||(A.state.vivas||[]).length||progress()>=90; }
/* something else is on screen: an exam, the viva, the account panel, the sign-up bubble, a picture */
function busy(){ return ["#xm","#vvx","#acct-wrap","#su","#lb","#hlnote"].some(function(s){ var el=$(s); return el&&!el.hidden; }); }
function open(m){ moment=m; rating=0; $("#fb-c").value=""; hide($("#fb-form"),false); hide($("#fb-done"),true); hide($("#fb-msg"),true);
  Array.prototype.forEach.call(box.querySelectorAll("[data-r]"),function(b){ b.setAttribute("aria-pressed","false"); });
  $("#fb-send").disabled=true; hide(box,false); box.classList.remove("in"); void box.offsetWidth; box.classList.add("in"); }
function close(){ hide(box,true); }
function later(){ if(moment&&moment!=="asked"){ var f=rec(); f.shown=(f.shown||[]).concat(moment); f.at=Date.now(); A.save(); } close(); }
function due(){ var f=rec(), shown=f.shown||[]; if(f.sent||shown.length>=2) return null;
  if((A.state.time||0)<300) return null;                             /* not before five minutes in the module */
  if(Date.now()-T0<180e3) return null;                               /* and never in a visit's first three minutes */
  if(f.at&&Date.now()-f.at<10*60e3) return null;                    /* not twice in one sitting */
  if(finished()&&shown.indexOf("finished")<0) return "finished";
  if(progress()>=50&&!shown.length) return "halfway";
  return null; }
function check(){ if(document.visibilityState!=="visible"||!box.hidden||busy()) return; var m=due(); if(m) open(m); }
function send(){ var btn=$("#fb-send"); btn.disabled=true; hide($("#fb-msg"),true);
  var row={rating:rating||null,comment:($("#fb-c").value||"").trim().slice(0,2000)||null,moment:moment,progress:progress(),module:"diabetes"};
  var go=window.pfFeedback?window.pfFeedback(row):Promise.reject(new Error("offline"));
  go.then(function(){ var f=rec(); f.sent=Date.now(); if(moment!=="asked") f.shown=(f.shown||[]).concat(moment); A.save();
      hide($("#fb-form"),true); hide($("#fb-done"),false); setTimeout(close,2600); },
    function(){ btn.disabled=false; hide($("#fb-msg"),false); }); }
box.addEventListener("click",function(ev){ var r=ev.target.closest("[data-r]");
  if(r){ rating=+r.getAttribute("data-r"); Array.prototype.forEach.call(box.querySelectorAll("[data-r]"),function(b){ b.setAttribute("aria-pressed",b===r); });
    $("#fb-send").disabled=false; return; }
  if(ev.target.closest("#fb-send")) return send();
  if(ev.target.closest("#fb-later,#fb-x")) return later(); });
$("#fb-c").addEventListener("input",function(){ $("#fb-send").disabled=!rating&&!this.value.trim(); });
document.addEventListener("click",function(ev){ if(ev.target.closest("#fb-open")) open("asked"); });
document.addEventListener("keydown",function(ev){ if(ev.key==="Escape"&&!box.hidden) later(); });
setTimeout(check,20000); setInterval(check,10000);
})();
}catch(e){setTimeout(function(){throw e})}
try{
(function(){
var cfgEl=document.getElementById("acct-cfg"); if(!cfgEl) return;
var CFG=JSON.parse(cfgEl.textContent), sb=null, user=null, pushT=null;
function $(s){ return document.querySelector(s); }
function show(el,on){ if(!el) return; if(on) el.removeAttribute("hidden"); else el.setAttribute("hidden",""); }
function load(k){ try{ return JSON.parse(localStorage.getItem(k)||"{}")||{}; }catch(e){ return {}; } }
function store(k,st){ try{ localStorage.setItem(k,JSON.stringify(st)); }catch(e){} }
function union(a,b){ var o={}; [a||{},b||{}].forEach(function(x){ Object.keys(x).forEach(function(k){ o[k]=x[k]; }); }); return o; }

/* two records of the same student's progress become one: nothing either device did is lost */
function merge(L,R){
  var out=union(R,L), seen={};
  [R.seen||{},L.seen||{}].forEach(function(s){ Object.keys(s).forEach(function(l){ seen[l]=union(seen[l],s[l]); }); });
  out.seen=seen; out.cued=union(R.cued,L.cued); out.read=union(R.read,L.read); out.chk=union(R.chk,L.chk); out.praised=union(R.praised,L.praised);
  var mcq=union(R.mcq,{}); Object.keys(L.mcq||{}).forEach(function(q){ var a=L.mcq[q], b=mcq[q];
    if(!b||(a.at&&b.at&&a.at<b.at)) mcq[q]=a; }); out.mcq=mcq;   /* the first answer ever given counts */
  var at={}, v=[]; (R.vivas||[]).concat(L.vivas||[]).forEach(function(x){ if(x&&!at[x.at]){ at[x.at]=1; v.push(x); } });
  v.sort(function(a,b){ return a.at-b.at; }); out.vivas=v.slice(-30);
  var pct={}; [R.pct||{},L.pct||{}].forEach(function(p){ Object.keys(p).forEach(function(k){ pct[k]=Math.max(pct[k]||0,p[k]); }); });
  out.pct=pct; out.time=Math.max(L.time||0,R.time||0);
  /* where the student was reading: the copy saved most recently wins, whichever device it came from */
  var W=(R.atT||0)>(L.atT||0)?R:L; out.lens=W.lens||null; out.at=W.at||null; out.atT=W.atT||0;
  var notes={}; [R.notes||{},L.notes||{}].forEach(function(n){ Object.keys(n).forEach(function(k){
    var t=(n[k]||"").trim(), cur=(notes[k]||"").trim(); if(!t) return;
    notes[k]=!cur||cur===t||t.indexOf(cur)>=0?t:(cur.indexOf(t)>=0?cur:cur+"\n\n"+t); }); });
  out.notes=notes; out.signup=union(R.signup,L.signup);
  out.gameBest=Math.max(L.gameBest||0,R.gameBest||0);
  out.wallYears=Math.max(L.wallYears||0,R.wallYears||0);
  out.lesionBest=Math.max(L.lesionBest||0,R.lesionBest||0);
  var mine={}; [R.mine||{},L.mine||{}].forEach(function(M){ Object.keys(M).forEach(function(k){   /* the later change wins, removals too */
    if(!mine[k]||(M[k].at||0)>(mine[k].at||0)) mine[k]=M[k]; }); }); out.mine=mine;
  var ex={}; [R.exams||{},L.exams||{}].forEach(function(E){ Object.keys(E).forEach(function(k){   /* each sitting once, by when */
    var seen={}; ex[k]=(ex[k]||[]).concat(E[k]||[]).filter(function(x){ if(!x||seen[x.at]) return false; seen[x.at]=1; return true; })
      .sort(function(a,b){ return a.at-b.at; }).slice(-20); }); }); out.exams=ex;
  var hl={}; [R.hl||{},L.hl||{}].forEach(function(h){ Object.keys(h).forEach(function(k){   /* the later change wins, removals too */
    var a=h[k], b=hl[k]; if(a&&(!b||(a.at||0)>(b.at||0))) hl[k]=a; }); }); out.hl=hl;
  return out; }

function push(){ if(!sb||!user) return;
  CFG.mods.forEach(function(m){
    sb.from("progress").upsert({user_id:user.id,module:m.module,state:load(m.store),updated_at:new Date().toISOString()})
      .then(function(r){ if(r.error&&window.console) console.warn("patandfam sync:",r.error.message); }); }); }
/* the module calls this after every save; a few quiet seconds later the record goes up */
window.pfSync=function(){ if(!user) return; clearTimeout(pushT); pushT=setTimeout(push,3000); };
function pull(){
  return Promise.all(CFG.mods.map(function(m){
    return sb.from("progress").select("state").eq("user_id",user.id).eq("module",m.module).maybeSingle()
      .then(function(r){ var L=load(m.store), M=merge(L,(r.data&&r.data.state)||{});
        store(m.store,M); return JSON.stringify(M)!==JSON.stringify(L); }); }))
    .then(function(changed){ push();
      /* the page read its records before the merge, so read them again, once */
      if(changed.indexOf(true)>=0&&!sessionStorage.getItem("pf.merged")){ sessionStorage.setItem("pf.merged","1"); location.reload(); } }); }

/* ---- the panel */
function view(v){ document.querySelectorAll(".acct-v").forEach(function(el){ show(el,el.getAttribute("data-v")===v); }); }
/* opened by the assessment's free tries running out, the sign-in view says so; otherwise its own words */
var H0=null, T0=null;
function why(w){ var h=$("#acct-h"), t=$('.acct-v[data-v="signin"] .acct-t'); if(!h||!t) return;
  if(H0===null){ H0=h.textContent; T0=t.textContent; }
  h.textContent=w&&w.title||H0; t.textContent=w&&w.text||T0; }
/* while a dialog is open the page behind it is inert: Tab stays inside the dialog and a screen
   reader reads only the dialog. Counted, so a dialog opened over another lets go only once both close. */
var modalN=0;
window.pfModal=function(on,el){ modalN=Math.max(0,modalN+(on?1:-1));
  [].forEach.call(document.body.children,function(c){
    if(c.tagName==="SCRIPT"||c.getAttribute("role")==="status") return;
    if(modalN){ var dlg=c===el||!c.hidden&&(c.matches("[aria-modal=true]")||!!c.querySelector("[aria-modal=true]:not([hidden])"));
      if(!dlg&&!c.hasAttribute("inert")){ c.setAttribute("inert",""); c.setAttribute("data-pfinert",""); }
      else if(dlg&&c.hasAttribute("data-pfinert")){ c.removeAttribute("inert"); c.removeAttribute("data-pfinert"); } }
    else if(c.hasAttribute("data-pfinert")){ c.removeAttribute("inert"); c.removeAttribute("data-pfinert"); } }); };
var opener=null;
function open(v){ if(typeof v!=="string"){ why(v); v=null; } else why(null); if(!$("#acct-wrap").hidden) return view(v||(user?"account":"signin"));
  opener=document.activeElement; show($("#acct-wrap"),true); pfModal(true,$("#acct-wrap")); requestAnimationFrame(function(){ $("#acct-wrap").classList.add("in"); }); view(v||(user?"account":"signin")); var f=$("#acct-wrap input,#acct-wrap button.acct-google"); if(f) f.focus(); }
function close(){ var w=$("#acct-wrap"); if(w.hidden) return; w.classList.remove("in"); setTimeout(function(){ show(w,false); },200);
  if(window.pfModal) pfModal(false); if(opener&&opener.focus&&document.contains(opener)) opener.focus(); opener=null; }
window.pfOpenAccount=function(w){ open(w||null); };
window.pfUser=function(){ return user; };
/* a feedback reply (build/feedback.py): through the signed-in client when there is one, so the
   reply carries the account; otherwise straight to the database with the public key */
window.pfFeedback=function(row){
  if(sb) return sb.from("feedback").insert(row).then(function(r){ if(r.error) throw r.error; });
  return fetch(CFG.url+"/rest/v1/feedback",{method:"POST",headers:{"apikey":CFG.key,"Authorization":"Bearer "+CFG.key,
    "Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify(row)})
    .then(function(r){ if(!r.ok) throw new Error("feedback "+r.status); }); };
/* the viva's marking (supabase/functions/viva-judge): the question, its points and the words heard;
   back come which points were made and one line from the examiner. Gives up after eight seconds. */
window.pfJudge=function(x){
  if(!sb||!user) return Promise.reject(new Error("signin"));   // the AI marking is for signed-in students
  var ctl=window.AbortController?new AbortController():null, t=setTimeout(function(){ if(ctl) ctl.abort(); },8000);
  return sb.auth.getSession().then(function(r){ var tok=r.data.session&&r.data.session.access_token;
    if(!tok) throw new Error("signin");
    return fetch(CFG.url+"/functions/v1/viva-judge",{method:"POST",signal:ctl&&ctl.signal,
      headers:{"apikey":CFG.key,"Authorization":"Bearer "+tok,"Content-Type":"application/json"},body:JSON.stringify(x)}); })
    .then(function(r){ clearTimeout(t); if(!r.ok) throw new Error("judge "+r.status); return r.json(); },
          function(e){ clearTimeout(t); throw e; }); };
function label(){ if(window.pfOnUser) window.pfOnUser(user); document.documentElement.classList.toggle("pf-in",!!user); var b=$("#acct-b"); if(!b) return; show(b,true);
  if(user){ var n=(user.user_metadata&&(user.user_metadata.full_name||user.user_metadata.name))||user.email||"?";
    b.textContent=n.trim().charAt(0).toUpperCase(); b.classList.add("in"); b.setAttribute("aria-label",n); }
  else { var full=b.getAttribute("data-save"), narrow=matchMedia("(max-width:560px)").matches, tiny=matchMedia("(max-width:400px)").matches;
    b.textContent=tiny?b.getAttribute("data-tiny"):narrow?b.getAttribute("data-short"):full; b.classList.remove("in");
    if(narrow) b.setAttribute("aria-label",full); else b.removeAttribute("aria-label"); } }
function back(){ return location.origin+location.pathname; }

function afterSignIn(fresh){ label(); var em=$("#acct-email-v"); if(em) em.textContent=user.email||"";
  var nm=(user.user_metadata&&(user.user_metadata.full_name||user.user_metadata.name))||"";
  if(nm&&$("#acct-name")) $("#acct-name").textContent=nm;
  if($("#acct-av")) $("#acct-av").textContent=(nm||user.email||"?").trim().charAt(0).toUpperCase();
  if(nm&&$("#acct-n")&&!$("#acct-n").value) $("#acct-n").value=nm;
  pull();
  if(fresh) sb.from("profiles").select("id").eq("id",user.id).maybeSingle().then(function(r){
    if(!r.data&&!localStorage.getItem("pf.profileAsked")){ localStorage.setItem("pf.profileAsked","1"); open("profile"); } }); }

/* the edge function (netlify/edge-functions/pass.js) reads the sign-in token from this cookie to decide
   whether to serve a locked module; on a pass page, a fresh token gets one reload to try */
function passCookie(s){ var tok=s&&s.access_token;
  document.cookie="pf_at="+(tok||"")+";path=/;SameSite=Lax;Secure;max-age="+(tok?3600:0);
  if(!tok||!document.getElementById("ps-locked")) return;
  var k="pf.passTried", t=tok.slice(-16); try{ if(sessionStorage.getItem(k)===t) return; sessionStorage.setItem(k,t); }catch(e){ return; }
  location.reload(); }
function init(){ if(!window.supabase) return;
  sb=window.supabase.createClient(CFG.url,CFG.key);
  sb.auth.getSession().then(function(r){ user=r.data.session&&r.data.session.user||null; label(); passCookie(r.data.session); if(user) afterSignIn(false); });
  sb.auth.onAuthStateChange(function(ev,session){ var was=user; user=session&&session.user||null; label(); passCookie(session);
    if(ev==="SIGNED_IN"&&!was&&user) afterSignIn(true); if(ev==="SIGNED_OUT") view("signin"); }); }

document.addEventListener("click",function(ev){ var t=ev.target.closest("#acct-b,#acct-x,#acct-google,#acct-skip,#acct-edit,#acct-out,#acct-del,#acct-again");
  if(!t){ if(ev.target.id==="acct-wrap") close(); return; }
  if(t.id==="acct-b") return open(null);
  if(t.id==="acct-x"||t.id==="acct-skip") return close();
  if(t.id==="acct-again") return view("signin");
  if(!sb) return;
  if(t.id==="acct-google") return sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:back()}});
  if(t.id==="acct-edit") return view("profile");
  if(t.id==="acct-out") return sb.auth.signOut().then(close);
  if(t.id==="acct-del"&&confirm(t.getAttribute("data-confirm"))) return sb.rpc("delete_my_account").then(function(){ return sb.auth.signOut(); }).then(close);
});
document.addEventListener("submit",function(ev){
  if(ev.target.id==="acct-email"){ ev.preventDefault(); if(!sb) return; var m=$("#acct-msg"), email=ev.target.querySelector("input").value.trim();
    var btn=ev.target.querySelector("button"); btn.disabled=true;
    sb.auth.signInWithOtp({email:email,options:{emailRedirectTo:back()}}).then(function(r){ btn.disabled=false;
      if(r.error){ m.textContent=m.getAttribute("data-err"); show(m,true); return; }
      show(m,false); $("#acct-sent-to").textContent=email; view("sent"); }); }
  if(ev.target.id==="acct-prof"){ ev.preventDefault(); if(!sb||!user) return; var f=new FormData(ev.target), row={id:user.id,updated_at:new Date().toISOString()};
    ["role","full_name","year_of_study","medical_school"].forEach(function(k){ var v=(f.get(k)||"").trim(); if(v) row[k]=v; });
    if(row.role&&row.role!=="Medical student") delete row.year_of_study;
    sb.from("profiles").upsert(row).then(function(r){
      /* until the role column exists, save the rest */
      if(r.error&&row.role){ delete row.role; return sb.from("profiles").upsert(row); } })
      .then(function(){ view("account"); close(); }); }
});
document.addEventListener("keydown",function(ev){ if(ev.key==="Escape"&&$("#acct-wrap")&&!$("#acct-wrap").hidden) close(); });
document.addEventListener("change",function(ev){ if(ev.target.id!=="acct-r") return; var st=ev.target.value==="Medical student"||!ev.target.value;
  document.querySelectorAll(".acct-yr").forEach(function(el){ show(el,st); }); });

var s=document.createElement("script"); s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js"; s.integrity="sha384-BWcjm9OdFth9TbhCxZPdm+gAOUMAzQy9nmTs12ioXdCcbVnJaPMn+fMUoQCLt60R"; s.crossOrigin="anonymous"; s.async=true; s.onload=init; document.head.appendChild(s);
})();
}catch(e){setTimeout(function(){throw e})}
try{
(function(){
var dr=document.getElementById("drawer"), b=document.getElementById("menub"), sc=document.getElementById("dr-scrim");
if(!dr||!b) return;
var mq=window.matchMedia("(max-width:699px)"), sw=document.getElementById("themeb"),
    home=sw&&sw.parentNode, next=sw&&sw.nextSibling, slot=dr.querySelector(".dr-theme");
function isOpen(){ return dr.classList.contains("open"); }
function open(){ if(!mq.matches) return; dr.classList.add("open"); dr.removeAttribute("inert"); sc.hidden=false;
  requestAnimationFrame(function(){ sc.classList.add("in"); });
  b.setAttribute("aria-expanded","true"); document.documentElement.classList.add("dr-lock");
  var x=document.getElementById("dr-close"); if(x) x.focus({preventScroll:true}); }
function close(keep){ if(!isOpen()) return; dr.classList.remove("open"); sc.classList.remove("in");
  setTimeout(function(){ if(!isOpen()) sc.hidden=true; },250);
  b.setAttribute("aria-expanded","false"); document.documentElement.classList.remove("dr-lock");
  if(mq.matches) dr.setAttribute("inert",""); if(!keep) b.focus({preventScroll:true}); }
/* the light and dark switch lives in the drawer on phones, in the top bar on wider screens */
function place(){
  if(sw&&slot){ if(mq.matches){ if(sw.parentNode!==slot) slot.appendChild(sw); }
    else if(sw.parentNode!==home) home.insertBefore(sw,next); }
  if(mq.matches){ if(!isOpen()) dr.setAttribute("inert",""); }
  else { dr.removeAttribute("inert"); close(true); }
}
place(); if(mq.addEventListener) mq.addEventListener("change",place); else if(mq.addListener) mq.addListener(place);
b.addEventListener("click",function(){ isOpen()?close():open(); });
sc.addEventListener("click",function(){ close(); });
document.getElementById("dr-close").addEventListener("click",function(){ close(); });
dr.addEventListener("click",function(ev){
  var t=ev.target.closest("a, [data-click]"); if(!t||!mq.matches) return;
  close(true);
  var id=t.getAttribute("data-click"); if(id){ var x=document.getElementById(id); if(x) setTimeout(function(){ x.click(); },50); }
});
document.addEventListener("keydown",function(ev){ if(ev.key==="Escape") close(); });
/* install the app, where the phone offers it (Android Chrome); iPhones use Share, Add to Home Screen */
var ask=null, inst=document.getElementById("dr-install");
window.addEventListener("beforeinstallprompt",function(ev){ ev.preventDefault(); ask=ev; if(inst) inst.hidden=false; });
window.addEventListener("appinstalled",function(){ ask=null; if(inst) inst.hidden=true; });
if(inst) inst.addEventListener("click",function(){ if(!ask) return; ask.prompt(); ask.userChoice.then(function(){ ask=null; inst.hidden=true; }); });
/* swipe: from the left edge to open, back to the left to close */
var x0=null,y0=0,from=null;
document.addEventListener("touchstart",function(ev){ if(!mq.matches||ev.touches.length!==1) return;
  var t=ev.touches[0]; x0=t.clientX; y0=t.clientY;
  from=isOpen()?"open":(x0<24?"edge":null); if(!from) x0=null; },{passive:true});
document.addEventListener("touchend",function(ev){ if(x0===null) return;
  var t=ev.changedTouches[0], dx=t.clientX-x0, dy=Math.abs(t.clientY-y0); x0=null;
  if(dy>Math.abs(dx)) return;
  if(from==="edge"&&dx>50) open();
  if(from==="open"&&dx<-50) close(); },{passive:true});
})();
}catch(e){setTimeout(function(){throw e})}