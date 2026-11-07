const GASTOS = ["Gasolina","Óleo","Manutenção","Pneu","Peças","Documentos e IPVA","Seguro","Multa","Alimentação","Celular e internet","Outros"];
const ORIGENS = ["iFood","99","Uber","Lalamove","Particular","Gorjeta","Outros"];
const CHAVE = "corre-de-moto-v1";
const INTERVALO_OLEO = 1000; // km entre uma troca e outra
const AVISO_OLEO = 200; // começa a avisar quando faltar isso
const VALOR_MAX = 10000; // lançamento desse tamanho é km do painel digitado no lugar do dinheiro
const brl = v => (v<0?"-":"") + "R$ " + Math.abs(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const n1 = v => v.toLocaleString("pt-BR",{maximumFractionDigits:1});
const ymd = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const hoje = () => ymd(new Date());
const num = x => { const v=parseFloat(String(x==null?"":x).replace(",",".")); return isFinite(v)?Math.abs(v):0; };
const $ = id => document.getElementById(id);
const hodo = x => typeof x==="number" ? Math.round(x) : (parseInt(String(x||"").split(",")[0].replace(/\D/g,""),10)||0);
const fmtKm = v => Number(v).toLocaleString("pt-BR");
const falha = m => Object.assign(new Error(m),{aviso:m});
const recentes = (a,b) => String(b.data).localeCompare(String(a.data))||(b.criado||0)-(a.criado||0);
const aberto = () => todos.filter(l=>l.tipo==="km"&&l.kmInicial>0&&!l.kmFinal).sort(recentes)[0];
function esc(s){ const d=document.createElement("div"); d.textContent=s==null?"":String(s); return d.innerHTML; }

let todos=[], mes=hoje().slice(0,7);
const diasAbertos=new Set(), catsAbertas=new Set();
try{ todos=JSON.parse(localStorage.getItem(CHAVE))||[]; }catch{ todos=[]; }
function guardar(){ try{ localStorage.setItem(CHAVE,JSON.stringify(todos)); }catch{ mostrar("Não consegui guardar no celular. Libere espaço e tente de novo."); } }
if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(()=>{});
const novoId = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function adicionar(it){ const l={id:novoId(),...it}; todos=[...todos,l]; guardar(); return l; }
function apagar(id){ todos=todos.filter(l=>l.id!==id); guardar(); }

function nomeMes(m){ const [a,b]=m.split("-").map(Number); return new Date(a,b-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"}); }
function mudaMes(n){ const [a,b]=mes.split("-").map(Number); const d=new Date(a,b-1+n,1); mes=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); render(); }
$("ant").onclick=()=>mudaMes(-1); $("prox").onclick=()=>mudaMes(1);

const trocas = () => todos.filter(l=>l.troca).sort((a,b)=>b.hodometro-a.hodometro);
const kmAtual = () => Math.max(0,...todos.map(l=>Math.max(Number(l.kmFinal)||0,Number(l.kmInicial)||0,Number(l.hodometro)||0)));
function estadoOleo(){
  const u=trocas()[0]; if(!u) return null;
  const prox=u.hodometro+INTERVALO_OLEO, atual=Math.max(kmAtual(),u.hodometro);
  return {u,prox,atual,falta:prox-atual,rodado:atual-u.hodometro};
}
function textoOleo(){
  const e=estadoOleo();
  if(!e) return "Ainda não tem troca de óleo registrada.";
  if(e.falta>0) return `Próxima troca de óleo com ${fmtKm(e.prox)} km. Faltam ${fmtKm(e.falta)} km.`;
  return e.falta===0?`Hora de trocar o óleo: chegou em ${fmtKm(e.prox)} km.`:`Troca de óleo passou ${fmtKm(-e.falta)} km. Era com ${fmtKm(e.prox)} km.`;
}
const avisoOleo = () => { const e=estadoOleo(); return e&&e.falta<=AVISO_OLEO?textoOleo():""; };

function resumo(lista){
  const r={ganho:0,gasto:0,km:0,horas:0,litros:0};
  for(const l of lista){
    if(l.tipo==="ganho") r.ganho+=Number(l.valor)||0;
    else if(l.tipo==="gasto"){ r.gasto+=Number(l.valor)||0; r.litros+=Number(l.litros)||0; }
    else if(l.tipo==="km"){ r.km+=Number(l.km)||0; r.horas+=Number(l.horas)||0; }
  }
  r.lucro=r.ganho-r.gasto; return r;
}

function renderHodo(){
  const a=aberto(), f=todos.filter(l=>l.tipo==="km"&&l.kmFinal&&l.data===hoje()).sort(recentes)[0];
  const ult=kmAtual();
  if(a) $("hEstado").textContent=`Iniciado com ${fmtKm(a.kmInicial)} km`+(a.data===hoje()?"":` em ${a.data.slice(8,10)}/${a.data.slice(5,7)}`);
  else if(f) $("hEstado").textContent=`Hoje: ${fmtKm(f.kmInicial)} → ${fmtKm(f.kmFinal)} = ${n1(Number(f.km))} km`;
  else $("hEstado").textContent=ult?`Dia não iniciado. Último km: ${fmtKm(ult)}`:"Dia ainda não iniciado";
  $("hBtn").textContent=a?"Finalizar o dia":"Iniciar o dia";
}

const diaMes = d => String(d).slice(8,10)+"/"+String(d).slice(5,7);
const botaoApagar = l => `<button class="ed perigo" type="button" data-del="${esc(l.id)}">apagar</button>`;
function itemDetalhe(l,comDia){
  const dia=comDia?[diaMes(l.data)]:[];
  if(l.tipo==="km"){
    const tit=l.kmInicial?`${fmtKm(l.kmInicial)} → ${l.kmFinal?fmtKm(l.kmFinal):"…"}`:(l.descricao||(l.km?"Km rodado":"Horas trabalhadas"));
    const sub=[...dia]; if(l.kmInicial&&!l.kmFinal) sub.push("em aberto"); else if(l.km) sub.push(`${n1(Number(l.km))} km`); if(l.horas) sub.push(n1(Number(l.horas))+" h");
    return `<li><div><b>${esc(tit)}</b><small>${esc(sub.join(" · "))}</small>${botaoApagar(l)}</div></li>`;
  }
  const sub=[...dia]; if(l.descricao) sub.push(l.categoria); if(l.litros) sub.push(n1(Number(l.litros))+" L"); if(l.pagamento) sub.push(l.pagamento);
  const ganho=l.tipo==="ganho";
  return `<li><div><b>${esc(l.descricao||l.categoria||"—")}</b>${sub.length?`<small>${esc(sub.join(" · "))}</small>`:""}<button class="ed" type="button" data-edit="${esc(l.id)}">${l.descricao?"editar":"descrever"}</button>${botaoApagar(l)}</div><span class="num ${ganho?"g":"b"}">${ganho?"+":"−"} ${esc(brl(Number(l.valor)||0).replace("R$ ",""))}</span></li>`;
}
function editarDescricao(e){
  const b=e.target.closest("button[data-edit]"); if(!b) return false;
  const l=todos.find(x=>x.id===b.dataset.edit); if(!l) return true;
  const novo=window.prompt("O que foi esse lançamento?",l.descricao||"");
  if(novo!==null){ l.descricao=novo.trim().slice(0,120); guardar(); render(); }
  return true;
}
function textoDia(d){
  const lista=todos.filter(l=>l.data===d).sort((a,b)=>(a.criado||0)-(b.criado||0)), r=resumo(lista);
  if(!lista.length) return `Nada lançado em ${diaMes(d)}.`;
  const itens=lista.filter(l=>l.tipo!=="km").map(l=>`${l.tipo==="ganho"?"+":"−"} ${brl(Number(l.valor)||0)}: ${l.descricao||l.categoria}`);
  return [`Dia ${diaMes(d)}: ganhou ${brl(r.ganho)}, gastou ${brl(r.gasto)}, rodou ${n1(r.km)} km.`,...itens].join("\n");
}

function renderOleo(){
  const e=estadoOleo(), lista=trocas();
  $("oProx").textContent=e?fmtKm(e.prox)+" km":"—";
  $("oEstado").textContent=e?(e.falta>0?`Faltam ${fmtKm(e.falta)} km`:e.falta===0?"Hora de trocar":`Passou ${fmtKm(-e.falta)} km`):"Nenhuma troca registrada";
  $("oleo").classList.toggle("alerta",!!e&&e.falta<=AVISO_OLEO);
  $("oBarra").style.width=e?Math.min(100,e.rodado/INTERVALO_OLEO*100).toFixed(1)+"%":"0";
  $("oRodado").textContent=e?`Rodou ${fmtKm(e.rodado)} de ${fmtKm(INTERVALO_OLEO)} km desde a última troca`:"Fale: óleo trocado com 76128, 40 reais no crédito";
  $("oHist").innerHTML=lista.slice(0,5).map((l,i)=>{
    const ant=lista[i+1], partes=[String(l.data).slice(8,10)+"/"+String(l.data).slice(5,7),fmtKm(l.hodometro)+" km"];
    if(l.valor) partes.push(brl(Number(l.valor)));
    if(l.pagamento) partes.push(l.pagamento);
    if(ant) partes.push(`${fmtKm(l.hodometro-ant.hodometro)} km depois da anterior`);
    return `<li>${esc(partes.join(" · "))}</li>`;
  }).join("");
}

function render(){
  renderHodo();
  renderOleo();
  $("mesNome").textContent=nomeMes(mes);
  const doMes=todos.filter(l=>String(l.data||"").startsWith(mes)).sort(recentes);
  const t=resumo(doMes);
  $("tLucro").textContent=brl(t.lucro); $("tLucro").className=t.lucro<0?"neg":"pos";
  $("tGanho").textContent=brl(t.ganho); $("tGasto").textContent=brl(t.gasto);
  $("tKm").textContent=String(Math.round(t.km)).padStart(6,"0");
  $("iLucroKm").textContent=t.km?brl(t.lucro/t.km):"—";
  $("iCustoKm").textContent=t.km?brl(t.gasto/t.km):"—";
  $("iHora").textContent=t.horas?brl(t.lucro/t.horas):"—";
  $("iCons").textContent=(t.km&&t.litros)?n1(t.km/t.litros)+" km/l":"—";

  const dias={}; for(const l of doMes){ (dias[l.data]=dias[l.data]||[]).push(l); }
  const chaves=Object.keys(dias).sort().reverse();
  $("dias").innerHTML=chaves.length?chaves.map(d=>{ const r=resumo(dias[d]);
    const aberto_=diasAbertos.has(d);
    const det=aberto_?`<tr class="det"><td colspan="6"><ul class="lista">${dias[d].slice().sort((a,b)=>(a.criado||0)-(b.criado||0)).map(l=>itemDetalhe(l)).join("")}</ul></td></tr>`:"";
    return `<tr class="dia" data-dia="${esc(d)}"><td class="num"><span class="seta">${aberto_?"▾":"▸"}</span> ${esc(d.slice(8,10)+"/"+d.slice(5,7))}</td><td class="r num">${r.km?n1(r.km):"—"}</td><td class="r num">${r.horas?n1(r.horas):"—"}</td><td class="r num g">${brl(r.ganho).replace("R$ ","")}</td><td class="r num b">${brl(r.gasto).replace("R$ ","")}</td><td class="r num ${r.lucro<0?"b":"g"}">${brl(r.lucro).replace("R$ ","")}</td></tr>${det}`; }).join("")
    :`<tr><td colspan="6" class="vazio">Nada em ${esc(nomeMes(mes))} ainda. Toque em Falar e diga com quantos km a moto começou.</td></tr>`;

  const porCat={}; for(const l of doMes) if(l.tipo==="gasto"){ const c=l.categoria||"Outros"; porCat[c]=(porCat[c]||0)+(Number(l.valor)||0); }
  const cats=Object.entries(porCat).sort((a,b)=>b[1]-a[1]); const max=cats.length?cats[0][1]:1;
  $("cats").innerHTML=cats.length?cats.map(([c,v])=>`<details class="catd" data-cat="${esc(c)}"${catsAbertas.has(c)?" open":""}><summary><div class="cat"><span>${esc(c)}</span><div class="bar"><i style="width:${(v/max*100).toFixed(1)}%"></i></div><span class="num">${brl(v)}</span></div></summary><ul class="lista">${doMes.filter(l=>l.tipo==="gasto"&&(l.categoria||"Outros")===c).map(l=>itemDetalhe(l,true)).join("")}</ul></details>`).join("")
    :`<p class="dica">Nenhum gasto em ${esc(nomeMes(mes))}.</p>`;

  $("linhas").innerHTML=doMes.length?doMes.map(l=>{
    const km=l.tipo==="km";
    const val=km?(l.kmInicial&&!l.kmFinal?"em aberto":`${n1(Number(l.km)||0)} km${l.horas?" · "+n1(Number(l.horas))+" h":""}`):`${l.tipo==="ganho"?"+":"−"} ${brl(Number(l.valor)||0).replace("R$ ","")}`;
    const tit=l.descricao||(km?(l.kmInicial?`${fmtKm(l.kmInicial)} → ${l.kmFinal?fmtKm(l.kmFinal):"…"}`:"Km rodado"):l.categoria)||"—";
    const extra=(l.litros?` · ${n1(Number(l.litros))} L`:"")+(l.pagamento?` · ${l.pagamento}`:"");
    return `<tr><td class="num">${esc(String(l.data).slice(8,10)+"/"+String(l.data).slice(5,7))}</td><td>${esc(tit)}${esc(extra)}</td><td><span class="chip">${esc(km?"Km":(l.categoria||"Outros"))}</span></td><td class="r num ${km?"":(l.tipo==="ganho"?"g":"b")}">${esc(val)}</td><td class="x"><button data-del="${esc(l.id)}" aria-label="Apagar lançamento">✕</button></td></tr>`;
  }).join(""):`<tr><td colspan="5" class="vazio">Nada lançado em ${esc(nomeMes(mes))}.</td></tr>`;
}

$("dias").addEventListener("click",e=>{
  if(editarDescricao(e)) return;
  const tr=e.target.closest("tr[data-dia]"); if(!tr) return;
  const d=tr.dataset.dia; if(diasAbertos.has(d)) diasAbertos.delete(d); else diasAbertos.add(d); render();
});
$("cats").addEventListener("click",e=>{ if(editarDescricao(e)) e.preventDefault(); });
$("cats").addEventListener("toggle",e=>{ const c=e.target.dataset&&e.target.dataset.cat; if(!c) return; if(e.target.open) catsAbertas.add(c); else catsAbertas.delete(c); },true);

// apagar pede um segundo toque e ainda deixa desfazer
document.addEventListener("click",e=>{
  const b=e.target.closest("button[data-del]"); if(!b) return;
  if(b.dataset.ok!=="1"){ const antes=b.textContent; b.dataset.ok="1"; b.textContent=antes==="✕"?"apagar?":"toque de novo pra apagar"; b.style.color="var(--bad)"; setTimeout(()=>{ if(b.isConnected){ b.dataset.ok=""; b.textContent=antes; b.style.color=""; } },3000); return; }
  const l=todos.find(x=>x.id===b.dataset.del); if(!l) return;
  apagar(l.id); render();
  mostrar(`Apaguei: ${l.descricao||l.categoria||"lançamento"}${l.valor?" "+brl(Number(l.valor)):""}.`,[()=>{ todos=[...todos,l]; guardar(); }]);
});

function iniciar(valor,data){
  const v=hodo(valor), dia=/^\d{4}-\d{2}-\d{2}$/.test(data||"")?data:hoje();
  if(!v) throw falha("Coloque o km que está no painel da moto.");
  const a=aberto();
  if(a&&a.data!==dia) throw falha(`O dia ${a.data.slice(8,10)}/${a.data.slice(5,7)} ainda está aberto. Finalize ele antes de iniciar outro.`);
  if(a){ const antes=a.kmInicial; a.kmInicial=v; guardar(); return {txt:`Início corrigido: ${fmtKm(v)} km`,desfazer:()=>{ a.kmInicial=antes; guardar(); }}; }
  const l=adicionar({data:dia,tipo:"km",kmInicial:v,kmFinal:0,km:0,horas:0,descricao:"",criado:Date.now()});
  return {txt:`Dia iniciado com ${fmtKm(v)} km`,desfazer:()=>apagar(l.id)};
}
function finalizar(valor,horas){
  const v=hodo(valor), a=aberto();
  if(!a) throw falha("Não achei o dia iniciado. Fale primeiro com quantos km a moto começou.");
  if(!v) throw falha("Coloque o km que está no painel da moto.");
  if(v<=a.kmInicial) throw falha(`O km final precisa ser maior que o inicial, ${fmtKm(a.kmInicial)}.`);
  a.kmFinal=v; a.km=v-a.kmInicial; a.horas=Math.round(num(horas)*10)/10; guardar();
  return {txt:`Dia finalizado: ${fmtKm(a.kmInicial)} → ${fmtKm(v)} = ${fmtKm(a.km)} km`,desfazer:()=>{ a.kmFinal=0; a.km=0; a.horas=0; guardar(); }};
}
$("hBtn").onclick=()=>{
  try{ const x=aberto()?finalizar($("hKm").value):iniciar($("hKm").value); $("hKm").value=""; render(); const av=avisoOleo(); mostrar(x.txt+(av?"\n"+av:""),[x.desfazer]); }
  catch(e){ mostrar(e.aviso||"Não consegui salvar. Tente de novo."); }
};

function registrarTroca(it){
  let km=hodo(it.hodometro); const estimado=!km;
  if(estimado) km=kmAtual();
  if(!km) throw falha("Fale o km do painel junto. Exemplo: óleo trocado com 76128, 40 reais.");
  const u=trocas()[0];
  if(u&&km<=u.hodometro) throw falha(`O km da troca precisa ser maior que o da última, ${fmtKm(u.hodometro)}.`);
  const valor=Math.round(num(it.valor)*100)/100;
  const l=adicionar({data:/^\d{4}-\d{2}-\d{2}$/.test(it.data||"")?it.data:hoje(),tipo:"gasto",categoria:"Óleo",valor,troca:true,hodometro:km,pagamento:it.pagamento||"",descricao:`Troca de óleo com ${fmtKm(km)} km`,criado:Date.now()});
  mes=l.data.slice(0,7);
  const txt=`Troca de óleo com ${fmtKm(km)} km`+(valor?`, ${brl(valor)}`:"")+(l.pagamento?`, ${l.pagamento}`:"")+`. Próxima com ${fmtKm(km+INTERVALO_OLEO)} km.`+(estimado?" Usei o último km anotado.":"");
  return {txt,desfazer:()=>apagar(l.id)};
}
$("oBtn").onclick=()=>{
  try{ const x=registrarTroca({hodometro:$("oKm").value,valor:$("oValor").value,pagamento:$("oPag").value}); $("oKm").value=""; $("oValor").value=""; $("oPag").value=""; render(); mostrar(x.txt,[x.desfazer]); }
  catch(e){ mostrar(e.aviso||"Não consegui salvar. Tente de novo."); }
};

function normaliza(it){
  const tipo=["ganho","gasto","km"].includes(it.tipo)?it.tipo:"gasto";
  const o={ data:/^\d{4}-\d{2}-\d{2}$/.test(it.data||"")?it.data:hoje(), tipo, descricao:String(it.descricao||"").slice(0,120), criado:Date.now() };
  if(tipo==="km"){ o.km=Math.round(num(it.km)*10)/10; o.horas=Math.round(num(it.horas)*10)/10; }
  else { o.valor=Math.round(num(it.valor)*100)/100; const lista=tipo==="ganho"?ORIGENS:GASTOS; o.categoria=lista.includes(it.categoria)?it.categoria:"Outros"; if(tipo==="gasto"&&num(it.litros)) o.litros=Math.round(num(it.litros)*100)/100; if(tipo==="gasto"&&it.pagamento) o.pagamento=it.pagamento; }
  return o;
}
const valido = i => i.tipo==="km" ? i.km>0 : i.valor>0;

function ajustaForm(){
  const t=$("fTipo").value, km=t==="km";
  $("lValor").hidden=km; $("lCat").hidden=km; $("lKm").hidden=!km; $("lHoras").hidden=!km; $("lLitros").hidden=t!=="gasto";
  $("lCat").firstChild.textContent=t==="ganho"?"Origem":"Tipo de gasto";
  $("fCat").innerHTML=(t==="ganho"?ORIGENS:GASTOS).map(c=>`<option>${c}</option>`).join("");
}
$("fTipo").onchange=ajustaForm; ajustaForm(); $("fData").value=hoje();

$("form").addEventListener("submit",e=>{
  e.preventDefault();
  const it=normaliza({tipo:$("fTipo").value,data:$("fData").value,valor:$("fValor").value,categoria:$("fCat").value,litros:$("fLitros").value,km:$("fKm").value,horas:$("fHoras").value,descricao:$("fDesc").value});
  if(!valido(it)) return mostrar(it.tipo==="km"?"Coloque quantos km rodou.":"Coloque um valor maior que zero.");
  if(it.tipo!=="km"&&it.valor>=VALOR_MAX) return mostrar("Esse valor parece o km do painel. Coloque aqui o valor em reais.");
  adicionar(it); for(const id of ["fValor","fLitros","fKm","fHoras","fDesc"]) $(id).value=""; mes=it.data.slice(0,7); render(); mostrar("Salvo.");
});

function mostrar(txt,desfazer){
  const r=$("resp"); r.hidden=false; r.textContent=txt;
  if(desfazer&&desfazer.length){ const a=document.createElement("div"); a.className="acoes"; const b=document.createElement("button"); b.textContent="Desfazer";
    b.onclick=()=>{ b.disabled=true; for(const f of desfazer.slice().reverse()) f(); render(); r.textContent="Desfeito."; }; a.append(b); r.append(a); }
}
function falar(txt){
  if(!("speechSynthesis" in window)) return;
  const u=new SpeechSynthesisUtterance(txt.replace(/→/g,"até").replace(/R\$ /g,"").replace(/[−+·]/g," ")); u.lang="pt-BR"; speechSynthesis.cancel(); speechSynthesis.speak(u);
}
const linhaItem = i => i.tipo==="km" ? `${n1(i.km)} km${i.horas?" em "+n1(i.horas)+" h":""}` : `${i.tipo==="ganho"?"Ganho":"Gasto"} ${brl(i.valor)}, ${i.categoria}${i.descricao?": "+i.descricao:""}${i.litros?", "+n1(i.litros)+" litros":""}${i.pagamento?", "+i.pagamento:""}`;

function respondePeriodo(p){
  const h=hoje(); let lista, nome;
  if(p==="hoje"){ lista=todos.filter(l=>l.data===h); nome="Hoje"; }
  else if(p==="ontem"){ const d=new Date(); d.setDate(d.getDate()-1); const o=ymd(d); lista=todos.filter(l=>l.data===o); nome="Ontem"; }
  else if(p==="semana"){ const d=new Date(); d.setDate(d.getDate()-((d.getDay()+6)%7)); const ini=ymd(d); lista=todos.filter(l=>l.data>=ini&&l.data<=h); nome="Nesta semana"; }
  else { lista=todos.filter(l=>String(l.data).startsWith(h.slice(0,7))); nome="Neste mês"; }
  const r=resumo(lista);
  return `${nome}: lucro de ${brl(r.lucro)}. Ganhou ${brl(r.ganho)}, gastou ${brl(r.gasto)} e rodou ${n1(r.km)} km.`;
}

let ultimoComando={txt:"",quando:0};
const REPETICAO_MS=120000; // mesma frase nesse intervalo costuma ser envio repetido
function comando(texto,forcar){
  const txt=String(texto||"").trim(); if(!txt) return;
  const r=interpretar(txt,hoje());
  if(r.pergunta==="dia"){ const a=textoDia(r.data); mes=r.data.slice(0,7); diasAbertos.add(r.data); render(); mostrar(a); falar(a); $("cmd").value=""; return; }
  if(r.pergunta){ const a=r.pergunta==="oleo"?textoOleo():respondePeriodo(r.pergunta); mostrar(a); falar(a); $("cmd").value=""; return; }
  const especiais=["inicio","fim","troca"];
  const chaveTxt=txt.toLowerCase();
  if(!forcar&&r.itens.length&&ultimoComando.txt===chaveTxt&&Date.now()-ultimoComando.quando<REPETICAO_MS){
    mostrar("Você acabou de lançar essa mesma frase. Não lancei de novo.");
    const a=document.createElement("div"); a.className="acoes"; const b=document.createElement("button"); b.textContent="Lançar mesmo assim"; b.onclick=()=>comando(txt,true); a.append(b); $("resp").append(a);
    falar("Essa frase já foi lançada."); $("cmd").value=""; return;
  }
  // o ditado às vezes repete o trecho: o mesmo gasto duas vezes na frase vale uma vez só
  const vistos=new Set(); let repetidos=0;
  const itens=r.itens.filter(i=>!especiais.includes(i.tipo)).map(normaliza).filter(valido).filter(i=>{
    if(i.tipo!=="gasto"&&i.tipo!=="ganho") return true;
    const k=[i.tipo,i.valor,i.categoria,i.data].join("|"); if(vistos.has(k)){ repetidos++; return false; } vistos.add(k); return true;
  });
  const odos=r.itens.filter(i=>especiais.includes(i.tipo));
  const desfazer=[], linhas=[];
  try{
    for(const o of odos){ const x=o.tipo==="troca"?registrarTroca(o):o.tipo==="inicio"?iniciar(o.hodometro,o.data):finalizar(o.hodometro,o.horas); desfazer.push(x.desfazer); linhas.push(x.txt); }
  }catch(e){ for(const f of desfazer.slice().reverse()) f(); render(); const m=e.aviso||"Não consegui salvar."; mostrar(m); falar(m); return; }
  for(const it of itens){ const l=adicionar(it); desfazer.push(()=>apagar(l.id)); linhas.push(linhaItem(it)); }
  if(r.horasSoltas){
    const k=todos.filter(l=>l.tipo==="km"&&l.data===r.data).sort(recentes)[0];
    if(k){ const antes=k.horas; k.horas=r.horasSoltas; guardar(); desfazer.push(()=>{ k.horas=antes; guardar(); }); }
    else { const l=adicionar({data:r.data,tipo:"km",km:0,horas:r.horasSoltas,descricao:"",criado:Date.now()}); desfazer.push(()=>apagar(l.id)); }
    linhas.push(`${n1(r.horasSoltas)} horas trabalhadas`);
  }
  if(!linhas.length&&r.kmPainel){ const m=`${fmtKm(r.kmPainel)} é km do painel, não dinheiro. Fale o valor também. Exemplo: abasteci 30 reais com ${fmtKm(r.kmPainel)}.`; mostrar(m); falar("Faltou o valor em reais. Fale de novo."); return; }
  if(!linhas.length){ const m=`Não entendi: "${txt}". Tente assim: ganhei 210 no iFood.`; mostrar(m); falar("Não entendi. Fale de novo."); return; }
  if(repetidos) linhas.push("O valor veio repetido na frase, lancei uma vez só.");
  ultimoComando={txt:chaveTxt,quando:Date.now()};
  if(odos.length&&!odos.some(o=>o.tipo==="troca")){ const av=avisoOleo(); if(av) linhas.push(av); }
  $("cmd").value=""; if(itens[0]) mes=itens[0].data.slice(0,7); else if(r.horasSoltas) mes=r.data.slice(0,7); render();
  const fim=r.naoEntendi.length?`\nNão entendi: ${r.naoEntendi.join("; ")}`:"";
  mostrar(linhas.join("\n")+fim,desfazer); falar(linhas.join(". "));
}
$("enviar").onclick=()=>comando($("cmd").value);
$("cmd").addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); comando($("cmd").value); } });

