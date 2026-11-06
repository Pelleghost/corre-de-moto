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
  const semAcento=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
  const paraNum=s=>parseFloat(String(s).replace(",","."));
  function diaAntes(hoje,n){ const [a,m,d]=hoje.split("-").map(Number); const x=new Date(a,m-1,d-n); return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0"); }

  window.interpretar=function(texto,hoje){
    let t=" "+semAcento(texto)+" ";
    t=t.replace(/r\$\s*/g,"").replace(/(\d)\.(?=\d{3}\b)/g,"$1").replace(/\b(\d{1,3}) (\d{3})\b/g,"$1$2");
    t=t.replace(/\b[a-z]+\b/g,w=>PALAVRAS[w]!==undefined?PALAVRAS[w]:w);
    const data=/\banteontem\b/.test(t)?diaAntes(hoje,2):/\bontem\b/.test(t)?diaAntes(hoje,1):hoje;

    let horas=0,litros=0,m;
    if((m=t.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hrs?|horas?)\b/))){ horas=paraNum(m[1]); t=t.replace(m[0]," "); }
    if((m=t.match(/(\d+(?:[.,]\d+)?)\s*(?:l|litros?)\b/))){ litros=paraNum(m[1]); t=t.replace(m[0]," "); }

    const itens=[], naoEntendi=[]; let ultimo=null;
    for(let c of t.split(/\s*[,;]\s+|\.\s+|\s+e\s+|\s+depois\s+|\s+tambem\s+/)){
      c=c.trim(); if(!c) continue;
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
