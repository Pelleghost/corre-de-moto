// Entende frases faladas em português e transforma em lançamentos. Roda no próprio celular, sem IA.
(function(){
  const PALAVRAS={dez:10,quinze:15,vinte:20,trinta:30,quarenta:40,cinquenta:50,sessenta:60,setenta:70,oitenta:80,noventa:90,cem:100,duzentos:200,trezentos:300,quatrocentos:400,quinhentos:500};
  const GASTOS=[
    [/gasolina|abasteci|abastecer|combustivel|posto/,"Gasolina"],
    [/\boleo\b/,"Óleo"],
    [/pneu|camara de ar|borracheiro/,"Pneu"],
    [/manutencao|mecanico|oficina|revisao|freio|pastilha|relacao|lavagem|lavei/,"Manutenção"],
    [/\bpecas?\b|corrente|lampada|retrovisor|bateria/,"Peças"],
    [/ipva|licenciamento|documento|emplacamento/,"Documentos e IPVA"],
    [/seguro/,"Seguro"],
    [/multa/,"Multa"],
    [/almoco|almocei|lanche|lanchei|comida|janta|jantei|cafe|marmita|agua/,"Alimentação"],
    [/\bchip\b|recarga|celular|internet/,"Celular e internet"],
  ];
  const ORIGENS=[
    [/\bi ?food\b/,"iFood"],
    [/\b(?:no|na|do|da|pelo|pela|de)\s+99\b|\b99 ?(?:food|moto|entrega)\b/,"99"],
    [/\buber\b/,"Uber"],
    [/\blalamove\b|\blala move\b/,"Lalamove"],
    [/\bparticular\b/,"Particular"],
    [/\bgorjeta\b/,"Gorjeta"],
  ];
  const PAGAMENTOS=[
    [/\b(?:no|na|pelo|com)\s+(?:cartao\s+de\s+)?credito\b|\bcartao\b(?!\s+de\s+debito)/,"Crédito"],
    [/\b(?:no|na|pelo|com)\s+(?:cartao\s+de\s+)?debito\b/,"Débito"],
    [/\bpix\b/,"Pix"],
    [/\bem dinheiro\b|\ba vista\b/,"Dinheiro"],
  ];
  // o que vem depois da frase da troca e já é outro assunto
  const OUTRO_ASSUNTO=/ganhei|recebi|faturei|inici|comec|termin|finaliz|abasteci|gasolina|almoc|lanche|i ?food|uber|rodei/;
  const ehTroca=c=>/\btro[cq]\w*\b.*\boleo\b|\boleo\b.*\btro[cq]\w*/.test(c)||(/\boleo\b/.test(c)&&/\b\d{4,}\b(?!\s*reais)/.test(c));
  function lerTroca(c){
    let s=c,valor=0,km=0,m;
    if((m=s.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|contos?|pilas?)\b/))){ valor=paraNum(m[1]); s=s.replace(m[0]," "); }
    if((m=s.match(/(\d{3,})\s*(?:kms?|quilometros?)\b/)||s.match(/(?:kms?|quilometros?|quilometragem|hodometro)\D{0,10}(\d{3,})/))){ km=paraNum(m[1]); s=s.replace(m[0]," "); }
    const nums=(s.match(/\d+(?:[.,]\d{1,2})?/g)||[]).map(paraNum);
    if(!km){ const grandes=nums.filter(x=>x>=1000); if(grandes.length){ km=Math.max(...grandes); nums.splice(nums.indexOf(km),1); } }
    if(!valor&&nums.length) valor=nums[0];
    return {hodometro:Math.round(km),valor};
  }
  const semAcento=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
  const paraNum=s=>parseFloat(String(s).replace(",","."));
  function diaAntes(hoje,n){ const [a,m,d]=hoje.split("-").map(Number); const x=new Date(a,m-1,d-n); return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0"); }

  window.interpretar=function(texto,hoje){
    let t=" "+semAcento(texto)+" ";
    // o ditado do celular costuma trocar "óleo" por "olha" ou "olho"
    t=t.replace(/\bolh[ao](?: o)? tro([cq])/g,"oleo tro$1").replace(/\b(troquei|trocar|trocado|troca|troca de|troca do)\s+(?:o\s+)?olh[ao]\b/g,"$1 o oleo");
    t=t.replace(/r\$\s*(\d[\d.,]*)/g,"$1 reais ").replace(/r\$\s*/g,"").replace(/(\d)\.(?=\d{3}\b)/g,"$1").replace(/\b(\d{1,3}) (\d{3})\b/g,"$1$2");
    t=t.replace(/\b[a-z]+\b/g,w=>PALAVRAS[w]!==undefined?PALAVRAS[w]:w);
    const data=/\banteontem\b/.test(t)?diaAntes(hoje,2):/\bontem\b/.test(t)?diaAntes(hoje,1):hoje;

    if(/\boleo\b/.test(t)&&/\bquando\b|\bqual\b|proxim|\bfalta/.test(t)&&!/\btroquei\b|\btrocado\b/.test(t)) return {itens:[],naoEntendi:[],horasSoltas:0,data,pergunta:"oleo"};

    let horas=0,litros=0,m;
    if((m=t.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hrs?|horas?)\b/))){ horas=paraNum(m[1]); t=t.replace(m[0]," "); }
    if((m=t.match(/(\d+(?:[.,]\d+)?)\s*(?:l|litros?)\b/))){ litros=paraNum(m[1]); t=t.replace(m[0]," "); }

    const itens=[], naoEntendi=[]; let ultimo=null;
    const partes=t.split(/\s*[,;]\s+|\.\s+|\s+e\s+|\s+depois\s+|\s+tambem\s+/).map(c=>c.trim()).filter(Boolean);
    let p=partes.findIndex(ehTroca);
    if(p>=0){
      let fim=p+1; while(fim<partes.length&&!OUTRO_ASSUNTO.test(partes[fim])&&!ehTroca(partes[fim])) fim++;
      if(p>0&&/^\D*\d{4,}\D*$/.test(partes[p-1])&&!OUTRO_ASSUNTO.test(partes[p-1])) p--;
      itens.push({tipo:"troca",...lerTroca(partes.slice(p,fim).join(" ")),data});
      partes.splice(p,fim-p);
    }
    for(let c of partes){
      let origem=null;
      for(const [re,nome] of ORIGENS){ if(re.test(c)){ origem=nome; c=c.replace(re," "); break; } }
      const n=c.match(/\d+(?:[.,]\d{1,2})?/);
      if(!n) continue;
      const v=paraNum(n[0]);
      if(/\b(inici|comec|abri|peguei a moto)|\bsai\b|\bsaindo\b/.test(c)){ itens.push({tipo:"inicio",hodometro:Math.round(v),data}); ultimo=null; continue; }
      if(/termin|finaliz|fechei|acabei|encerr|parei|voltei|cheguei/.test(c)){ itens.push({tipo:"fim",hodometro:Math.round(v)}); ultimo=null; continue; }
      if(/\d\s*(?:kms?|quilometros?|quilometro)\b/.test(c)||/rodei|andei/.test(c)){ itens.push({tipo:"km",km:v,horas:0,data,descricao:""}); ultimo=null; continue; }
      let cat=null; for(const [re,nome] of GASTOS){ if(re.test(c)){ cat=nome; break; } }
      const ehGanho=origem||/ganhei|recebi|faturei|entrou|tirei|\bfiz\b/.test(c);
      const ehGasto=cat||/gastei|paguei|comprei|custou/.test(c);
      let tipo=ehGasto&&!(ehGanho&&!cat)?"gasto":ehGanho?"ganho":ultimo;
      if(!tipo){ naoEntendi.push(c); continue; }
      itens.push({tipo,valor:v,categoria:tipo==="gasto"?(cat||"Outros"):(origem||"Outros"),data,descricao:""});
      ultimo=tipo;
    }
    const pagamento=(PAGAMENTOS.find(([re])=>re.test(t))||[])[1];
    if(pagamento) for(const i of itens) if(i.tipo==="gasto"||i.tipo==="troca") i.pagamento=pagamento;
    if(litros){ const g=itens.find(i=>i.categoria==="Gasolina"); if(g) g.litros=litros; }
    let horasSoltas=0;
    if(horas){ const k=itens.find(i=>i.tipo==="fim"||i.tipo==="km"); if(k) k.horas=horas; else horasSoltas=horas; }

    let pergunta=null;
    if(!itens.length&&/\bquanto\b|\bqual\b|\bresumo\b|\blucro\b/.test(t)){
      pergunta=/\bontem\b/.test(t)?"ontem":/\bhoje\b/.test(t)?"hoje":/semana/.test(t)?"semana":"mes";
    }
    return {itens,naoEntendi,horasSoltas,data,pergunta};
  };
})();