// microfone: toca, fala, e ao terminar a frase ele já lança
const Reconhecer=window.SpeechRecognition||window.webkitSpeechRecognition;
let ouvindo=null;
$("falar").onclick=()=>{
  if(ouvindo){ ouvindo.stop(); return; }
  if(!Reconhecer){ mostrar("Este navegador não tem reconhecimento de voz. Abra pelo Chrome."); return; }
  if("speechSynthesis" in window) speechSynthesis.cancel();
  const rec=new Reconhecer(); rec.lang="pt-BR"; rec.interimResults=true; rec.continuous=false; rec.maxAlternatives=1;
  let final="", erro="";
  rec.onstart=()=>{ ouvindo=rec; $("falar").classList.add("ouvindo"); $("falarTxt").textContent="Ouvindo… toque pra parar"; };
  rec.onresult=e=>{ let parcial=""; final=""; for(const x of e.results){ if(x.isFinal) final+=x[0].transcript; else parcial+=x[0].transcript; } $("cmd").value=final||parcial; };
  rec.onerror=e=>{ erro=e.error; };
  rec.onend=()=>{
    ouvindo=null; $("falar").classList.remove("ouvindo"); $("falarTxt").textContent="Falar";
    if(erro==="not-allowed"||erro==="service-not-allowed") return mostrar("O microfone está bloqueado. Toque no cadeado ao lado do endereço, ou nas permissões do app, e libere o microfone.");
    if(erro==="network") return mostrar("O reconhecimento de voz precisa de internet. Confira sua conexão e tente de novo.");
    const texto=final||$("cmd").value;
    if(texto.trim()) comando(texto); else if(erro==="no-speech"||!erro) mostrar("Não ouvi nada. Toque em Falar e tente de novo.");
  };
  try{ rec.start(); }catch{ mostrar("Não consegui ligar o microfone. Tente de novo."); }
};

