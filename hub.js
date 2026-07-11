
(function () {
  "use strict";
  var LS="vimi.hub.v1", LS_URL="vimi.sync.url", LS_ME="vimi.hub.yo", LS_READ="vimi.hub.leidos";
  var $=function(s){return document.querySelector(s);};
  var $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s));};
  var uid=function(p){return (p||"x")+Date.now().toString(36)+Math.floor(Math.random()*1e5).toString(36);};
  var esc=function(s){return (s||"").replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});};
  var eur=function(n){return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n||0);};
  var AVCOLORS=["var(--s1)","var(--s2)","var(--s3)","var(--s4)","var(--s5)","var(--accent)","var(--brass)"];
  var EMOJIS=["👍","✅","🔥","🎉","👀"];

  // ---------- estado ----------
  function seed(){
    var now=Date.now(), d=function(k){return now-k*864e5;};
    var canales=[
      {id:"general",nombre:"general",cliente:"",desc:"Coordinación del día a día de la división"},
      {id:"finanzas",nombre:"finanzas",cliente:"",desc:"Presupuesto, ingresos y gastos — ligado al dashboard"},
      {id:"informes",nombre:"informes",cliente:"",desc:"Generador de informes de actividad por cliente"}
    ];
    var mensajes=[
      {id:uid("m"),canal:"general",autor:"Jesús",texto:"Bienvenida al ViMi Hub, @Bea 🎉 Aquí coordinamos la división: canales por cliente, tareas y los informes.",ts:d(1),reacciones:{"🎉":["Bea"]},v:1},
      {id:uid("m"),canal:"general",autor:"Bea",texto:"He migrado las tareas que teníamos en la hoja de cálculo — están en el panel de tareas (☑ arriba a la derecha).",ts:d(1)+36e5,reacciones:{"👍":["Jesús"]},v:1},
      {id:uid("m"),canal:"finanzas",autor:"Jesús",texto:"Objetivo del año: break-even. Y en 2027, el mejor ARR neto × ViMi del grupo. El progreso está abajo a la izquierda 👇",ts:d(1)+4e6,reacciones:{},v:1}
    ];
    var tareas=[
      {id:uid("t"),canal:"general",cliente:"",titulo:"Duplicada la descarga de movimientos de la tarjeta Visual 5201.5 (7223) en Tramontana",detalle:"",estado:"pendiente",persona:"Jesús",prioridad:"alta",fecha:"2026-07-07",vence:"",v:1},
      {id:uid("t"),canal:"general",cliente:"",titulo:"Stripe",detalle:"Está funcionando en el repo de WealthReader. Requiere conexión a Stripe.",estado:"pendiente",persona:"Jesús",prioridad:"media",fecha:"2026-07-09",vence:"",v:1},
      {id:uid("t"),canal:"general",cliente:"",titulo:"PayPal",detalle:"No está desarrollado. Requiere conexión a PayPal.",estado:"pendiente",persona:"Jesús",prioridad:"media",fecha:"2026-07-09",vence:"",v:1},
      {id:uid("t"),canal:"general",cliente:"",titulo:"Mejorar o eliminar el correo de conciliación y auditoría",detalle:"",estado:"pendiente",persona:"Jesús",prioridad:"baja",fecha:"2026-07-09",vence:"",v:1},
      {id:uid("t"),canal:"general",cliente:"",titulo:"Verificación de facturas recibidas",detalle:"Comprobar: mes cerrado → 1ª línea observaciones en PSP · Fecha fra. = PDF o mes siguiente si está cerrado · Proveedor · Serie (actividad/comercial) · Artículos → gasto periódico · Ajustar IVA · Comparar datos del PDF",estado:"pendiente",persona:"Jesús",prioridad:"media",fecha:"2026-07-09",vence:"",v:1},
      {id:uid("t"),canal:"general",cliente:"",titulo:"Generar facturas de compra desde gastos periódicos",detalle:"Cuando se registra la factura (se verifica) · Si todo ok, contabilizarla o ya está contabilizada · Si hay errores, informar",estado:"pendiente",persona:"Jesús",prioridad:"media",fecha:"2026-07-09",vence:"",v:1}
    ];
    return {canales:canales,mensajes:mensajes,tareas:tareas,fin:null};
  }
  var syncUrl=localStorage.getItem(LS_URL)||"";
  var yo=localStorage.getItem(LS_ME)||"";
  var leidos={}; try{ leidos=JSON.parse(localStorage.getItem(LS_READ))||{}; }catch(e){}
  var state=loadLocal(), canalActivo="general";
  function loadLocal(){ try{ var s=JSON.parse(localStorage.getItem(LS)); if(s&&s.canales)return s; }catch(e){} return seed(); }
  function saveLocal(){ try{ localStorage.setItem(LS,JSON.stringify(state)); }catch(e){} }
  function personas(){ var base=(state.fin&&state.fin.masters&&state.fin.masters.personas||[]).map(function(p){return p.nombre||p;});
    if(!base.length)base=["Jesús","Bea"];
    state.mensajes.forEach(function(m){ if(m.autor&&base.indexOf(m.autor)<0)base.push(m.autor); });
    return base; }
  function clientes(){ return (state.fin&&state.fin.masters&&state.fin.masters.clientes||[]).map(function(c){return c.nombre||c;}); }

  // ---------- sync (hoja compartida) ----------
  var pushing=false, pollT=null;
  function persist(){ saveLocal(); if(syncUrl)push(); }
  function push(){
    if(pushing)return; pushing=true;
    fetch(syncUrl,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action:"replaceHub",canales:state.canales,mensajes:state.mensajes.slice(-500),tareas:state.tareas})})
      .then(function(r){return r.json();}).then(function(){ pushing=false; setSub("ok"); })
      .catch(function(){ pushing=false; setSub("err"); });
  }
  function mergeList(mine,theirs){
    var by={}; (theirs||[]).forEach(function(x){ if(x&&x.id)by[x.id]=x; });
    (mine||[]).forEach(function(x){ if(!x||!x.id)return; var o=by[x.id]; if(!o||(x.v||0)>=(o.v||0))by[x.id]=x; });
    return Object.keys(by).map(function(k){return by[k];});
  }
  function pull(){
    if(!syncUrl)return Promise.resolve(false);
    return fetch(syncUrl).then(function(r){return r.json();}).then(function(d){
      if(!d)return false;
      if(d.canales&&d.canales.length)state.canales=mergeList(state.canales,d.canales);
      state.mensajes=mergeList(state.mensajes,d.mensajes).sort(function(a,b){return a.ts-b.ts;});
      state.tareas=mergeList(state.tareas,d.tareas);
      state.fin={items:d.items||[],masters:d.masters||null,budget:d.budget||null};
      saveLocal(); setSub("ok"); return true;
    }).catch(function(){ setSub("err"); return false; });
  }
  function poll(){ clearTimeout(pollT); pollT=setTimeout(function(){
    if(syncUrl&&!document.hidden)pull().then(function(ch){ if(ch)renderAll(); });
    poll(); },25000); }
  function setSub(st){ $("#wsSub").textContent=!syncUrl?"Modo local — conecta la hoja en ⚙︎":(st==="err"?"Sin conexión — trabajando en local":"Sincronizado · hoja de Google"); }

  // ---------- finanzas (KPIs y objetivos) ----------
  function ymNum(ym){ return +ym.slice(0,4)*12+(+ym.slice(5,7)-1); }
  function arr12(it){ return it.importe*12/(it.periodicidad||1); }
  function activo(it,Y,m){ if((it.freq!=="recurrente"&&it.freq!=="mensual")||!it.desde)return false;
    var cur=Y*12+m,s=ymNum(it.desde),e=it.hasta?ymNum(it.hasta):Infinity; return cur>=s&&cur<=e; }
  function ocurre(it,Y,m){ var cur=Y*12+m;
    if(it.freq==="puntual")return it.mes&&ymNum(it.mes)===cur?+it.importe:0;
    if(!activo(it,Y,m))return 0; return ((cur-ymNum(it.desde))%(it.periodicidad||1)===0)?+it.importe:0; }
  function finKpis(){
    if(!state.fin||!state.fin.items||!state.fin.items.length)return null;
    var now=new Date(),Y=now.getFullYear(),M=now.getMonth(),items=state.fin.items;
    var arrNet=0,arrIng=0,neto=0;
    items.forEach(function(it){
      if(activo(it,Y,M)){ var a=arr12(it); arrNet+=(it.tipo==="ingreso"?a:-a); if(it.tipo==="ingreso")arrIng+=a; }
      for(var m=0;m<12;m++){ var v=ocurre(it,Y,m); if(v)neto+=(it.tipo==="ingreso"?v:-v); }
    });
    var nV=Math.max(1,(state.fin.masters&&state.fin.masters.personas||[]).length||2);
    return {arrNetVimi:arrNet/nV,arr:arrIng,neto:neto,nV:nV,Y:Y};
  }
  function renderKpis(){
    var k=finKpis(),row=$("#kpirow");
    if(!k){ row.hidden=true; renderGoals(null); return; }
    row.hidden=false;
    row.innerHTML='<span>ARR neto × ViMi <b class="brass">'+eur(k.arrNetVimi)+'</b></span><span class="sep">·</span>'+
      '<span>ARR <b>'+eur(k.arr)+'</b></span><span class="sep">·</span>'+
      '<span>Neto '+k.Y+' <b style="color:'+(k.neto>=0?"var(--good-ink)":"var(--crit)")+'">'+eur(k.neto)+'</b></span><span class="sep">·</span>'+
      '<span><a href="../" style="color:var(--accent-ink)">abrir dashboard →</a></span>';
    renderGoals(k);
  }
  function renderGoals(k){
    var g=$("#goals");
    if(!k){ g.innerHTML='<h5>Objetivos</h5><div class="goal"><div class="t">Break-even '+(new Date().getFullYear())+'</div><div class="t" style="color:var(--side-dim);font-size:11.5px">Conecta la hoja (⚙︎) para medirlo</div></div><div class="goal"><div class="t">Mejor ARR neto × ViMi del grupo · 2027</div></div>'; return; }
    var prog=k.neto>=0?100:Math.max(0,Math.min(99,Math.round(100+k.neto/1000)));
    g.innerHTML='<h5>Objetivos</h5>'+
      '<div class="goal"><div class="t"><span>Break-even '+k.Y+'</span><b class="num">'+(k.neto>=0?"✓":eur(k.neto))+'</b></div><div class="gtrack"><i style="width:'+prog+'%;background:'+(k.neto>=0?"var(--good)":"var(--accent)")+'"></i></div></div>'+
      '<div class="goal"><div class="t"><span>ARR neto × ViMi → nº1 · 2027</span><b class="num">'+eur(k.arrNetVimi)+'</b></div><div class="gtrack"><i style="width:'+Math.max(4,Math.min(100,k.arrNetVimi>0?60:8))+'%"></i></div></div>';
  }

  // ---------- canales ----------
  function canal(id){ for(var i=0;i<state.canales.length;i++) if(state.canales[i].id===id)return state.canales[i]; return state.canales[0]; }
  function canalesConClientes(){
    // añade canales automáticos por cliente del maestro financiero
    clientes().forEach(function(c){
      var id="cli-"+c.toLowerCase().replace(/[^a-z0-9]+/g,"-");
      if(!state.canales.some(function(ch){return ch.id===id||ch.cliente===c;}))
        state.canales.push({id:id,nombre:"cliente-"+c.toLowerCase().replace(/[^a-z0-9]+/g,"-"),cliente:c,desc:"Trabajo e informes de "+c,v:1});
    });
  }
  function unread(id){ var last=leidos[id]||0,n=0;
    state.mensajes.forEach(function(m){ if(m.canal===id&&m.ts>last&&m.autor!==yo)n++; }); return n; }
  function renderSide(){
    canalesConClientes();
    $("#chanList").innerHTML=state.canales.map(function(ch){
      var n=unread(ch.id),tcount=state.tareas.filter(function(t){return t.canal===ch.id&&t.estado!=="hecha";}).length;
      return '<button class="chan'+(ch.id===canalActivo?" on":"")+'" data-id="'+ch.id+'"><span class="h">#</span><span class="n">'+esc(ch.nombre)+'</span>'+
        (n?'<span class="badge">'+n+'</span>':(tcount?'<span class="cnt">'+tcount+'☑</span>':''))+'</button>';
    }).join("");
    $$("#chanList .chan").forEach(function(b){ b.onclick=function(){ abrirCanal(b.dataset.id); cerrarSide(); }; });
    $("#teamList").innerHTML=personas().map(function(p){
      return '<div class="who"><span class="dot" style="background:'+(p===yo?"var(--good)":"var(--side-dim)")+'"></span>'+esc(p)+(p===yo?' <span style="color:var(--side-dim)">(tú)</span>':'')+'</div>'; }).join("");
  }
  function abrirCanal(id){ canalActivo=id; leidos[id]=Date.now(); localStorage.setItem(LS_READ,JSON.stringify(leidos)); renderAll(); }
  function cerrarSide(){ $("#app").classList.remove("side-open"); }

  // ---------- mensajes ----------
  function avatar(n){ var i=0; for(var k=0;k<n.length;k++)i+=n.charCodeAt(k);
    return '<span class="av" style="background:'+AVCOLORS[i%AVCOLORS.length]+'">'+esc(n.slice(0,1).toUpperCase())+'</span>'; }
  function fmtTxt(t){
    var h=esc(t);
    h=h.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
    personas().forEach(function(p){ h=h.split("@"+esc(p)).join('<span class="mention">@'+esc(p)+'</span>'); });
    return h;
  }
  function dia(ts){ var d=new Date(ts),hoy=new Date();
    var mismo=function(a,b){return a.toDateString()===b.toDateString();};
    if(mismo(d,hoy))return "Hoy";
    var ayer=new Date(hoy.getTime()-864e5); if(mismo(d,ayer))return "Ayer";
    return d.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});
  }
  function hora(ts){ return new Date(ts).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}); }
  function renderMsgs(){
    var list=state.mensajes.filter(function(m){return m.canal===canalActivo&&!m.del;}).sort(function(a,b){return a.ts-b.ts;});
    var out="",lastDay="";
    list.forEach(function(m){
      var d=dia(m.ts); if(d!==lastDay){ out+='<div class="daysep">'+d+'</div>'; lastDay=d; }
      var reacts=Object.keys(m.reacciones||{}).filter(function(e){return (m.reacciones[e]||[]).length;}).map(function(e){
        var who=m.reacciones[e],mine=who.indexOf(yo)>=0;
        return '<button class="react'+(mine?" mine":"")+'" data-id="'+m.id+'" data-e="'+e+'" title="'+esc(who.join(", "))+'">'+e+' '+who.length+'</button>'; }).join("");
      var tarea=m.tareaId?(function(){ var t=state.tareas.find(function(x){return x.id===m.tareaId;});
        return t?'<div class="tasklink">☑ Tarea creada: <b>'+esc(t.titulo)+'</b> · '+t.estado+'</div>':""; })():"";
      out+='<div class="msg" data-id="'+m.id+'">'+avatar(m.autor)+
        '<div class="body"><div class="meta"><b>'+esc(m.autor)+'</b><time>'+hora(m.ts)+'</time></div>'+
        '<div class="txt">'+fmtTxt(m.texto)+'</div>'+(reacts?'<div class="reacts">'+reacts+'</div>':"")+tarea+'</div>'+
        '<span class="mactions">'+EMOJIS.slice(0,3).map(function(e){return '<button class="mact re" data-id="'+m.id+'" data-e="'+e+'">'+e+'</button>';}).join("")+
        '<button class="mact totask" data-id="'+m.id+'" title="Convertir en tarea">☑</button>'+
        (m.autor===yo?'<button class="mact del" data-id="'+m.id+'" title="Eliminar">✕</button>':"")+'</span></div>';
    });
    $("#msgs").innerHTML=out||'<div class="daysep">Canal vacío — escribe el primer mensaje</div>';
    $("#msgs").scrollTop=$("#msgs").scrollHeight;
    $$("#msgs .re, #msgs .react").forEach(function(b){ b.onclick=function(){ react(b.dataset.id,b.dataset.e); }; });
    $$("#msgs .totask").forEach(function(b){ b.onclick=function(){ msgATarea(b.dataset.id); }; });
    $$("#msgs .del").forEach(function(b){ b.onclick=function(){ var m=msg(b.dataset.id); if(m&&confirm("¿Eliminar este mensaje?")){ m.del=1; m.v=(m.v||0)+1; persist(); renderMsgs(); } }; });
  }
  function msg(id){ return state.mensajes.find(function(m){return m.id===id;}); }
  function react(id,e){ var m=msg(id); if(!m)return; m.reacciones=m.reacciones||{}; var l=m.reacciones[e]=m.reacciones[e]||[];
    var i=l.indexOf(yo); if(i>=0)l.splice(i,1); else l.push(yo); m.v=(m.v||0)+1; persist(); renderMsgs(); }
  function enviar(){
    var t=$("#input").value.trim(); if(!t)return;
    state.mensajes.push({id:uid("m"),canal:canalActivo,autor:yo,texto:t,ts:Date.now(),reacciones:{},v:1});
    $("#input").value=""; $("#input").style.height="auto";
    leidos[canalActivo]=Date.now(); localStorage.setItem(LS_READ,JSON.stringify(leidos));
    persist(); renderMsgs(); renderSide();
  }

  // ---------- tareas ----------
  var taskEdit=null, taskFromMsg=null;
  function renderTasks(){
    var fE=$("#tfEstado").value,fP=$("#tfPersona").value;
    var list=state.tareas.filter(function(t){ return t.canal===canalActivo&&!t.del&&(!fE||t.estado===fE)&&(!fP||t.persona===fP); });
    var grupos=[["pendiente","Pendientes"],["encurso","En curso"],["hecha","Hechas"]];
    var out="";
    grupos.forEach(function(g){
      var ts=list.filter(function(t){return t.estado===g[0];});
      if(!ts.length)return;
      out+='<div class="tgroup">'+g[1]+' · '+ts.length+'</div>';
      ts.forEach(function(t){
        var icon=t.estado==="hecha"?"✅":(t.estado==="encurso"?"🔵":"⚪️");
        var late=t.vence&&t.estado!=="hecha"&&t.vence<new Date().toISOString().slice(0,10);
        out+='<div class="task '+t.estado+'"><div class="tt"><button class="st" data-id="'+t.id+'" title="Cambiar estado">'+icon+'</button>'+
          '<span class="ti">'+esc(t.titulo)+'</span>'+
          '<span class="tacts"><button class="ted" data-id="'+t.id+'" title="Editar">✎</button><button class="tdel" data-id="'+t.id+'" title="Eliminar">✕</button></span></div>'+
          (t.detalle?'<div class="td">'+esc(t.detalle)+'</div>':"")+
          '<div class="tm"><span class="tag per">'+esc(t.persona||"—")+'</span>'+
          (t.cliente?'<span class="tag cli">'+esc(t.cliente)+'</span>':"")+
          '<span class="tag p-'+(t.prioridad||"media")+'">'+(t.prioridad||"media")+'</span>'+
          (t.vence?'<span class="tag due'+(late?" late":"")+'">'+(late?"⚠ ":"")+'vence '+t.vence.slice(5)+'</span>':"")+'</div></div>';
      });
    });
    $("#taskList").innerHTML=out+'<button class="newtask" id="newTask">＋ Nueva tarea en #'+esc(canal(canalActivo).nombre)+'</button>';
    var n=list.filter(function(t){return t.estado!=="hecha";}).length;
    $("#railTitle").textContent="Tareas · "+n+" abiertas";
    $$("#taskList .st").forEach(function(b){ b.onclick=function(){ var t=tarea(b.dataset.id);
      t.estado=t.estado==="pendiente"?"encurso":(t.estado==="encurso"?"hecha":"pendiente"); t.v=(t.v||0)+1; persist(); renderTasks(); renderSide(); }; });
    $$("#taskList .ted").forEach(function(b){ b.onclick=function(){ abrirTarea(b.dataset.id); }; });
    $$("#taskList .tdel").forEach(function(b){ b.onclick=function(){ var t=tarea(b.dataset.id);
      if(confirm('¿Eliminar la tarea «'+t.titulo+'»?')){ t.del=1; t.v=(t.v||0)+1; persist(); renderTasks(); renderSide(); } }; });
    var nt=$("#newTask"); if(nt)nt.onclick=function(){ abrirTarea(null); };
  }
  function tarea(id){ return state.tareas.find(function(t){return t.id===id;}); }
  function fillSel(sel,opts,val,vacio){ $(sel).innerHTML=(vacio?'<option value="">'+vacio+'</option>':"")+
    opts.map(function(o){return '<option'+(o===val?" selected":"")+'>'+esc(o)+'</option>';}).join(""); }
  function abrirTarea(id,pre){
    taskEdit=id; var t=id?tarea(id):null;
    $("#taskTitle").textContent=id?"Editar tarea":"Nueva tarea";
    $("#tTitulo").value=t?t.titulo:(pre&&pre.titulo||"");
    $("#tDetalle").value=t?t.detalle||"":(pre&&pre.detalle||"");
    fillSel("#tPersona",personas(),t?t.persona:yo);
    fillSel("#tCliente",clientes(),t?t.cliente:(canal(canalActivo).cliente||""),"—");
    $("#tPrio").value=t?(t.prioridad||"media"):"media";
    $("#tVence").value=t?(t.vence||""):"";
    $("#scrimTask").classList.add("open"); setTimeout(function(){$("#tTitulo").focus();},60);
  }
  function guardarTarea(){
    var titulo=$("#tTitulo").value.trim(); if(!titulo){ $("#tTitulo").focus(); return; }
    if(taskEdit){ var t=tarea(taskEdit);
      Object.assign(t,{titulo:titulo,detalle:$("#tDetalle").value.trim(),persona:$("#tPersona").value,cliente:$("#tCliente").value,prioridad:$("#tPrio").value,vence:$("#tVence").value,v:(t.v||0)+1});
    } else {
      var nt={id:uid("t"),canal:canalActivo,cliente:$("#tCliente").value,titulo:titulo,detalle:$("#tDetalle").value.trim(),estado:"pendiente",persona:$("#tPersona").value,prioridad:$("#tPrio").value,fecha:new Date().toISOString().slice(0,10),vence:$("#tVence").value,v:1};
      state.tareas.push(nt);
      if(taskFromMsg){ var m=msg(taskFromMsg); if(m){ m.tareaId=nt.id; m.v=(m.v||0)+1; } taskFromMsg=null; }
    }
    $("#scrimTask").classList.remove("open");
    persist(); renderTasks(); renderMsgs(); renderSide(); toast("Tarea guardada");
    if(!$("#app").classList.contains("tasks-open"))toggleTasks(true);
  }
  function msgATarea(id){ var m=msg(id); if(!m)return; taskFromMsg=id;
    var linea=m.texto.split("\n")[0]; abrirTarea(null,{titulo:linea.slice(0,120),detalle:m.texto.length>120?m.texto:""}); }

  // ---------- informes ----------
  function esInformes(){ return canalActivo==="informes"; }
  function renderInformes(){
    var cls=clientes();
    $("#repwrap").innerHTML='<div class="repcard"><h2>Informe de actividad para cliente</h2>'+
      '<p class="hint">Compone un informe con las tareas del periodo y, si la hoja está conectada, el resumen económico del cliente. Revísalo, cópialo y envíalo.</p>'+
      '<div class="reprow"><select id="repCli">'+(cls.length?cls.map(function(c){return "<option>"+esc(c)+"</option>";}).join(""):"<option value=''>— sin clientes en el maestro —</option>")+'</select>'+
      '<input type="month" id="repMes" value="'+new Date().toISOString().slice(0,7)+'">'+
      '<button class="btn primary" id="repGen">Generar informe</button></div>'+
      '<textarea class="repout" id="repOut" placeholder="El informe aparecerá aquí…"></textarea>'+
      '<div class="reprow" style="margin-top:10px"><button class="btn" id="repCopy">📋 Copiar</button>'+
      '<button class="btn ghost" id="repPost">Publicar en el canal del cliente</button></div></div>';
    $("#repGen").onclick=generarInforme;
    $("#repCopy").onclick=function(){ var el=$("#repOut"); el.select(); document.execCommand("copy"); toast("Informe copiado"); };
    $("#repPost").onclick=function(){ var txt=$("#repOut").value.trim(),c=$("#repCli").value; if(!txt||!c)return;
      canalesConClientes(); var ch=state.canales.find(function(x){return x.cliente===c;});
      state.mensajes.push({id:uid("m"),canal:ch?ch.id:"informes",autor:yo,texto:txt,ts:Date.now(),reacciones:{},v:1});
      persist(); toast("Publicado en #"+(ch?ch.nombre:"informes")); renderSide(); };
  }
  function generarInforme(){
    var c=$("#repCli").value, mes=$("#repMes").value;
    var ts=state.tareas.filter(function(t){ return !t.del&&(t.cliente===c||(canal(t.canal).cliente===c)); });
    var hechas=ts.filter(function(t){return t.estado==="hecha";}),abiertas=ts.filter(function(t){return t.estado!=="hecha";});
    var lineas=["INFORME DE ACTIVIDAD — "+c,"Visual Inteligencia · "+new Date(mes+"-01").toLocaleDateString("es-ES",{month:"long",year:"numeric"}),""];
    lineas.push("— Trabajo completado —");
    lineas=lineas.concat(hechas.length?hechas.map(function(t){return "  ✓ "+t.titulo+(t.detalle?" — "+t.detalle.split("\n")[0]:"");}):["  (sin tareas cerradas registradas)"]);
    lineas.push("","— En curso / próximos pasos —");
    lineas=lineas.concat(abiertas.length?abiertas.map(function(t){return "  • "+t.titulo+(t.persona?" ("+t.persona+")":"");}):["  (nada pendiente)"]);
    if(state.fin&&state.fin.items&&state.fin.items.length&&c){
      var Y=+mes.slice(0,4),ing=0,dir=0;
      state.fin.items.forEach(function(it){ for(var m=0;m<12;m++){ var v=ocurre(it,Y,m); if(!v)continue;
        if(it.cliente===c){ if(it.tipo==="ingreso")ing+=v; else if(it.naturaleza==="directo")dir+=v; } } });
      lineas.push("","— Resumen económico "+Y+" (interno, retirar si no procede) —","  Facturación: "+eur(ing)+" · Costes directos: "+eur(dir));
    }
    lineas.push("","Un saludo,","Equipo Visual Inteligencia");
    $("#repOut").value=lineas.join("\n");
  }

  // ---------- render global ----------
  function renderAll(){
    var ch=canal(canalActivo);
    $("#chTitle").textContent="#"+ch.nombre;
    $("#chDesc").textContent=ch.desc||(ch.cliente?"Cliente: "+ch.cliente:"");
    var inf=esInformes();
    $("#repwrap").classList.toggle("hidden",!inf);
    $("#msgs").classList.toggle("hidden",inf);
    $("#composer").classList.toggle("hidden",inf);
    $("#input").placeholder="Mensaje a #"+ch.nombre+" — @nombre para mencionar";
    if(inf)renderInformes(); else renderMsgs();
    renderSide(); renderTasks(); renderKpis();
    fillSel("#tfPersona",personas(),$("#tfPersona").value,"Cualquiera");
  }
  function toggleTasks(on){ var app=$("#app"); var cur=app.classList.contains("tasks-open");
    app.classList.toggle("tasks-open",on==null?!cur:on);
    $("#taskToggle").setAttribute("aria-pressed",app.classList.contains("tasks-open")); }

  var toastT; function toast(m){ var el=$("#toast"); el.textContent=m; el.classList.add("show"); clearTimeout(toastT); toastT=setTimeout(function(){el.classList.remove("show");},1800); }

  // ---------- identidad ----------
  function pedirIdentidad(){
    $("#idGrid").innerHTML=personas().map(function(p){
      return '<button class="idbtn" data-p="'+esc(p)+'">'+avatar(p)+esc(p)+'</button>'; }).join("")+
      '<button class="idbtn" data-p="__otro">✏️ Otro nombre…</button>';
    $$("#idGrid .idbtn").forEach(function(b){ b.onclick=function(){
      var p=b.dataset.p;
      if(p==="__otro"){ p=(prompt("Tu nombre:")||"").trim(); if(!p)return; }
      yo=p; localStorage.setItem(LS_ME,yo); $("#scrimId").classList.remove("open"); renderAll(); }; });
    $("#scrimId").classList.add("open");
  }

  // ---------- wiring ----------
  $("#sendBtn").onclick=enviar;
  $("#input").addEventListener("keydown",function(e){ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); enviar(); } });
  $("#input").addEventListener("input",function(){ this.style.height="auto"; this.style.height=Math.min(120,this.scrollHeight)+"px"; });
  $("#taskToggle").onclick=function(){ toggleTasks(); };
  $("#railClose").onclick=function(){ toggleTasks(false); };
  $("#tfEstado").onchange=renderTasks; $("#tfPersona").onchange=renderTasks;
  $("#tCancel").onclick=function(){ $("#scrimTask").classList.remove("open"); taskFromMsg=null; };
  $("#tSave").onclick=guardarTarea;
  $("#menuBtn").onclick=function(){ $("#app").classList.add("side-open"); };
  document.addEventListener("click",function(e){ if($("#app").classList.contains("side-open")&&!e.target.closest("aside")&&!e.target.closest("#menuBtn"))cerrarSide(); });
  $("#addChan").onclick=function(){ fillSel("#cCliente",clientes(),"","—"); $("#cNombre").value=""; $("#scrimChan").classList.add("open"); };
  $("#cCancel").onclick=function(){ $("#scrimChan").classList.remove("open"); };
  $("#cSave").onclick=function(){ var n=$("#cNombre").value.trim().toLowerCase().replace(/[^a-z0-9áéíóúñ]+/g,"-").replace(/^-|-$/g,""); if(!n){ $("#cNombre").focus(); return; }
    if(state.canales.some(function(c){return c.nombre===n;})){ toast("Ya existe ese canal"); return; }
    var ch={id:uid("c"),nombre:n,cliente:$("#cCliente").value,desc:"",v:1}; state.canales.push(ch);
    $("#scrimChan").classList.remove("open"); persist(); abrirCanal(ch.id); };
  $("#syncBtn").onclick=function(){ $("#syncUrl").value=syncUrl; $("#scrimSync").classList.add("open"); };
  $("#syncClose").onclick=function(){ $("#scrimSync").classList.remove("open"); };
  $("#idBtn").onclick=function(){ $("#scrimSync").classList.remove("open"); pedirIdentidad(); };
  $("#syncConnect").onclick=function(){ var u=$("#syncUrl").value.trim();
    if(!/^https:\/\/script\.google\.com\/.*\/exec$/.test(u)){ if(!confirm("La URL no parece un Apps Script /exec. ¿Conectar igualmente?"))return; }
    syncUrl=u; localStorage.setItem(LS_URL,u); $("#scrimSync").classList.remove("open");
    pull().then(function(){ renderAll(); toast("Conectado a la hoja"); push(); }); };
  $("#syncOff").onclick=function(){ syncUrl=""; localStorage.removeItem(LS_URL); $("#scrimSync").classList.remove("open"); setSub(); toast("Modo local"); };
  var curTheme=null;
  $("#themeBtn").onclick=function(){ var d=curTheme?curTheme==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;
    curTheme=d?"light":"dark"; document.documentElement.setAttribute("data-theme",curTheme); };
  document.addEventListener("visibilitychange",function(){ if(!document.hidden&&syncUrl)pull().then(function(ch){ if(ch)renderAll(); }); });

  // ---------- init ----------
  setSub();
  renderAll();
  if(!yo)pedirIdentidad();
  if(syncUrl)pull().then(function(){ renderAll(); });
  poll();
})();
