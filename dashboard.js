
(function () {
  "use strict";
  var LS="vimi.fin.v3", LS_OLD="vimi.fin.v2", LS_URL="vimi.sync.url";
  var MONTHS=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  var PERS=[[1,"Mensual"],[2,"Bimestral"],[3,"Trimestral"],[6,"Semestral"],[12,"Anual"]];
  // Cada maestro es una lista de fichas; fields: [clave, etiqueta, ¿obligatorio?, origen de opciones]
  // Origen de opciones: nombre de otro maestro (select con sus nombres) o "NAT" (directo/indirecto)
  var MASTER_DEFS=[
    {key:"clientes",label:"Clientes",fields:[["nombre","Nombre",1],["nif","NIF"],["email","Email"],["telefono","Teléfono"],["notas","Notas"]]},
    {key:"proveedores",label:"Proveedores",fields:[["nombre","Nombre",1],["nif","NIF"],["email","Email"],["telefono","Teléfono"],["notas","Notas"]]},
    {key:"personas",label:"Personas / ViMis",fields:[["nombre","Nombre",1],["rol","Rol"],["email","Email"],["notas","Notas"]]},
    {key:"conceptosIngreso",label:"Conceptos ingreso",fields:[["nombre","Nombre",1],["categoria","Categoría por defecto",0,"categoriasIngreso"],["notas","Notas"]]},
    {key:"conceptosGasto",label:"Conceptos gasto",fields:[["nombre","Nombre",1],["categoria","Categoría por defecto",0,"categoriasGasto"],["naturaleza","Naturaleza por defecto",0,"NAT"],["proveedor","Proveedor por defecto",0,"proveedores"],["notas","Notas"]]},
    {key:"categoriasIngreso",label:"Categorías ingreso",fields:[["nombre","Nombre",1],["notas","Notas"]]},
    {key:"categoriasGasto",label:"Categorías gasto",fields:[["nombre","Nombre",1],["notas","Notas"]]}];
  var eur=function(n){return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n||0);};
  var eur2=function(n){return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:2}).format(n||0);};
  var pctf=function(n){return (n>=0?"+":"")+(Math.round(n*10)/10).toLocaleString("es-ES")+"%";};
  var $=function(s){return document.querySelector(s);};
  var $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s));};
  var uid=function(){return "m"+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);};
  var addMonth=function(ym,k){ var y=+ym.slice(0,4),m=+ym.slice(5,7)-1+k; y+=Math.floor(m/12); m=((m%12)+12)%12; return y+"-"+String(m+1).padStart(2,"0"); };
  var ymNum=function(ym){ return +ym.slice(0,4)*12 + (+ym.slice(5,7)-1); };
  var perLabel=function(p){ for(var i=0;i<PERS.length;i++) if(PERS[i][0]===p) return PERS[i][1]; return "Cada "+p+" meses"; };

  function defaultMasters(){
    var mk=function(list){return list.map(function(n){return {nombre:n};});};
    return {
      clientes:mk(["Alfa","Beta","Gamma","Delta"]),
      proveedores:mk(["AWS","Anthropic","Google","Wispr","WealthReader"]),
      personas:[{nombre:"Jesús",rol:"Socio"},{nombre:"Bea",rol:"Socia"}],
      conceptosIngreso:[{nombre:"Cuota servicio IA",categoria:"Ingresos recurrentes"},{nombre:"Suscripción plataforma",categoria:"Ingresos recurrentes"},{nombre:"Proyecto a medida",categoria:"Proyectos puntuales"}],
      conceptosGasto:[{nombre:"Nómina",categoria:"Nóminas",naturaleza:"indirecto"},{nombre:"AWS hosting",categoria:"AWS / Infraestructura",naturaleza:"directo",proveedor:"AWS"},{nombre:"Claude Max",categoria:"Suscripciones",naturaleza:"indirecto",proveedor:"Anthropic"},{nombre:"Claude API (uso)",categoria:"Suscripciones",naturaleza:"directo",proveedor:"Anthropic"},{nombre:"Wispr Flow",categoria:"Suscripciones",naturaleza:"indirecto",proveedor:"Wispr"},{nombre:"WealthReader",categoria:"Suscripciones",naturaleza:"directo",proveedor:"WealthReader"},{nombre:"Formación",categoria:"Servicios externos",naturaleza:"indirecto"}],
      categoriasIngreso:mk(["Ingresos recurrentes","Proyectos puntuales","Otros ingresos"]),
      categoriasGasto:mk(["Nóminas","AWS / Infraestructura","Suscripciones","Servicios externos","Otros gastos"])
    };
  }
  function seed(){
    return { year:2026, quarter:0, items:[
      rec("ingreso","Ingresos recurrentes","Cliente Alfa — servicio IA","Alfa",1500,"2025-01",1),
      rec("ingreso","Ingresos recurrentes","Cliente Beta — suscripción","Beta",1200,"2025-09",1),
      rec("ingreso","Ingresos recurrentes","Cliente Gamma — plataforma","Gamma",2500,"2026-03",1),
      pun("ingreso","Proyectos puntuales","Proyecto a medida — Delta","Delta",4000,"2026-05"),
      rec("gasto","Nóminas","Nómina Jesús","",3000,"2025-01",1,"indirecto","","Jesús"),
      rec("gasto","Nóminas","Nómina Bea","",3000,"2025-01",1,"indirecto","","Bea"),
      rec("gasto","Suscripciones","Claude Max","",100,"2025-01",1,"indirecto","Anthropic"),
      rec("gasto","Suscripciones","Wispr Flow","",15,"2026-01",1,"indirecto","Wispr"),
      rec("gasto","AWS / Infraestructura","AWS — Cliente Alfa","Alfa",350,"2025-01",1,"directo","AWS"),
      rec("gasto","AWS / Infraestructura","AWS — Cliente Gamma","Gamma",500,"2026-03",1,"directo","AWS"),
      rec("gasto","Suscripciones","Claude API (uso)","",120,"2025-06",1,"directo","Anthropic"),
      rec("gasto","Suscripciones","WealthReader","",75,"2025-01",1,"directo","WealthReader"),
      rec("gasto","Servicios externos","Asesoría fiscal","",180,"2025-01",3,"indirecto"),
      pun("gasto","Servicios externos","Formación equipo","",600,"2026-02","indirecto")
    ], budget:{ "2026":{"Ingresos recurrentes":78000,"Nóminas":72000,"AWS / Infraestructura":12000,"Suscripciones":4200} },
       masters:defaultMasters() };
  }
  function rec(tipo,categoria,concepto,cliente,imp,desde,per,nat,prov,pers){return {id:uid(),freq:"recurrente",periodicidad:per||1,tipo:tipo,categoria:categoria,concepto:concepto,cliente:cliente||"",proveedor:prov||"",persona:pers||"",importe:imp,desde:desde,hasta:"",naturaleza:nat||"indirecto"};}
  function pun(tipo,categoria,concepto,cliente,imp,mes,nat){return {id:uid(),freq:"puntual",periodicidad:1,tipo:tipo,categoria:categoria,concepto:concepto,cliente:cliente||"",proveedor:"",persona:"",importe:imp,mes:mes,naturaleza:nat||"indirecto"};}

  // Acepta datos de versiones anteriores (freq "mensual", campo "nat", presupuesto plano)
  function normItem(it){
    if(it.freq==="mensual") it.freq="recurrente";
    it.periodicidad=Math.max(1,parseInt(it.periodicidad,10)||1);
    it.naturaleza=it.naturaleza||it.nat||"indirecto"; delete it.nat;
    it.importe=Number(it.importe)||0;
    ["desde","hasta","mes"].forEach(function(k){ var v=it[k]; if(v==null){it[k]="";return;} v=String(v); it[k]=/^\d{4}-\d{2}/.test(v)?v.slice(0,7):""; });
    it.cliente=it.cliente||""; it.proveedor=it.proveedor||""; it.persona=it.persona||"";
    if(!it.id) it.id=uid();
    return it;
  }
  function normBudget(b){
    if(!b) return {};
    var keys=Object.keys(b);
    var flat=keys.length&&keys.every(function(k){return typeof b[k]==="number";});
    if(flat){ var o={}; o[String(new Date().getFullYear())]=b; return o; }
    return b;
  }
  function normMasters(m){
    var d=defaultMasters(), out={};
    MASTER_DEFS.forEach(function(def){ var k=def.key, list=(m&&Array.isArray(m[k])&&m[k].length)?m[k]:d[k];
      // acepta el formato antiguo (lista de textos) y lo convierte en fichas
      out[k]=list.map(function(v){ return typeof v==="string"?{nombre:v}:(v&&v.nombre?v:null); }).filter(Boolean);
      sortM(out[k]); });
    return out;
  }
  function sortM(list){ list.sort(function(a,b){return a.nombre.localeCompare(b.nombre,"es");}); }
  function mNames(key){ return state.masters[key].map(function(x){return x.nombre;}); }
  function mFind(key,nombre){ var v=(nombre||"").trim().toLowerCase(),l=state.masters[key];
    for(var i=0;i<l.length;i++) if(l[i].nombre.toLowerCase()===v) return l[i]; return null; }
  function harvestMasters(s){
    s=s||state;
    s.items.forEach(function(it){
      addTo(s,"clientes",it.cliente); addTo(s,"proveedores",it.proveedor); addTo(s,"personas",it.persona);
      addTo(s,it.tipo==="ingreso"?"conceptosIngreso":"conceptosGasto",it.concepto);
      addTo(s,it.tipo==="ingreso"?"categoriasIngreso":"categoriasGasto",it.categoria);
    });
  }
  function addTo(s,key,val){ val=(val||"").trim(); if(!val)return false;
    var list=s.masters[key],v=val.toLowerCase();
    for(var i=0;i<list.length;i++) if(list[i].nombre.toLowerCase()===v) return false;
    list.push({nombre:val}); sortM(list); return true; }
  function addMaster(key,val){ return addTo(state,key,val); }

  var syncUrl = localStorage.getItem(LS_URL) || "";
  var state = loadLocal();
  function loadLocal(){
    try{ var s=JSON.parse(localStorage.getItem(LS)); if(s&&s.items) return upgrade(s); }catch(e){}
    try{ var o=JSON.parse(localStorage.getItem(LS_OLD)); if(o&&o.items){ var up=upgrade(o); localStorage.removeItem(LS_OLD); return up; } }catch(e){}
    return seed();
  }
  function upgrade(s){
    s.items=(s.items||[]).map(normItem);
    s.budget=normBudget(s.budget);
    s.masters=normMasters(s.masters);
    s.quarter=s.quarter||0;
    s.year=s.year||new Date().getFullYear();
    harvestMasters(s);
    return s;
  }
  function saveLocal(){ try{ localStorage.setItem(LS, JSON.stringify(state)); }catch(e){} }

  // ---- persistence (local or sheet) ----
  function persist(){
    saveLocal();
    if(syncUrl){ pushSheet(); }
  }
  function pushSheet(){
    setSync("push");
    fetch(syncUrl,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action:"replace",items:state.items,budget:state.budget,masters:state.masters})})
      .then(function(r){return r.json();})
      .then(function(){ setSync("ok"); })
      .catch(function(){ setSync("err"); toast("Sin conexión con la hoja — guardado local"); });
  }
  function pullSheet(){
    setSync("pull");
    return fetch(syncUrl,{method:"GET"}).then(function(r){return r.json();}).then(function(d){
      if(d&&d.items){
        state.items=d.items.map(normItem);
        state.budget=normBudget(d.budget);
        state.masters=normMasters(d.masters);
        harvestMasters(); saveLocal(); setSync("ok");
      }
      return true;
    }).catch(function(){ setSync("err"); toast("No se pudo leer la hoja — usando datos locales"); return false; });
  }

  // ---- computation ----
  function inRange(it,Y,mIdx){
    var cur=Y*12+mIdx;
    if(it.freq==="puntual"){ if(!it.mes) return 0; return ymNum(it.mes)===cur?it.importe:0; }
    if(!it.desde) return 0;
    var start=ymNum(it.desde), end=it.hasta?ymNum(it.hasta):Infinity;
    if(cur<start||cur>end) return 0;
    return ((cur-start)%(it.periodicidad||1)===0)?it.importe:0;
  }
  function activeAt(it,Y,mIdx){ // recurrente vigente en ese mes (aunque no toque apunte)
    if(it.freq!=="recurrente"||!it.desde) return false;
    var cur=Y*12+mIdx, start=ymNum(it.desde), end=it.hasta?ymNum(it.hasta):Infinity;
    return cur>=start&&cur<=end;
  }
  function monthsSel(){ var q=state.quarter||0; if(!q) return [0,1,2,3,4,5,6,7,8,9,10,11]; var out=[],b=(q-1)*3; for(var i=0;i<3;i++)out.push(b+i); return out; }
  function periodLabel(){ var q=state.quarter||0; return q?("T"+q+" "+state.year):("Ejercicio "+state.year); }
  function seriesFor(Y){ var ing=Array(12).fill(0),gas=Array(12).fill(0),dir=Array(12).fill(0),ind=Array(12).fill(0);
    state.items.forEach(function(it){ for(var m=0;m<12;m++){ var a=inRange(it,Y,m); if(!a)continue;
      if(it.tipo==="ingreso")ing[m]+=a; else{gas[m]+=a; if(it.naturaleza==="directo")dir[m]+=a; else ind[m]+=a;} } });
    return {ing:ing,gas:gas,dir:dir,ind:ind}; }
  function sumSel(arr,months){ var t=0; months.forEach(function(m){t+=arr[m];}); return t; }
  function arr12(it){ return it.importe*12/(it.periodicidad||1); }
  function arrKpi(Y,months){ var last=months[months.length-1],t=0;
    state.items.forEach(function(it){ if(it.tipo==="ingreso"&&activeAt(it,Y,last)) t+=arr12(it); }); return t; }
  function arrNet(Y,months){ // ARR de ingresos menos costes recurrentes activos, todo anualizado
    var last=months[months.length-1],t=0;
    state.items.forEach(function(it){ if(!activeAt(it,Y,last))return; t+=(it.tipo==="ingreso"?1:-1)*arr12(it); }); return t; }
  function catTotals(Y,months){ var t={}; state.items.forEach(function(it){ if(it.tipo!=="gasto")return; var s=0; months.forEach(function(m){s+=inRange(it,Y,m);}); if(s)t[it.categoria]=(t[it.categoria]||0)+s; }); return t; }
  function incTotals(Y,months){ var t={}; state.items.forEach(function(it){ if(it.tipo!=="ingreso")return; var s=0; months.forEach(function(m){s+=inRange(it,Y,m);}); if(s)t[it.categoria]=(t[it.categoria]||0)+s; }); return t; }
  function clientTotals(Y,months){
    var by={},ind=0,ingTot=0;
    state.items.forEach(function(it){ var s=0; months.forEach(function(m){s+=inRange(it,Y,m);}); if(!s)return;
      if(it.tipo==="ingreso"){ var k=it.cliente||"— sin cliente"; by[k]=by[k]||{ing:0,dir:0}; by[k].ing+=s; ingTot+=s; }
      else if(it.naturaleza==="directo"){ var k2=it.cliente||"— sin cliente"; by[k2]=by[k2]||{ing:0,dir:0}; by[k2].dir+=s; }
      else ind+=s; });
    return {by:by,ind:ind,ingTot:ingTot};
  }

  // ---- render ----
  function render(){
    var Y=state.year, months=monthsSel(), s=seriesFor(Y), sp=seriesFor(Y-1);
    var ingT=sumSel(s.ing,months),gasT=sumSel(s.gas,months),dirT=sumSel(s.dir,months),indT=sumSel(s.ind,months),net=ingT-gasT;
    var netP=sumSel(sp.ing,months)-sumSel(sp.gas,months),ingP=sumSel(sp.ing,months),dirP=sumSel(sp.dir,months),indP=sumSel(sp.ind,months);
    var A=arrKpi(Y,months),Ap=arrKpi(Y-1,months),margin=ingT>0?net/ingT*100:0,PL=periodLabel();
    var nV=Math.max(1,state.masters.personas.length),ANV=arrNet(Y,months)/nV,ANVp=arrNet(Y-1,months)/nV;
    $("#ivgYear").textContent="Ejercicio "+Y+(state.quarter?" · T"+state.quarter+" resaltado":"");
    $("#donutHint").textContent="Por categoría · "+PL;
    $("#cliHint").textContent="Ingresos − gastos directos − indirectos repartidos por facturación · "+PL;
    $("#budHint").textContent="Ejecución por categoría · "+PL+(state.quarter?" (anuales prorrateados)":"");
    $("#kpis").innerHTML=
      kpi("hero","ARR neto × ViMi",eur(ANV),"ARR − costes recurrentes, entre "+nV+" ViMi"+(nV===1?"":"s"),delta(ANV,ANVp),"var(--brass)")+
      kpi("hero","Resultado neto",eur(net),"Margen "+Math.round(margin)+"% · "+PL,delta(net,netP),"var(--accent)")+
      kpi("","ARR",eur(A),"Recurrente anualizado",delta(A,Ap))+
      kpi("","Ingresos",eur(ingT),"Facturado · "+PL,delta(ingT,ingP))+
      kpi("","Costes directos",eur(dirT),"Ligados a cliente",delta(dirT,dirP,true))+
      kpi("","Costes indirectos",eur(indT),"Estructura",delta(indT,indP,true));
    chartIVG(s); donut(catTotals(Y,months)); chartNet(s); budget(Y); clients(Y,months); movTable();
  }
  function kpi(cls,lab,val,sub,d,accent){ return '<div class="card kpi '+cls+'"><div class="lab">'+lab+'</div><div class="val"'+(accent?' style="color:'+accent+'"':'')+'>'+val+'</div><div class="sub">'+d+' '+sub+'</div></div>'; }
  function delta(cur,prev,inv){ if(!prev)return '<span class="delta flat">nuevo</span>'; var ch=(cur-prev)/Math.abs(prev)*100,up=ch>=0,good=inv?!up:up,cls=Math.abs(ch)<0.5?"flat":(good?"up":"down"),ar=Math.abs(ch)<0.5?"→":(up?"▲":"▼"); return '<span class="delta '+cls+'">'+ar+' '+pctf(ch)+'</span>'; }

  function chartIVG(s){
    var W=560,H=230,padL=44,padR=8,padT=10,padB=26,iw=W-padL-padR,ih=H-padT-padB;
    var max=Math.max(1,Math.max.apply(null,s.ing),Math.max.apply(null,s.gas)),step=niceStep(max),top=Math.ceil(max/step)*step;
    var gw=iw/12,bw=Math.min(13,(gw-6)/2),g="";
    if(state.quarter){ var qx=padL+gw*(state.quarter-1)*3; g+='<rect x="'+qx+'" y="'+padT+'" width="'+(gw*3)+'" height="'+ih+'" fill="var(--accent)" opacity="0.07" rx="6"/>'; }
    for(var t=0;t<=top;t+=step){ var y=padT+ih-(t/top)*ih; g+='<line class="grid-line" x1="'+padL+'" y1="'+y+'" x2="'+(W-padR)+'" y2="'+y+'"/>'; g+='<text class="axis-num" x="'+(padL-6)+'" y="'+(y+3)+'" text-anchor="end">'+(t/1000)+'k</text>'; }
    for(var m=0;m<12;m++){ var cx=padL+gw*m+gw/2,hi=(s.ing[m]/top)*ih,hg=(s.gas[m]/top)*ih;
      g+=bar(cx-bw-1,padT+ih-hi,bw,hi,"var(--income)",MONTHS[m],"Ingresos",s.ing[m]);
      g+=bar(cx+1,padT+ih-hg,bw,hg,"var(--expense)",MONTHS[m],"Gastos",s.gas[m]);
      g+='<text class="axis" x="'+cx+'" y="'+(H-8)+'" text-anchor="middle">'+MONTHS[m]+'</text>'; }
    g+='<line class="baseline" x1="'+padL+'" y1="'+(padT+ih)+'" x2="'+(W-padR)+'" y2="'+(padT+ih)+'"/>';
    $("#chartIVG").innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Ingresos y gastos por mes">'+g+'</svg>'; wireTips("#chartIVG");
  }
  function bar(x,y,w,h,fill,mo,lab,val){ if(h<0.5)h=0.5; return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="3" fill="'+fill+'" data-tip="<b>'+mo+'</b> · '+lab+'<br><b>'+eur2(val)+'</b>" style="cursor:pointer"/>'; }

  function donut(t){
    var palette=["var(--s1)","var(--s2)","var(--s3)","var(--s4)","var(--s5)","var(--brass)","var(--accent)"];
    var order=mNames("categoriasGasto"); Object.keys(t).forEach(function(k){ if(order.indexOf(k)<0)order.push(k); });
    var items=order.filter(function(k){return t[k]>0;}).map(function(k,i){return {k:k,v:t[k],c:palette[i%palette.length]};});
    var total=items.reduce(function(a,b){return a+b.v;},0),cx=90,cy=110,r=76,rin=48,ang=-Math.PI/2,g="";
    if(total<=0){ $("#chartDonut").innerHTML='<p class="hint">Sin gastos en el periodo.</p>'; return; }
    items.forEach(function(it){ var frac=it.v/total,a2=ang+frac*Math.PI*2,large=frac>0.5?1:0;
      var x1=cx+r*Math.cos(ang),y1=cy+r*Math.sin(ang),x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2);
      var xi=cx+rin*Math.cos(a2),yi=cy+rin*Math.sin(a2),xi2=cx+rin*Math.cos(ang),yi2=cy+rin*Math.sin(ang);
      g+='<path d="M'+x1+' '+y1+' A'+r+' '+r+' 0 '+large+' 1 '+x2+' '+y2+' L'+xi+' '+yi+' A'+rin+' '+rin+' 0 '+large+' 0 '+xi2+' '+yi2+' Z" fill="'+it.c+'" stroke="var(--surface)" stroke-width="2" style="cursor:pointer" data-tip="<b>'+esc(it.k)+'</b><br><b>'+eur2(it.v)+'</b> · '+Math.round(frac*100)+'%"/>'; ang=a2; });
    g+='<text x="'+cx+'" y="'+(cy-4)+'" text-anchor="middle" style="font-size:11px;fill:var(--ink-3)">Total</text>';
    g+='<text x="'+cx+'" y="'+(cy+15)+'" text-anchor="middle" style="font-size:17px;font-weight:750;fill:var(--ink)" class="num">'+eur(total)+'</text>';
    var leg=items.map(function(it){return '<span><i class="dot" style="background:'+it.c+'"></i> '+esc(it.k)+' · <b class="num">'+Math.round(it.v/total*100)+'%</b></span>';}).join("");
    $("#chartDonut").innerHTML='<svg viewBox="0 0 180 220" role="img" aria-label="Desglose de costes">'+g+'</svg><div class="legend" style="margin-top:2px">'+leg+'</div>'; wireTips("#chartDonut");
  }

  function chartNet(s){
    var W=560,H=210,padL=44,padR=10,padT=12,padB=26,iw=W-padL-padR,ih=H-padT-padB,cum=[],c=0;
    for(var m=0;m<12;m++){ c+=s.ing[m]-s.gas[m]; cum.push(c); }
    var mx=Math.max.apply(null,cum),mn=Math.min(0,Math.min.apply(null,cum)),span=Math.max(1,mx-mn),step=niceStep(span);
    var top=Math.ceil(mx/step)*step,bot=Math.floor(mn/step)*step,rng=Math.max(1,top-bot);
    var X=function(m){return padL+iw*(m/11);},Yv=function(v){return padT+ih-((v-bot)/rng)*ih;},g="";
    for(var t=bot;t<=top;t+=step){ var y=Yv(t); g+='<line class="grid-line" x1="'+padL+'" y1="'+y+'" x2="'+(W-padR)+'" y2="'+y+'"/>'; g+='<text class="axis-num" x="'+(padL-6)+'" y="'+(y+3)+'" text-anchor="end">'+Math.round(t/1000)+'k</text>'; }
    var y0=Yv(0); g+='<line class="baseline" x1="'+padL+'" y1="'+y0+'" x2="'+(W-padR)+'" y2="'+y0+'"/>';
    var dpath="",apath="M"+X(0)+" "+y0;
    cum.forEach(function(v,m){ var x=X(m),y=Yv(v); dpath+=(m?" L":"M")+x+" "+y; apath+=" L"+x+" "+y; }); apath+=" L"+X(11)+" "+y0+" Z";
    g+='<path d="'+apath+'" fill="var(--accent)" opacity="0.12"/>';
    g+='<path d="'+dpath+'" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
    cum.forEach(function(v,m){ var x=X(m),y=Yv(v); g+='<circle cx="'+x+'" cy="'+y+'" r="9" fill="transparent" style="cursor:pointer" data-tip="<b>'+MONTHS[m]+'</b> · acumulado<br><b>'+eur2(v)+'</b>"/>'; if(m===11)g+='<circle cx="'+x+'" cy="'+y+'" r="4" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>'; g+='<text class="axis" x="'+x+'" y="'+(H-8)+'" text-anchor="middle">'+MONTHS[m]+'</text>'; });
    $("#chartNet").innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Resultado neto acumulado">'+g+'</svg>'; wireTips("#chartNet");
  }

  function yearBudget(Y){ return (state.budget&&state.budget[String(Y)])||{}; }
  // Presupuesto de una categoría en los meses seleccionados: si es detalle mensual
  // (array de 12) suma esos meses; si es un anual, se prorratea.
  function budFor(Y,cat,months){ var b=yearBudget(Y)[cat]; if(b==null)return 0;
    if(Array.isArray(b)){ var s=0; months.forEach(function(m){s+=+b[m]||0;}); return s; }
    return b*months.length/12; }
  function budAnual(b){ return Array.isArray(b)?b.reduce(function(a,x){return a+(+x||0);},0):(+b||0); }
  function budget(Y){
    var months=monthsSel();
    var real=catTotals(Y,months),inc=incTotals(Y,months);
    var rows=[];
    mNames("categoriasIngreso").forEach(function(k){ var r=inc[k]||0,bud=budFor(Y,k,months); if(r||bud)rows.push({k:k,real:r,bud:bud,good:true}); });
    mNames("categoriasGasto").forEach(function(k){ var r=real[k]||0,bud=budFor(Y,k,months); if(r||bud)rows.push({k:k,real:r,bud:bud,good:false}); });
    $("#budget").innerHTML=rows.map(function(r){ var bud=r.bud,frac=bud>0?r.real/bud:0,over=frac>1;
      var color=r.good?(frac>=1?"var(--good)":"var(--accent)"):(over?"var(--crit)":(frac>0.9?"var(--warn)":"var(--s1)")),w=Math.min(100,frac*100);
      var badge=r.good?(frac>=1?'<span class="delta up">✓ objetivo</span>':'<span class="delta flat">'+Math.round(frac*100)+'%</span>'):(over?'<span class="delta down">↑ '+Math.round((frac-1)*100)+'% sobre</span>':'<span class="delta flat">'+Math.round(frac*100)+'%</span>');
      return '<div class="budrow"><span class="cat">'+esc(r.k)+'</span><span class="amt num">'+eur(r.real)+' / '+eur(bud)+' '+badge+'</span><div class="track"><i style="width:'+w+'%;background:'+color+'"></i></div></div>';
    }).join("")||'<p class="hint">Define presupuestos (✎) para ver la ejecución.</p>';
  }

  function clients(Y,months){
    var d=clientTotals(Y,months),names=Object.keys(d.by);
    names.sort(function(a,b){return d.by[b].ing-d.by[a].ing;});
    if(!names.length){ $("#cliBody").innerHTML='<tr><td colspan="6" style="color:var(--ink-3)">Sin actividad por cliente en el periodo.</td></tr>'; return; }
    var html=names.map(function(k){ var c=d.by[k],share=d.ingTot>0?d.ind*(c.ing/d.ingTot):0,net=c.ing-c.dir-share,mg=c.ing>0?net/c.ing*100:0;
      return '<tr><td><b>'+esc(k)+'</b></td><td class="r">'+eur2(c.ing)+'</td><td class="r">'+eur2(c.dir)+'</td><td class="r">'+eur2(share)+'</td>'+
        '<td class="r"><b style="color:'+(net>=0?"var(--good-ink)":"var(--crit)")+'">'+eur2(net)+'</b></td>'+
        '<td class="r">'+(c.ing>0?Math.round(mg)+"%":"—")+'</td></tr>'; }).join("");
    var totIng=d.ingTot,totDir=names.reduce(function(a,k){return a+d.by[k].dir;},0),totNet=totIng-totDir-d.ind;
    html+='<tr style="border-top:2px solid var(--line-strong)"><td><b>Total</b></td><td class="r"><b>'+eur2(totIng)+'</b></td><td class="r"><b>'+eur2(totDir)+'</b></td><td class="r"><b>'+eur2(d.ind)+'</b></td><td class="r"><b>'+eur2(totNet)+'</b></td><td class="r"><b>'+(totIng>0?Math.round(totNet/totIng*100)+"%":"—")+'</b></td></tr>';
    $("#cliBody").innerHTML=html;
  }

  // ---- tabla de movimientos: filtros + multiselección ----
  var selected={}, fltQ="", fltTipo="", fltNat="";
  function selCount(){ return Object.keys(selected).length; }
  function visibleItems(){
    var Y=state.year, months=monthsSel(), q=fltQ.toLowerCase();
    return state.items.filter(function(it){
      var act=false;
      for(var i=0;i<months.length&&!act;i++) act=inRange(it,Y,months[i])>0||activeAt(it,Y,months[i]);
      if(!act) return false;
      if(fltTipo&&it.tipo!==fltTipo) return false;
      if(fltNat&&(it.tipo!=="gasto"||it.naturaleza!==fltNat)) return false;
      if(q){ var hay=[it.concepto,it.cliente,it.proveedor,it.persona,it.categoria].join(" ").toLowerCase(); if(hay.indexOf(q)<0)return false; }
      return true;
    });
  }
  function movTable(){
    var rows=visibleItems().sort(function(a,b){return (a.tipo>b.tipo?1:a.tipo<b.tipo?-1:0)||(b.importe-a.importe);});
    var visIds={}; rows.forEach(function(it){visIds[it.id]=1;});
    Object.keys(selected).forEach(function(id){ if(!visIds[id]) delete selected[id]; });
    $("#movBody").innerHTML=rows.map(function(it){
      var recu=it.freq==="recurrente",annual=recu?arr12(it):it.importe;
      var freqTag=recu?('<span class="tag rec">'+perLabel(it.periodicidad)+' · '+(it.desde||"").slice(2)+(it.hasta?" → "+it.hasta.slice(2):"")+'</span>'):('<span class="tag">Puntual · '+(it.mes||"").slice(2)+'</span>');
      var natTag=it.tipo==="gasto"?(it.naturaleza==="directo"?'<span class="tag dir">Directo</span>':'<span class="tag ind">Indirecto</span>'):'';
      var who=[it.cliente,it.proveedor,it.persona].filter(Boolean).join(" · ");
      return '<tr data-id="'+it.id+'"'+(selected[it.id]?' class="sel"':'')+'>'+
        '<td class="chk"><input type="checkbox" class="rowchk" data-id="'+it.id+'"'+(selected[it.id]?" checked":"")+'></td>'+
        '<td><b>'+esc(it.concepto)+'</b>'+(who?' <span style="color:var(--ink-3)">· '+esc(who)+'</span>':'')+'</td>'+
        '<td>'+esc(it.categoria)+' '+natTag+'</td>'+
        '<td><span class="tag '+(it.tipo==="ingreso"?"ing":"gas")+'">'+(it.tipo==="ingreso"?"Ingreso":"Gasto")+'</span></td>'+
        '<td>'+freqTag+'</td><td class="r">'+eur2(it.importe)+'</td><td class="r"><b>'+eur2(annual)+'</b></td>'+
        '<td class="r"><span class="rowacts"><button class="rowact edit" data-id="'+it.id+'" title="Editar">✎</button><button class="rowact dup" data-id="'+it.id+'" title="Duplicar">⧉</button><button class="rowact del" data-id="'+it.id+'" title="Eliminar">✕</button></span></td></tr>';
    }).join("")||'<tr><td colspan="8" style="color:var(--ink-3)">Sin movimientos que cumplan el filtro.</td></tr>';
    $("#movCount").textContent=rows.length+" líneas · "+periodLabel()+(fltQ||fltTipo||fltNat?" · filtrado":"");
    $$("#movBody tr[data-id]").forEach(function(tr){
      tr.addEventListener("click",function(e){ if(e.target.closest(".rowact")||e.target.closest(".rowchk"))return; openEdit(tr.dataset.id); });
    });
    $$(".rowchk").forEach(function(c){ c.addEventListener("click",function(e){ e.stopPropagation();
      if(c.checked)selected[c.dataset.id]=1; else delete selected[c.dataset.id]; refreshSelUI(); }); });
    bindAll(".rowact.edit",function(id){openEdit(id);});
    bindAll(".rowact.dup",function(id){duplicate([id]);});
    bindAll(".rowact.del",function(id){removeItems([id]);});
    refreshSelUI();
  }
  function refreshSelUI(){
    var n=selCount(),vis=$$(".rowchk").length;
    $("#bulkBar").classList.toggle("show",n>0);
    $("#bulkCount").textContent=n+" seleccionado"+(n===1?"":"s");
    $("#chkAll").checked=vis>0&&n>=vis;
    $$("#movBody tr[data-id]").forEach(function(tr){ tr.classList.toggle("sel",!!selected[tr.dataset.id]); });
  }
  function clearSel(){ selected={}; movTable(); }
  function bindAll(sel,fn){ $$(sel).forEach(function(b){ b.addEventListener("click",function(e){e.stopPropagation();fn(b.dataset.id);}); }); }
  function esc(s){ return (s||"").replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];}); }

  function niceStep(max){ var raw=max/4,mag=Math.pow(10,Math.floor(Math.log10(raw))),n=raw/mag; return (n<1.5?1:n<3?2:n<7?5:10)*mag; }

  // ---- CRUD ----
  function duplicate(ids){ var n=0; ids.forEach(function(id){ var it=find(id); if(!it)return;
      var c=JSON.parse(JSON.stringify(it)); c.id=uid();
      if(c.freq==="puntual"&&c.mes) c.mes=addMonth(c.mes,c.periodicidad||1);
      state.items.push(c); n++; });
    if(!n)return; selected={}; persist(); render(); toast(n===1?"Duplicado":n+" duplicados"); }
  function removeItems(ids){
    var names=ids.map(function(id){var it=find(id);return it?it.concepto:"";}).filter(Boolean);
    var msg=ids.length===1?('¿Eliminar «'+names[0]+'»?'):('¿Eliminar '+ids.length+' movimientos seleccionados?');
    if(!confirm(msg))return;
    state.items=state.items.filter(function(x){return ids.indexOf(x.id)<0;});
    selected={}; persist(); render(); toast(ids.length===1?"Eliminado":ids.length+" eliminados"); }
  function find(id){ for(var i=0;i<state.items.length;i++) if(state.items[i].id===id) return state.items[i]; return null; }

  // ---- modal registro / edición ----
  var form={tipo:"ingreso",freq:"recurrente",naturaleza:"indirecto"}, editingId=null;
  function catsFor(tipo){ return mNames(tipo==="ingreso"?"categoriasIngreso":"categoriasGasto"); }
  function fillCats(sel){ var el=$("#fCategoria"); el.innerHTML=catsFor(form.tipo).map(function(c){return '<option'+(c===sel?" selected":"")+'>'+esc(c)+'</option>';}).join(""); if(sel&&catsFor(form.tipo).indexOf(sel)<0)el.innerHTML+='<option selected>'+esc(sel)+'</option>'; }
  function fillDatalists(){
    var dl=function(id,key){ $(id).innerHTML=mNames(key).map(function(v){return '<option value="'+esc(v)+'">';}).join(""); };
    dl("#dlConcepto",form.tipo==="ingreso"?"conceptosIngreso":"conceptosGasto");
    dl("#dlCliente","clientes"); dl("#dlProveedor","proveedores"); dl("#dlPersona","personas");
  }
  function fillPer(sel){ $("#fPer").innerHTML=PERS.map(function(p){return '<option value="'+p[0]+'"'+(p[0]===sel?" selected":"")+'>'+p[1]+'</option>';}).join(""); }
  function tgWire(id,key,onchange){ $$("#"+id+" button").forEach(function(b){ b.onclick=function(){ $$("#"+id+" button").forEach(function(x){x.setAttribute("aria-pressed","false");}); b.setAttribute("aria-pressed","true"); form[key]=b.dataset.v; if(onchange)onchange(); }; }); }
  function resetTg(id,v){ $$("#"+id+" button").forEach(function(b){ b.setAttribute("aria-pressed",b.dataset.v===v); }); }
  function syncFreqUI(){ var recu=form.freq==="recurrente";
    $("#lblImporte").textContent=recu?"Importe por periodo (€)":"Importe (€)";
    $("#lblMes").textContent=recu?"Desde (mes de alta)":"Mes";
    $("#fldHasta").classList.toggle("hidden",!recu);
    $("#fldRepeat").classList.toggle("hidden",recu||editingId!==null);
    $("#fldPer").classList.toggle("hidden",!recu&&editingId!==null); }
  function syncTipoUI(sel){ $("#fldNat").classList.toggle("hidden",form.tipo!=="gasto");
    $("#fldGasto").classList.toggle("hidden",form.tipo!=="gasto"); fillCats(sel); fillDatalists(); }
  function applyConceptoDefaults(){ // al elegir un concepto del maestro, rellena sus valores por defecto
    var rec=mFind(form.tipo==="ingreso"?"conceptosIngreso":"conceptosGasto",$("#fConcepto").value);
    if(!rec)return;
    if(rec.categoria) fillCats(rec.categoria);
    if(form.tipo==="gasto"){
      if(rec.naturaleza){ form.naturaleza=rec.naturaleza; resetTg("tgNat",rec.naturaleza); }
      if(rec.proveedor&&!$("#fProveedor").value) $("#fProveedor").value=rec.proveedor;
    }
  }

  function openCreate(){ editingId=null; form={tipo:"ingreso",freq:"recurrente",naturaleza:"indirecto"};
    $("#mTitle").textContent="Registrar movimiento"; $("#mDelete").classList.add("hidden");
    resetTg("tgTipo","ingreso"); resetTg("tgFreq","recurrente"); resetTg("tgNat","indirecto");
    $("#fImporte").value=""; $("#fConcepto").value=""; $("#fCliente").value=""; $("#fProveedor").value=""; $("#fPersona").value="";
    $("#fHasta").value=""; $("#fRepeat").value="1"; fillPer(1);
    $("#fMes").value=state.year+"-01"; syncTipoUI(); syncFreqUI(); $("#scrim").classList.add("open"); setTimeout(function(){$("#fImporte").focus();},60); }
  function openEdit(id){ var it=find(id); if(!it)return; editingId=id; form={tipo:it.tipo,freq:it.freq,naturaleza:it.naturaleza||"indirecto"};
    $("#mTitle").textContent="Editar movimiento"; $("#mDelete").classList.remove("hidden");
    resetTg("tgTipo",it.tipo); resetTg("tgFreq",it.freq); resetTg("tgNat",it.naturaleza||"indirecto");
    $("#fImporte").value=it.importe; $("#fConcepto").value=it.concepto; $("#fCliente").value=it.cliente||"";
    $("#fProveedor").value=it.proveedor||""; $("#fPersona").value=it.persona||""; fillPer(it.periodicidad||1);
    $("#fMes").value=it.freq==="recurrente"?(it.desde||state.year+"-01"):(it.mes||state.year+"-01"); $("#fHasta").value=it.hasta||"";
    syncTipoUI(it.categoria); syncFreqUI(); $("#scrim").classList.add("open"); }
  function closeModal(){ $("#scrim").classList.remove("open"); }
  function saveMov(){
    var imp=parseFloat($("#fImporte").value); if(!(imp>0)){ $("#fImporte").focus(); return; }
    var per=Math.max(1,parseInt($("#fPer").value,10)||1);
    var base={tipo:form.tipo,freq:form.freq,periodicidad:per,categoria:$("#fCategoria").value,
      concepto:($("#fConcepto").value.trim()||"(sin concepto)"),cliente:$("#fCliente").value.trim(),
      proveedor:form.tipo==="gasto"?$("#fProveedor").value.trim():"",persona:form.tipo==="gasto"?$("#fPersona").value.trim():"",
      importe:imp,naturaleza:form.naturaleza};
    // los valores nuevos alimentan los maestros
    addMaster("clientes",base.cliente); addMaster("proveedores",base.proveedor); addMaster("personas",base.persona);
    addMaster(base.tipo==="ingreso"?"conceptosIngreso":"conceptosGasto",base.concepto);
    if(editingId){ var it=find(editingId); Object.assign(it,base);
      if(form.freq==="recurrente"){ it.desde=$("#fMes").value||state.year+"-01"; it.hasta=$("#fHasta").value||""; it.mes=""; }
      else{ it.mes=$("#fMes").value||state.year+"-01"; it.desde=""; it.hasta=""; }
      persist(); closeModal(); render(); toast("Guardado"); return; }
    if(form.freq==="recurrente"){ var r=Object.assign({id:uid()},base,{desde:$("#fMes").value||state.year+"-01",hasta:$("#fHasta").value||"",mes:""}); state.items.push(r); }
    else{ var n=Math.max(1,Math.min(60,parseInt($("#fRepeat").value,10)||1)),mes=$("#fMes").value||state.year+"-01";
      for(var k=0;k<n;k++){ state.items.push(Object.assign({id:uid()},base,{mes:addMonth(mes,k*per),desde:"",hasta:""})); } }
    persist(); closeModal(); render();
    var reps=Math.max(1,parseInt($("#fRepeat").value,10)||1);
    toast(form.freq==="puntual"&&reps>1?reps+" apuntes creados":"Registrado");
  }

  // ---- edición en lote ----
  function openBulk(){
    var ids=Object.keys(selected); if(!ids.length)return;
    if(ids.length===1){ openEdit(ids[0]); return; }
    $("#bulkTitle").textContent="Editar "+ids.length+" movimientos";
    var noCh='<option value="">— no cambiar —</option>';
    var cats=mNames("categoriasIngreso").concat(mNames("categoriasGasto"));
    $("#bCategoria").innerHTML=noCh+cats.map(function(c){return '<option>'+esc(c)+'</option>';}).join("");
    $("#bCliente").innerHTML=noCh+'<option value="__clear__">(quitar cliente)</option>'+mNames("clientes").map(function(c){return '<option>'+esc(c)+'</option>';}).join("");
    $("#bProveedor").innerHTML=noCh+'<option value="__clear__">(quitar proveedor)</option>'+mNames("proveedores").map(function(c){return '<option>'+esc(c)+'</option>';}).join("");
    $("#bNat").value="";
    $("#scrimBulk").classList.add("open");
  }
  function saveBulk(){
    var ids=Object.keys(selected),cat=$("#bCategoria").value,cli=$("#bCliente").value,prov=$("#bProveedor").value,nat=$("#bNat").value,n=0;
    ids.forEach(function(id){ var it=find(id); if(!it)return; n++;
      if(cat)it.categoria=cat;
      if(cli)it.cliente=cli==="__clear__"?"":cli;
      if(prov)it.proveedor=prov==="__clear__"?"":prov;
      if(nat&&it.tipo==="gasto")it.naturaleza=nat; });
    $("#scrimBulk").classList.remove("open");
    if(n){ selected={}; persist(); render(); toast(n+" movimientos actualizados"); }
  }

  // ---- presupuesto ----
  function openBudget(){
    var Y=state.year,b=yearBudget(Y);
    $("#budTitle").textContent="Presupuesto · ejercicio "+Y;
    var html='<h4>Ingresos (objetivo anual)</h4>';
    html+=mNames("categoriasIngreso").map(function(c){return budRow(c,b[c]);}).join("");
    html+='<h4>Gastos (límite anual)</h4>';
    html+=mNames("categoriasGasto").map(function(c){return budRow(c,b[c]);}).join("");
    $("#budForm").innerHTML=html;
    wireBudForm();
    $("#scrimBud").classList.add("open");
  }
  function budRow(cat,val){
    var mensual=Array.isArray(val),anual=budAnual(val),iC=esc(cat);
    var meses=MONTHS.map(function(m,i){ var v=mensual?(val[i]||""):"";
      return '<span class="bm"><span>'+m+'</span><input type="number" inputmode="decimal" min="0" data-cat="'+iC+'" data-m="'+i+'" value="'+v+'" placeholder="0"></span>'; }).join("");
    return '<div class="budedit"><label>'+iC+'</label><div class="bwrap">'+
      '<input type="number" inputmode="decimal" min="0" step="100" data-cat="'+iC+'" data-anual value="'+(anual||"")+'" placeholder="—"'+(mensual?' readonly':'')+'>'+
      '<button type="button" class="bmes" data-cat="'+iC+'" aria-pressed="'+mensual+'" title="Detallar mes a mes">12</button></div></div>'+
      '<div class="budmeses'+(mensual?'':' hidden')+'" data-mgrid="'+iC+'">'+meses+'</div>';
  }
  function wireBudForm(){
    $$("#budForm .bmes").forEach(function(btn){ btn.onclick=function(){
      var cat=btn.dataset.cat,grid=$("#budForm [data-mgrid='"+cat.replace(/'/g,"\\'")+"']"),
          anualInp=$("#budForm input[data-anual][data-cat='"+cat.replace(/'/g,"\\'")+"']");
      var abrir=grid.classList.contains("hidden");
      grid.classList.toggle("hidden",!abrir);
      btn.setAttribute("aria-pressed",abrir);
      anualInp.readOnly=abrir;
      if(abrir){ // prellena con anual/12 si los meses están vacíos
        var inputs=$$("#budForm [data-mgrid='"+cat.replace(/'/g,"\\'")+"'] input");
        var vacios=inputs.every(function(i){return !i.value;});
        var anual=parseFloat(anualInp.value)||0;
        if(vacios&&anual>0){ var mensual=Math.round(anual/12*100)/100; inputs.forEach(function(i){i.value=mensual;}); }
      }
    }; });
    // el anual se recalcula como suma de los meses cuando hay detalle
    $$("#budForm .budmeses input").forEach(function(inp){ inp.addEventListener("input",function(){
      var cat=inp.dataset.cat,s=0;
      $$("#budForm [data-mgrid='"+cat.replace(/'/g,"\\'")+"'] input").forEach(function(i){ s+=parseFloat(i.value)||0; });
      $("#budForm input[data-anual][data-cat='"+cat.replace(/'/g,"\\'")+"']").value=Math.round(s*100)/100;
    }); });
  }
  function saveBudget(){
    var Y=String(state.year),b={};
    $$("#budForm input[data-anual]").forEach(function(inp){
      var cat=inp.dataset.cat,grid=$("#budForm [data-mgrid='"+cat.replace(/'/g,"\\'")+"']");
      if(grid&&!grid.classList.contains("hidden")){
        var arr=$$("#budForm [data-mgrid='"+cat.replace(/'/g,"\\'")+"'] input").map(function(i){return parseFloat(i.value)||0;});
        if(arr.some(function(v){return v>0;}))b[cat]=arr;
      } else { var v=parseFloat(inp.value); if(v>0)b[cat]=v; }
    });
    state.budget[Y]=b;
    $("#scrimBud").classList.remove("open");
    persist(); render(); toast("Presupuesto "+Y+" guardado");
  }

  // ---- maestros ----
  var masTab="clientes", masEdit=null; // null = sin formulario · -1 = ficha nueva · >=0 = editando ese índice
  function masterDef(key){ for(var i=0;i<MASTER_DEFS.length;i++) if(MASTER_DEFS[i].key===key) return MASTER_DEFS[i]; return MASTER_DEFS[0]; }
  function masterUsage(key,nombre){
    var field={clientes:"cliente",proveedores:"proveedor",personas:"persona"}[key],n=0;
    state.items.forEach(function(it){
      if(field){ if(it[field]===nombre)n++; return; }
      var tipo=key.indexOf("Ingreso")>=0?"ingreso":"gasto";
      if(it.tipo!==tipo)return;
      if(key.indexOf("conceptos")===0&&it.concepto===nombre)n++;
      if(key.indexOf("categorias")===0&&it.categoria===nombre)n++;
    });
    return n;
  }
  function renameMaster(key,oldN,newN){ // propaga el nuevo nombre a movimientos, presupuesto y fichas que lo referencian
    var field={clientes:"cliente",proveedores:"proveedor",personas:"persona"}[key];
    var tipo=key.indexOf("Ingreso")>=0?"ingreso":"gasto";
    state.items.forEach(function(it){
      if(field){ if(it[field]===oldN)it[field]=newN; return; }
      if(it.tipo!==tipo)return;
      if(key.indexOf("conceptos")===0&&it.concepto===oldN)it.concepto=newN;
      if(key.indexOf("categorias")===0&&it.categoria===oldN)it.categoria=newN;
    });
    if(key==="categoriasIngreso"||key==="categoriasGasto"){
      Object.keys(state.budget||{}).forEach(function(y){ var b=state.budget[y]; if(b&&b[oldN]!=null){ b[newN]=b[oldN]; delete b[oldN]; } });
      state.masters[key==="categoriasIngreso"?"conceptosIngreso":"conceptosGasto"].forEach(function(c){ if(c.categoria===oldN)c.categoria=newN; });
    }
    if(key==="proveedores") state.masters.conceptosGasto.forEach(function(c){ if(c.proveedor===oldN)c.proveedor=newN; });
  }
  function masFieldHtml(def,f,rec){
    var k=f[0],label=f[1],req=f[2],src=f[3],val=rec&&rec[k]||"";
    var inner;
    if(src==="NAT"){
      inner='<select id="mf_'+k+'"><option value="">—</option><option value="directo"'+(val==="directo"?" selected":"")+'>Directo</option><option value="indirecto"'+(val==="indirecto"?" selected":"")+'>Indirecto</option></select>';
    } else if(src){
      inner='<select id="mf_'+k+'"><option value="">—</option>'+mNames(src).map(function(n){return '<option'+(n===val?" selected":"")+'>'+esc(n)+'</option>';}).join("")+'</select>';
    } else {
      inner='<input id="mf_'+k+'" type="text" value="'+esc(val)+'" placeholder="'+(req?"":"—")+'">';
    }
    return '<div class="field"><label>'+label+(req?"":' <span style="color:var(--ink-3)">(opcional)</span>')+'</label>'+inner+'</div>';
  }
  function renderMasters(){
    $("#masTabs").innerHTML=MASTER_DEFS.map(function(def){
      return '<button data-k="'+def.key+'" aria-pressed="'+(def.key===masTab)+'">'+def.label+'</button>'; }).join("");
    $$("#masTabs button").forEach(function(b){ b.onclick=function(){ masTab=b.dataset.k; masEdit=null; renderMasters(); }; });
    var def=masterDef(masTab), list=state.masters[masTab];
    var rows=list.map(function(rec,i){
      var sub=def.fields.slice(1).map(function(f){ return rec[f[0]]||""; }).filter(Boolean).join(" · ");
      var uses=masterUsage(masTab,rec.nombre);
      return '<div class="mrow"><span class="mname">'+esc(rec.nombre)+'</span><span class="msub">'+esc(sub)+(uses?(sub?" · ":"")+uses+" mov.":"")+'</span>'+
        '<span class="rowacts"><button class="rowact medit" data-i="'+i+'" title="Editar">✎</button><button class="rowact del mdel" data-i="'+i+'" title="Eliminar">✕</button></span></div>';
    }).join("")||'<p class="hint">Sin fichas todavía.</p>';
    var html='<div class="mlist">'+rows+'</div>';
    if(masEdit===null){
      html+='<button class="btn" id="masNew">＋ Nueva ficha</button>';
    } else {
      var rec=masEdit>=0?list[masEdit]:null;
      html+='<div class="mform"><h4 style="margin-top:0">'+(rec?"Editar «"+esc(rec.nombre)+"»":"Nueva ficha · "+def.label)+'</h4>'+
        def.fields.map(function(f){return masFieldHtml(def,f,rec);}).join("")+
        '<div class="modal-actions" style="margin-bottom:8px"><button class="btn ghost" id="masCancel">Cancelar</button><button class="btn primary" id="masSave">Guardar ficha</button></div></div>';
    }
    $("#masBody").innerHTML=html;
    $$("#masBody .medit").forEach(function(b){ b.onclick=function(){ masEdit=+b.dataset.i; renderMasters(); var inp=$("#mf_nombre"); if(inp)inp.focus(); }; });
    $$("#masBody .mdel").forEach(function(b){ b.onclick=function(){
      var rec=list[+b.dataset.i],uses=masterUsage(masTab,rec.nombre);
      if(uses){ toast("En uso por "+uses+" movimiento"+(uses===1?"":"s")+" — reasígnalos antes de eliminar"); return; }
      if(!confirm('¿Eliminar «'+rec.nombre+'» de '+def.label.toLowerCase()+'?'))return;
      list.splice(+b.dataset.i,1); masEdit=null; persist(); renderMasters(); toast("Eliminado"); }; });
    var bn=$("#masNew"); if(bn)bn.onclick=function(){ masEdit=-1; renderMasters(); var inp=$("#mf_nombre"); if(inp)inp.focus(); };
    var bc=$("#masCancel"); if(bc)bc.onclick=function(){ masEdit=null; renderMasters(); };
    var bs=$("#masSave"); if(bs)bs.onclick=function(){
      var rec={}; def.fields.forEach(function(f){ var el=$("#mf_"+f[0]); rec[f[0]]=(el&&el.value||"").trim(); });
      if(!rec.nombre){ $("#mf_nombre").focus(); return; }
      var dup=-1; list.forEach(function(x,i){ if(i!==masEdit&&x.nombre.toLowerCase()===rec.nombre.toLowerCase())dup=i; });
      if(dup>=0){ toast("Ya existe una ficha con ese nombre"); return; }
      if(masEdit>=0){ var oldN=list[masEdit].nombre; list[masEdit]=rec; if(oldN!==rec.nombre)renameMaster(masTab,oldN,rec.nombre); }
      else list.push(rec);
      sortM(list); masEdit=null; persist(); renderMasters(); render(); toast("Ficha guardada");
    };
  }

  // ---- CSV ----
  var CSV_HEAD=["tipo","freq","periodicidad","categoria","concepto","cliente","proveedor","persona","importe","naturaleza","desde","hasta","mes"];
  function toCSV(){ var lines=[CSV_HEAD.join(";")];
    state.items.forEach(function(it){ lines.push([it.tipo,it.freq,it.periodicidad||1,it.categoria,'"'+(it.concepto||"").replace(/"/g,'""')+'"',it.cliente||"",it.proveedor||"",it.persona||"",String(it.importe).replace(".",","),it.naturaleza||"",it.desde||"",it.hasta||"",it.mes||""].join(";")); }); return lines.join("\n"); }
  function downloadCSV(){ var blob=new Blob([toCSV()],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a"); a.href=url; a.download="vimi_movimientos.csv"; a.click(); URL.revokeObjectURL(url); }
  function importCSV(text){ var rows=text.split(/\r?\n/).filter(function(l){return l.trim();});
    var head=(rows.shift()||"").split(";").map(function(h){return h.trim().toLowerCase();}),added=0;
    var idx=function(k){ var i=head.indexOf(k); return i; };
    var legacy=head.indexOf("periodicidad")<0; // formato antiguo: tipo;freq;categoria;concepto;cliente;importe;naturaleza;desde;hasta;mes
    rows.forEach(function(l){ var c=l.split(";"),g=function(k,d){ var i=idx(k); return i>=0&&c[i]!=null?c[i].trim():(d||""); };
      var it;
      if(legacy){ if(c.length<6)return;
        it={tipo:(c[0]||"").trim(),freq:(c[1]||"mensual").trim(),periodicidad:1,categoria:(c[2]||"").trim(),concepto:(c[3]||""),cliente:(c[4]||"").trim(),proveedor:"",persona:"",importe:parseFloat((c[5]||"0").replace(",",".")),naturaleza:(c[6]||"indirecto").trim(),desde:(c[7]||"").trim(),hasta:(c[8]||"").trim(),mes:(c[9]||"").trim()};
      } else {
        it={tipo:g("tipo"),freq:g("freq","recurrente"),periodicidad:parseInt(g("periodicidad","1"),10)||1,categoria:g("categoria"),concepto:g("concepto"),cliente:g("cliente"),proveedor:g("proveedor"),persona:g("persona"),importe:parseFloat(g("importe","0").replace(",",".")),naturaleza:g("naturaleza","indirecto"),desde:g("desde"),hasta:g("hasta"),mes:g("mes")};
      }
      it.id=uid(); it.concepto=(it.concepto||"").replace(/^"|"$/g,'').replace(/""/g,'"');
      if(it.importe>0){ state.items.push(normItem(it)); added++; } });
    harvestMasters(); persist(); render(); toast(added+" líneas importadas"); }

  // ---- sync UI ----
  function setSync(st){ var d=$("#syncDot"),b=$("#bannerTxt");
    if(!syncUrl){ d.className="syncdot"; b.innerHTML='<b>Modo local.</b> Datos en este dispositivo. Conecta la hoja de Google (⋯) para compartir con Bea. Cifras iniciales de ejemplo.'; return; }
    d.className="syncdot on";
    var msg={push:"Guardando en la hoja…",pull:"Leyendo la hoja…",ok:"Sincronizado con la hoja de Google.",err:"Sin conexión con la hoja — trabajando en local."}[st]||"";
    b.innerHTML='<b>'+msg+'</b> Compartido con Bea vía Google Sheets.'; }

  function yearsAvailable(){
    var ys={}; ys[state.year]=1; ys[new Date().getFullYear()]=1;
    state.items.forEach(function(it){ ["desde","hasta","mes"].forEach(function(k){ if(it[k])ys[+it[k].slice(0,4)]=1; }); });
    Object.keys(state.budget||{}).forEach(function(y){ ys[+y]=1; });
    var list=Object.keys(ys).map(Number).sort();
    var min=list[0],max=list[list.length-1],out=[];
    for(var y=min;y<=max;y++)out.push(y);
    return out;
  }
  function buildYears(){ var seg=$("#yearSeg"); seg.innerHTML="";
    yearsAvailable().forEach(function(y){ var b=document.createElement("button"); b.textContent=y; b.setAttribute("aria-pressed",y===state.year);
      b.onclick=function(){ state.year=y; saveLocal(); buildYears(); render(); }; seg.appendChild(b); }); }
  function buildQuarters(){ var seg=$("#qSeg"); seg.innerHTML="";
    [[0,"Año"],[1,"T1"],[2,"T2"],[3,"T3"],[4,"T4"]].forEach(function(q){ var b=document.createElement("button"); b.textContent=q[1];
      b.setAttribute("aria-pressed",(state.quarter||0)===q[0]);
      b.onclick=function(){ state.quarter=q[0]; saveLocal(); buildQuarters(); render(); }; seg.appendChild(b); }); }

  var toastT; function toast(m){ var el=$("#toast"); el.textContent=m; el.classList.add("show"); clearTimeout(toastT); toastT=setTimeout(function(){el.classList.remove("show");},1800); }

  var tip=$("#tip");
  function wireTips(sel){ $$(sel+" [data-tip]").forEach(function(el){
    el.addEventListener("mousemove",function(e){ tip.innerHTML=el.getAttribute("data-tip"); tip.style.opacity=1; var x=e.clientX+12,y=e.clientY+12; if(x+tip.offsetWidth>window.innerWidth-8)x=e.clientX-tip.offsetWidth-12; tip.style.left=x+"px"; tip.style.top=y+"px"; });
    el.addEventListener("mouseleave",function(){ tip.style.opacity=0; }); }); }

  // ---- wire ----
  $("#fab").onclick=openCreate; $("#addTop").onclick=openCreate;
  $("#mCancel").onclick=closeModal; $("#mSave").onclick=saveMov;
  $("#mDelete").onclick=function(){ if(editingId){ var it=find(editingId); if(confirm('¿Eliminar «'+it.concepto+'»?')){ state.items=state.items.filter(function(x){return x.id!==editingId;}); persist(); closeModal(); render(); toast("Eliminado"); } } };
  $("#scrim").addEventListener("click",function(e){ if(e.target===$("#scrim"))closeModal(); });
  tgWire("tgTipo","tipo",function(){syncTipoUI();}); tgWire("tgFreq","freq",syncFreqUI); tgWire("tgNat","naturaleza");
  $("#fConcepto").addEventListener("change",applyConceptoDefaults);

  // filtros y multiselección
  $("#fltQ").addEventListener("input",function(){ fltQ=this.value; movTable(); });
  $("#fltTipo").addEventListener("change",function(){ fltTipo=this.value; movTable(); });
  $("#fltNat").addEventListener("change",function(){ fltNat=this.value; movTable(); });
  $("#chkAll").addEventListener("click",function(){ var on=this.checked;
    $$(".rowchk").forEach(function(c){ if(on)selected[c.dataset.id]=1; else delete selected[c.dataset.id]; }); movTable(); });
  $("#bulkDel").onclick=function(){ removeItems(Object.keys(selected)); };
  $("#bulkDup").onclick=function(){ duplicate(Object.keys(selected)); };
  $("#bulkEdit").onclick=openBulk;
  $("#bulkClear").onclick=clearSel;
  $("#bCancel").onclick=function(){ $("#scrimBulk").classList.remove("open"); };
  $("#bSave").onclick=saveBulk;
  $("#scrimBulk").addEventListener("click",function(e){ if(e.target===$("#scrimBulk"))$("#scrimBulk").classList.remove("open"); });

  // presupuesto
  $("#budEditBtn").onclick=openBudget;
  $("#budCancel").onclick=function(){ $("#scrimBud").classList.remove("open"); };
  $("#budSave").onclick=saveBudget;
  $("#scrimBud").addEventListener("click",function(e){ if(e.target===$("#scrimBud"))$("#scrimBud").classList.remove("open"); });

  // maestros
  $("#mastersBtn").onclick=function(){ masEdit=null; renderMasters(); $("#scrimMas").classList.add("open"); };
  $("#masClose").onclick=function(){ masEdit=null; $("#scrimMas").classList.remove("open"); render(); };
  $("#scrimMas").addEventListener("click",function(e){ if(e.target===$("#scrimMas")){ masEdit=null; $("#scrimMas").classList.remove("open"); render(); } });

  // datos / sync
  $("#menuBtn").onclick=function(){ $("#syncUrl").value=syncUrl; $("#scrim2").classList.add("open"); };
  $("#mCancel2").onclick=function(){ $("#scrim2").classList.remove("open"); };
  $("#scrim2").addEventListener("click",function(e){ if(e.target===$("#scrim2"))$("#scrim2").classList.remove("open"); });
  $("#expBtn").onclick=downloadCSV;
  $("#impFile").onchange=function(e){ var f=e.target.files[0]; if(!f)return; var r=new FileReader(); r.onload=function(){ importCSV(r.result); $("#scrim2").classList.remove("open"); }; r.readAsText(f); };
  $("#seedBtn").onclick=function(){ if(confirm("¿Restaurar los datos de ejemplo? Se perderá lo introducido.")){ state=seed(); persist(); buildYears(); buildQuarters(); render(); $("#scrim2").classList.remove("open"); toast("Datos de ejemplo restaurados"); } };
  $("#wipeBtn").onclick=function(){ if(confirm("¿Vaciar todos los movimientos?")){ state.items=[]; selected={}; persist(); render(); $("#scrim2").classList.remove("open"); toast("Vaciado"); } };
  $("#syncConnect").onclick=function(){ var u=$("#syncUrl").value.trim(); if(!/^https:\/\/script\.google\.com\/.*\/exec$/.test(u)){ if(!confirm("La URL no parece un Apps Script /exec. ¿Conectar igualmente?"))return; } syncUrl=u; localStorage.setItem(LS_URL,u); $("#scrim2").classList.remove("open"); pullSheet().then(function(){ buildYears(); buildQuarters(); render(); toast("Conectado a la hoja"); }); };
  $("#syncOff").onclick=function(){ syncUrl=""; localStorage.removeItem(LS_URL); $("#scrim2").classList.remove("open"); setSync(); toast("Modo local"); };

  var curTheme=null;
  $("#themeBtn").onclick=function(){ var d=curTheme?curTheme==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches; curTheme=d?"light":"dark"; document.documentElement.setAttribute("data-theme",curTheme); render(); };
  window.addEventListener("resize",function(){ render(); });

  // ---- init ----
  // en local el hub cuelga de ../hub/; en Pages la carpeta dashboard es la raíz del sitio
  if(/\/dashboard\//.test(location.pathname))$("#hubLink").href="../hub/";
  setSync();
  buildYears();
  buildQuarters();
  render();
  if(syncUrl){ pullSheet().then(function(){ buildYears(); buildQuarters(); render(); }); }
})();