// backup: como os dados ficam só neste celular, dá pra salvar uma cópia e restaurar depois
$("bkSalvar").onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(todos)],{type:"application/json"}));
  const a=document.createElement("a"); a.href=url; a.download=`corre-de-moto-${hoje()}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),5000);
  mostrar("Backup salvo na pasta de downloads do celular.");
};
$("bkArquivo").onchange=async e=>{
  const f=e.target.files[0]; if(!f) return;
  try{ const d=JSON.parse(await f.text()); if(!Array.isArray(d)) throw 0; const ids=new Set(todos.map(l=>l.id)); const novos=d.filter(l=>l&&l.id&&!ids.has(l.id)); todos=[...todos,...novos]; guardar(); render(); mostrar(`Backup restaurado: ${novos.length} registros novos.`); }
  catch{ mostrar("Esse arquivo não é um backup do Corre de Moto."); }
  e.target.value="";
};

// conserta lançamentos antigos em que o km do painel entrou como dinheiro; o número original fica guardado
function consertarKmComoDinheiro(){
  const errados=todos.filter(l=>(l.tipo==="gasto"||l.tipo==="ganho")&&Number(l.valor)>=VALOR_MAX);
  for(const l of errados){ l.valorOriginal=l.valor; l.descricao=[l.descricao,`Valor a corrigir: ${fmtKm(l.valor)} era km, não dinheiro`].filter(Boolean).join(" · "); l.valor=0; }
  if(errados.length) guardar();
  return errados.length;
}
const consertados=consertarKmComoDinheiro();
render();
if(consertados) mostrar(`Corrigi ${consertados===1?"1 lançamento":consertados+" lançamentos"} em que o km do painel tinha entrado como dinheiro. Veja em Lançamentos do mês.`);
// link que lança ganhos com um toque: #ganhos=Uber~2026-11-02_130.21_3.87_11_3h52_12~...
// cada dia: data_total_horas_viagens_online_promoção. Fica depois do #, então não vai pro servidor.
function lerLinkGanhos(){
  const m=decodeURIComponent(location.hash).match(/^#ganhos=([^~]+)~(.+)$/); if(!m) return;
  history.replaceState(null,"",location.pathname+location.search);
  const origem=ORIGENS.includes(m[1])?m[1]:"Outros", br=v=>v.toFixed(2).replace(".",","), novos=[], ids=new Set(todos.map(l=>l.id));
  for(const dia of m[2].split("~")){
    const [d,total,horas,viagens,online,promo]=dia.split("_"), v=Number(total), h=Number(horas), p=Number(promo)||0;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!(v>0&&v<VALOR_MAX)) continue;
    const extra=p?` (${br(v-p)} + ${br(p)} de promoção)`:"", criado=Date.now()+novos.length;
    novos.push({id:`video-ganho-${d}`,data:d,tipo:"ganho",valor:v,categoria:origem,descricao:`${viagens} viagens, ${online} online${extra}`,criado});
    if(h>0) novos.push({id:`video-horas-${d}`,data:d,tipo:"km",km:0,horas:h,descricao:`${online} online`,criado:criado+1});
  }
  const entrar=novos.filter(l=>!ids.has(l.id));
  if(!entrar.length) return mostrar("Esses ganhos já estavam lançados. Nada mudou.");
  todos=[...todos,...entrar]; guardar(); mes=entrar[0].data.slice(0,7); render();
  const soma=entrar.filter(l=>l.tipo==="ganho"), total=soma.reduce((t,l)=>t+l.valor,0), saem=new Set(entrar.map(l=>l.id));
  mostrar(`Lancei ${soma.length} ${soma.length===1?"dia":"dias"} de ganhos: ${brl(total)}.`,[()=>{ todos=todos.filter(l=>!saem.has(l.id)); guardar(); }]);
}
lerLinkGanhos();
window.addEventListener("hashchange",lerLinkGanhos);
if("serviceWorker" in navigator&&location.protocol==="https:") navigator.serviceWorker.register("sw.js").catch(()=>{});
