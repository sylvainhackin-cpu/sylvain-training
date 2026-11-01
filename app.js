
window.addEventListener('error',function(e){
  try{
    document.body.innerHTML='<div style="font-family:system-ui;padding:24px;max-width:720px;margin:auto"><h1>Sylvain Training</h1><div style="padding:16px;border:1px solid #b83b31;border-radius:12px"><b>Erreur de démarrage</b><p>'+String(e.message||'Erreur inconnue')+'</p><p style="color:#66756d;font-size:13px">Envoie-moi une capture de ce message et je corrige immédiatement.</p></div></div>';
  }catch(_){}
});
(()=>{'use strict';
const RACE='2026-11-22';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const today=()=>new Date().toISOString().slice(0,10);
const fmt=(n,d=0)=>n==null||!isFinite(n)?'–':Number(n).toLocaleString('fr-BE',{minimumFractionDigits:d,maximumFractionDigits:d});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const med=a=>{const b=a.filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!b.length)return null;const m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2}
const storeKey='sylvainTrainingV1_6_1';
const defaultState={
 settings:{z1:139,z2:155,z3:170,z4:184,hrmax:192,weightRef:65.2},parserVersion:'3.1',
 morning:{},activities:[],nutrition:[],pain:[],plans:[],
 recos:[]};
const PRELOADED_STATE=window.PRELOADED_STATE;
function safeGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function safeSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}
function safeRemove(k){try{localStorage.removeItem(k)}catch(e){}}
let S=null;
try{
  const raw=safeGet(storeKey)||safeGet('sylvainTrainingV1_6')||safeGet('sylvainTrainingV1_5')||safeGet('sylvainTrainingV1_4');
  S=raw?JSON.parse(raw):JSON.parse(JSON.stringify(PRELOADED_STATE));
}catch(e){
  S=JSON.parse(JSON.stringify(PRELOADED_STATE));
}
S.parserVersion='3.1';
if(!S.recos)S.recos=[];
if(!Array.isArray(S.activities))S.activities=[];
{
  const embedded=(PRELOADED_STATE.activities||[]);
  const current=S.activities||[];
  const byId=new Map(current.filter(a=>a&&a.id).map(a=>[a.id,a]));
  const embeddedIds=new Set(embedded.filter(a=>a&&a.id).map(a=>a.id));
  S.activities=[
    ...embedded.map(a=>byId.get(a.id)||a),
    ...current.filter(a=>!a?.id||!embeddedIds.has(a.id))
  ];
}
if(!S.morning)S.morning={};
// Les données Garmin intégrées servent de filet de sécurité.
// Les saisies existantes gagnent toujours pour les champs subjectifs/manuels.
for(const [d,g] of Object.entries(PRELOADED_STATE.morning||{})){
  const cur=S.morning[d]||{};
  S.morning[d]={...g,...cur,
    hrv:cur.hrv??g.hrv, rhr:cur.rhr??g.rhr, sleepScore:cur.sleepScore??g.sleepScore,
    hours:cur.hours??g.hours, bodyBattery:cur.bodyBattery??g.bodyBattery,
    hrv7:cur.hrv7??g.hrv7, hrvBaselineLow:cur.hrvBaselineLow??g.hrvBaselineLow,
    hrvBaselineHigh:cur.hrvBaselineHigh??g.hrvBaselineHigh};
}
if(!S.nutrition)S.nutrition=[];
if(!S.pain)S.pain=[];
if(!S.plans)S.plans=[];
for(const p of (PRELOADED_STATE.plans||[])){
  const i=S.plans.findIndex(x=>x.date===p.date);
  if(i>=0)S.plans[i]={...S.plans[i],...p}; else S.plans.push(p);
}
function save(){safeSet(storeKey,JSON.stringify(S))}
function toast(t){const e=$('#toast');e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,1800)}
function daysToRace(){const a=new Date(today()+'T12:00:00'),b=new Date(RACE+'T12:00:00');return Math.ceil((b-a)/86400000)}
$('#count').textContent='J−'+Math.max(0,daysToRace());
function tab(t){
  const routes={today:'index.html',train:'seances.html',analysis:'analyse.html',nutrition:'nutrition.html',body:'corps.html',fitness:'forme.html',oso:'oso.html',settings:'reglages.html'};
  if(routes[t]) location.href=routes[t];
}
/* V3.1 : navigation par vraies pages HTML. */

let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});
$('#installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;$('#installBtn').hidden=true}};
/* standalone: pas de service worker */

function buildSeg(){
 const box=$('#soreSeg'); box.innerHTML='';
 for(let i=1;i<=5;i++){const b=document.createElement('button');b.textContent=i;b.dataset.v=i;b.onclick=()=>{$$('#soreSeg button').forEach(x=>x.classList.remove('on'));b.classList.add('on')};box.appendChild(b)}
}
buildSeg(); $('#m-date').value=today();
if($('#p-date'))$('#p-date').value=today();

function baseline(key,date){
 const vals=Object.entries(S.morning).filter(([d,v])=>d<date&&v[key]!=null).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,28).map(x=>+x[1][key]);
 return vals.length>=4?med(vals):null;
}
function renderReadiness(date=today()){
 const d=S.morning[date],box=$('#readiness'); if(!d){box.className='gate';box.innerHTML='<div class="lbl">État du jour</div><div class="big">À renseigner</div><p class="hint">L’app compare tes valeurs à ta propre baseline.</p>';return}
 let score=0,notes=[];
 const bh=baseline('hrv',date), br=baseline('rhr',date);
 if(d.hrv!=null&&bh){const r=d.hrv/bh;if(r<.85){score+=2;notes.push('HRV nettement basse')}else if(r<.93){score++;notes.push('HRV un peu basse')}else notes.push('HRV normale')}
 if(d.rhr!=null&&br){const diff=d.rhr-br;if(diff>=6){score+=2;notes.push('FC repos +'+Math.round(diff))}else if(diff>=3){score++;notes.push('FC repos légèrement haute')}else notes.push('FC repos normale')}
 if(d.sore>=4){score+=2;notes.push('courbatures fortes')}else if(d.sore===3){score++;notes.push('courbatures modérées')}
 if(d.sleepScore!=null&&d.sleepScore<70){score++;notes.push('sommeil faible')}
 if(d.energy!=null&&d.energy<=2){score++;notes.push('énergie basse')}
 const lvl=score<=1?'ok':score<=3?'warn':'bad';
 const title=lvl==='ok'?'Vert':lvl==='warn'?'Orange':'Rouge';
 box.className='gate '+lvl;box.innerHTML='<div class="lbl">'+date+'</div><div class="big">'+title+'</div><p>'+notes.join(' · ')+'</p><p class="hint">'+(bh?'HRV baseline perso '+fmt(bh)+' ms':'Baseline HRV en construction')+(br?' · FC repos '+fmt(br):'')+(d.hrvBaselineLow!=null?' · Garmin '+fmt(d.hrvBaselineLow)+'–'+fmt(d.hrvBaselineHigh)+' ms':'')+'</p>';
}

function parseSleepDuration(v){
  const s=String(v??'').trim().toLowerCase().replace(/\s+/g,'');
  if(!s)return null;
  let m=s.match(/^(\d{1,2})(?::|h)(\d{1,2})$/);
  if(m){
    const h=+m[1],min=+m[2];
    if(min>59||h>16)return NaN;
    return h+min/60;
  }
  // Also accept decimal hours for backwards compatibility, e.g. 6.4.
  const n=Number(s.replace(',','.'));
  if(Number.isFinite(n)&&n>=0&&n<=16)return n;
  return NaN;
}
function formatSleepDuration(hours){
  if(hours==null||!Number.isFinite(+hours))return '';
  let total=Math.round(+hours*60);
  const h=Math.floor(total/60),m=total%60;
  return h+':'+String(m).padStart(2,'0');
}

function loadMorning(d){
 const x=S.morning[d]||{};$('#m-hrv').value=x.hrv??'';$('#m-rhr').value=x.rhr??'';$('#m-sleep').value=x.sleepScore??'';$('#m-hours').value=formatSleepDuration(x.hours);$('#m-weight').value=x.weight??'';$('#m-bb').value=x.bodyBattery??'';$('#m-energy').value=x.energy??'';$('#m-note').value=x.note||'';$$('#soreSeg button').forEach(b=>b.classList.toggle('on',+b.dataset.v===x.sore))
}
$('#m-date').onchange=e=>{loadMorning(e.target.value);renderReadiness(e.target.value)};
$('#saveMorning').onclick=()=>{
 const d=$('#m-date').value||today();
 const hours=parseSleepDuration($('#m-hours').value);
 if(Number.isNaN(hours))return toast('Sommeil : utilise par ex. 6:24 ou 6h24');
 S.morning[d]={...(S.morning[d]||{}),hrv:+$('#m-hrv').value||null,rhr:+$('#m-rhr').value||null,sleepScore:+$('#m-sleep').value||null,hours,weight:+$('#m-weight').value||null,bodyBattery:+$('#m-bb').value||null,energy:+$('#m-energy').value||null,sore:+($('#soreSeg .on')?.dataset.v||0)||null,note:$('#m-note').value.trim()};
 save();renderReadiness(d);drawMorning();toast('Matin enregistré');
};


function healthHeaders(rows){return (rows[0]||[]).map(x=>String(x).replace(/\u00a0/g,' ').trim())}
function healthNum(v){
  const m=String(v??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
  return m?+m[0]:null;
}
function healthSleepHours(v){
  const s=String(v||'');
  const h=(s.match(/(\d+)\s*h/)||[])[1],m=(s.match(/(\d+)\s*min/)||[])[1];
  return h!=null?(+h+(+(m||0))/60):null;
}
function healthIsoDate(v){
  const s=String(v||'').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  const us=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(us)return us[3]+'-'+String(+us[1]).padStart(2,'0')+'-'+String(+us[2]).padStart(2,'0');
  const en=s.match(/^([A-Za-z]+)\.?\s*(\d{1,2})$/);
  if(en){
    const mm={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12}[en[1].slice(0,3)];
    if(mm)return new Date().getFullYear()+'-'+String(mm).padStart(2,'0')+'-'+String(+en[2]).padStart(2,'0');
  }
  return null;
}
function mergeMorningObjective(date,obj){
  if(!date)return false;
  const old=S.morning[date]||{};
  S.morning[date]={...old,...obj,
    // Toujours préserver les champs subjectifs/manuels
    weight:old.weight??obj.weight??null,
    energy:old.energy??null,
    sore:old.sore??null,
    note:old.note??''
  };
  return true;
}
async function importHealthFile(f){
  const rows=csvParse(await f.text()); if(rows.length<2)return {n:0,type:'inconnu'};
  const head=healthHeaders(rows), idx=n=>head.indexOf(n);
  let n=0,type='inconnu';

  if(idx('Variabilité de la fréquence cardiaque nocturne')>=0){
    type='HRV';
    const di=idx('Date'), hi=idx('Variabilité de la fréquence cardiaque nocturne'), bi=idx('Ligne de base'), ai=idx('Moyenne sur 7 jours');
    for(const r of rows.slice(1)){
      const d=healthIsoDate(r[di]); if(!d)continue;
      const range=String(r[bi]||'').match(/(\d+)\D+(\d+)/);
      if(mergeMorningObjective(d,{
        hrv:healthNum(r[hi]), hrv7:healthNum(r[ai]),
        hrvBaselineLow:range?+range[1]:null, hrvBaselineHigh:range?+range[2]:null,
        sourceGarmin:true
      }))n++;
    }
  }else if(head.some(x=>x.startsWith('Score de sommeil 4')) && idx('Durée')>=0){
    type='Sommeil';
    const di=head.findIndex(x=>x.startsWith('Score de sommeil 4'));
    for(const r of rows.slice(1)){
      const d=healthIsoDate(r[di]); if(!d)continue;
      const get=n=>idx(n)>=0?r[idx(n)]:null;
      if(mergeMorningObjective(d,{
        sleepScore:healthNum(get('Score')),
        rhr:healthNum(get('Fréquence cardiaque au repos')),
        bodyBattery:healthNum(get('Body Battery')),
        hours:healthSleepHours(get('Durée')),
        sleepQuality:get('Qualité')||null,
        sleepNeed:get('Besoin en sommeil')||null,
        bedtime:get('Heure de coucher')||null,
        wakeTime:get('Heure de lever')||null,
        sleepAlignment:get('Alignement du sommeil')||null,
        sourceGarmin:true
      }))n++;
    }
  }else if(head.includes('Fréquence cardiaque au repos')){
    type='FC repos';
    const ri=idx('Fréquence cardiaque au repos');
    for(const r of rows.slice(1)){
      const d=healthIsoDate(r[0]); if(!d)continue;
      if(mergeMorningObjective(d,{rhr:healthNum(r[ri]),sourceGarmin:true}))n++;
    }
  }
  return {n,type};
}
$('#garminHealthCsv').onchange=async e=>{
  const files=[...e.target.files];if(!files.length)return;
  let total=0,types=[];
  try{
    for(const f of files){
      const r=await importHealthFile(f); total+=r.n;if(r.type!=='inconnu')types.push(r.type);
    }
    save();loadMorning($('#m-date').value||today());renderReadiness($('#m-date').value||today());drawMorning();renderHealthInfo();
    toast(total+' journées Garmin mises à jour');
  }catch(err){toast('Erreur Garmin Santé : '+err.message)}
  e.target.value='';
};
function renderHealthInfo(){
  const box=$('#garminHealthInfo');if(!box)return;
  const ds=Object.keys(S.morning).filter(d=>S.morning[d]?.sourceGarmin).sort();
  if(!ds.length){box.textContent='Aucune donnée Garmin Santé.';return}
  box.textContent=ds.length+' journées Garmin · du '+frDate(ds[0])+' au '+frDate(ds[ds.length-1]);
}

function drawMorning(){
 const c=$('#morningChart'),ctx=c.getContext('2d'),W=c.width,H=c.height;ctx.clearRect(0,0,W,H);const ds=Object.keys(S.morning).sort().slice(-14);if(!ds.length){ctx.fillStyle='#718077';ctx.font='30px sans-serif';ctx.fillText('Pas encore de données',30,70);return}
 const vals=ds.map(d=>S.morning[d].hrv).filter(Number.isFinite); if(!vals.length)return;
 const min=Math.min(...vals)-5,max=Math.max(...vals)+5; ctx.strokeStyle='#1c6b4a';ctx.lineWidth=6;ctx.beginPath();
 ds.forEach((d,i)=>{const v=S.morning[d].hrv;if(v==null)return;const x=35+i*(W-70)/Math.max(1,ds.length-1),y=H-35-(v-min)/(max-min)*(H-70);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
 ctx.stroke();ctx.fillStyle='#6b7a72';ctx.font='24px sans-serif';ds.forEach((d,i)=>{const x=35+i*(W-70)/Math.max(1,ds.length-1);ctx.fillText(d.slice(8),x-10,H-8)});
}
loadMorning(today());renderReadiness();drawMorning();renderHealthInfo();

function tpVal(tp,name){
 let el=[...tp.getElementsByTagName('*')].find(e=>e.localName===name); return el?parseFloat(el.textContent):null;
}
function parseTCX(text,fileName){
 const xml=new DOMParser().parseFromString(text,'application/xml'); const tps=[...xml.getElementsByTagName('*')].filter(e=>e.localName==='Trackpoint');
 if(!tps.length)throw new Error('Aucun Trackpoint trouvé');
 const pts=tps.map(tp=>{
   const time=[...tp.getElementsByTagName('*')].find(e=>e.localName==='Time')?.textContent;
   const hrNode=[...tp.getElementsByTagName('*')].find(e=>e.localName==='HeartRateBpm');
   const hr=hrNode?[...hrNode.getElementsByTagName('*')].find(e=>e.localName==='Value')?.textContent:null;
   return {t:time?new Date(time).getTime():null,dist:tpVal(tp,'DistanceMeters'),alt:tpVal(tp,'AltitudeMeters'),hr:hr?+hr:null,power:tpVal(tp,'Watts'),cad:tpVal(tp,'Cadence')};
 }).filter(p=>p.t);
 const start=pts[0].t,end=pts[pts.length-1].t,min=(end-start)/60000;
 const dists=pts.map(p=>p.dist).filter(Number.isFinite);const km=dists.length?(Math.max(...dists)-Math.min(...dists))/1000:null;
 // D+ robuste : médiane locale + hystérésis de 3 m.
 // L'ancienne méthode ignorait les montées progressives lorsque chaque delta filtré faisait <0,25 m.
 const alt=pts.map(p=>p.alt);
 const smooth=alt.map((v,i)=>{
   const a=[];
   for(let j=Math.max(0,i-3);j<=Math.min(alt.length-1,i+3);j++)if(Number.isFinite(alt[j]))a.push(alt[j]);
   if(!a.length)return null;a.sort((x,y)=>x-y);return a[Math.floor(a.length/2)];
 });
 const validAlt=smooth.filter(Number.isFinite);
 let dp=0;
 if(validAlt.length){
   let low=validAlt[0],peak=validAlt[0];
   for(let i=1;i<validAlt.length;i++){
     const v=validAlt[i];
     if(v>peak)peak=v;
     if(peak-v>=3){
       if(peak-low>=3)dp+=peak-low;
       low=v;peak=v;
     }else if(v<low){
       low=v;peak=v;
     }
   }
   if(peak-low>=3)dp+=peak-low;
 }
 let hrSum=0,hrT=0,pSum=0,pT=0,hrMax=0,pMax=0;const z=[0,0,0,0,0],bins=[0,0,0,0,0,0,0];
 const zz=S.settings;
 for(let i=1;i<pts.length;i++){
   const dt=clamp((pts[i].t-pts[i-1].t)/1000,0,5);
   const h=pts[i-1].hr, p=pts[i-1].power;
   if(Number.isFinite(h)){hrSum+=h*dt;hrT+=dt;hrMax=Math.max(hrMax,h);const zi=h<=zz.z1?0:h<=zz.z2?1:h<=zz.z3?2:h<=zz.z4?3:4;z[zi]+=dt}
   if(Number.isFinite(p)){pSum+=p*dt;pT+=dt;pMax=Math.max(pMax,p);const bi=p<240?0:p<260?1:p<280?2:p<300?3:p<320?4:p<340?5:6;bins[bi]+=dt}
 }
 const hrAvg=hrT?hrSum/hrT:null,pAvg=pT?pSum/pT:null;
 function halfStats(a,b){let hs=0,ht=0,ps=0,pt=0;for(let i=1;i<pts.length;i++){const f=(pts[i-1].t-start)/(end-start);if(f<a||f>=b)continue;const dt=clamp((pts[i].t-pts[i-1].t)/1000,0,5),h=pts[i-1].hr,p=pts[i-1].power;if(Number.isFinite(h)){hs+=h*dt;ht+=dt}if(Number.isFinite(p)){ps+=p*dt;pt+=dt}}return {hr:ht?hs/ht:null,power:pt?ps/pt:null}}
 const h1=halfStats(0,.5),h2=halfStats(.5,1);
 const decouple=(h1.hr&&h2.hr&&h1.power&&h2.power)?(((h2.hr/h2.power)/(h1.hr/h1.power)-1)*100):null;
 // Meilleurs efforts : reconstruction seconde par seconde à partir des intervalles TCX.
 // On propage la puissance du Trackpoint jusqu'au suivant (gaps <= 10 s), ce qui évite
 // qu'un 30 min puisse artificiellement dépasser le meilleur 20 min.
 const secs=Math.ceil((end-start)/1000)+1,arr=new Float32Array(secs),validSec=new Uint8Array(secs);
 for(let i=1;i<pts.length;i++){
   const p=pts[i-1].power;
   const s0=Math.max(0,Math.floor((pts[i-1].t-start)/1000));
   const s1=Math.min(secs,Math.ceil((pts[i].t-start)/1000));
   const gap=s1-s0;
   if(Number.isFinite(p)&&gap>0&&gap<=10){
     for(let s=s0;s<s1;s++){arr[s]=p;validSec[s]=1}
   }
 }
 const pref=new Float64Array(secs+1),valid=new Uint32Array(secs+1);
 for(let i=0;i<secs;i++){pref[i+1]=pref[i]+arr[i];valid[i+1]=valid[i]+validSec[i]}
 function best(s){
   if(secs<s)return null;let m=0;
   for(let i=0;i+s<=secs;i++){
     const v=valid[i+s]-valid[i];
     if(v<s*.95)continue;
     const av=(pref[i+s]-pref[i])/s; // secondes manquantes pénalisées, jamais ignorées
     if(av>m)m=av;
   }
   return m||null
 }
 const date=new Date(start).toISOString().slice(0,10);
 const ztot=z.reduce((x,y)=>x+y,0),highFrac=ztot?(z[2]+z[3]+z[4])/ztot:0;
 const bestObj={s10:best(10),s30:best(30),m1:best(60),m5:best(300),m10:best(600),m20:best(1200),m30:best(1800)};
 // Garde-fou mathématique : le meilleur effort ne peut pas augmenter quand la durée augmente.
 // Les TCX peuvent contenir des trous d'échantillonnage ; on borne donc chaque durée longue
 // par la meilleure valeur de la durée plus courte précédente.
 const order=['s10','s30','m1','m5','m10','m20','m30'];
 for(let i=1;i<order.length;i++){
   const prev=bestObj[order[i-1]], cur=bestObj[order[i]];
   if(prev!=null && cur!=null && cur>prev) bestObj[order[i]]=prev;
 }
 return {id:Date.now().toString(36),date,name:fileName.replace(/\.tcx$/i,''),km,min,dplus:dp,hr:hrAvg,hrMax,power:pAvg,powerMax:pMax,zones:z,bins,decouple,decoupleFlag:highFrac>.35?'intensite':'indicatif',best:bestObj,rpe:null,note:''};
}
$('#tcxFile').onchange=async e=>{
 const files=[...e.target.files]; if(!files.length)return;
 let ok=0,dup=0,err=0;
 const existing=new Set(S.activities.map(a=>(a.date||'')+'|'+(a.name||'')+'|'+Math.round((a.min||0)*10)+'|'+Math.round((a.km||0)*100)));
 for(const f of files){
   try{
     const a=parseTCX(await f.text(),f.name);
     const key=(a.date||'')+'|'+(a.name||'')+'|'+Math.round((a.min||0)*10)+'|'+Math.round((a.km||0)*100);
     if(existing.has(key)){dup++;continue}
     existing.add(key);S.activities.push(a);ok++;
   }catch(x){err++}
 }
 S.activities.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 save();renderActivities();renderAnalysis();renderFitness();
 toast(ok+' importée'+(ok>1?'s':'')+(dup?' · '+dup+' doublon'+(dup>1?'s':''):'')+(err?' · '+err+' erreur'+(err>1?'s':''):''));
 e.target.value='';
};


function csvParse(text){
  const rows=[];let row=[],field='',q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){
      if(c==='"' && text[i+1]==='"'){field+='"';i++}
      else if(c==='"')q=false;
      else field+=c;
    }else{
      if(c==='"')q=true;
      else if(c===','){row.push(field);field=''}
      else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field=''}
      else field+=c;
    }
  }
  if(field.length||row.length){row.push(field);rows.push(row)}
  return rows;
}
function csvNum(v,thousands=false){
  v=String(v??'').trim();
  if(!v||v==='--')return null;
  if(thousands)v=v.replace(/,/g,'');
  else if(v.includes(',')&&!v.includes('.'))v=v.replace(',','.');
  const n=Number(v);return Number.isFinite(n)?n:null;
}
function csvDuration(v){
  const m=String(v||'').match(/^(\d+):(\d{2}):(\d{2})$/);
  return m?(+m[1]*60 + +m[2] + +m[3]/60):null;
}
function garminRows(text){
  const rows=csvParse(text); if(rows.length<2)throw new Error('CSV vide');
  const head=rows[0].map(x=>x.trim());
  const idx=n=>head.indexOf(n);
  const need=['Date','Distance','Durée'];
  if(need.some(n=>idx(n)<0))throw new Error('CSV Garmin non reconnu');
  return rows.slice(1).filter(r=>r.length>1).map((r,i)=>{
    const dateFull=r[idx('Date')]||'', date=dateFull.slice(0,10);
    const title=idx('Titre')>=0?r[idx('Titre')]:'';
    const type=idx("Type d'activité")>=0?r[idx("Type d'activité")]:'';
    return {
      id:'csv_'+date.replace(/-/g,'')+'_'+i,
      date,
      name:title||type||('Garmin '+date),
      type,
      km:csvNum(r[idx('Distance')]),
      min:csvDuration(r[idx('Durée')]),
      dplus:idx('Ascension totale')>=0?csvNum(r[idx('Ascension totale')],true):null,
      hr:idx('Fréquence cardiaque moyenne')>=0?csvNum(r[idx('Fréquence cardiaque moyenne')]):null,
      hrMax:idx('Fréquence cardiaque maximale')>=0?csvNum(r[idx('Fréquence cardiaque maximale')]):null,
      power:idx('Puissance moyenne')>=0?csvNum(r[idx('Puissance moyenne')]):null,
      powerMax:idx('Puissance max.')>=0?csvNum(r[idx('Puissance max.')]):null,
      source:'garmin_csv',summaryOnly:true
    }
  }).filter(a=>a.date&&a.km!=null);
}
function findDetailedMatch(c){
  return S.activities.find(a=>a.source!=='garmin_csv' && a.date===c.date &&
    a.km!=null && Math.abs(a.km-c.km)<=0.25 &&
    (a.min==null||c.min==null||Math.abs(a.min-c.min)<=10));
}
$('#garminCsv').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    const incoming=garminRows(await f.text());
    let added=0,merged=0,skipped=0;
    const existingCsv=new Set(S.activities.filter(a=>a.source==='garmin_csv').map(a=>a.date+'|'+Math.round((a.km||0)*100)+'|'+Math.round((a.min||0)*10)));
    for(const c of incoming){
      const d=findDetailedMatch(c);
      if(d){
        // Le TCX reste la source détaillée. Garmin est prioritaire pour le titre et le D+ résumé.
        if(c.name)d.name=c.name;
        if(c.dplus!=null)d.dplusGarmin=c.dplus;
        if(c.min!=null)d.minGarmin=c.min;
        d.garminMatched=true; merged++; continue;
      }
      const key=c.date+'|'+Math.round((c.km||0)*100)+'|'+Math.round((c.min||0)*10);
      if(existingCsv.has(key)){skipped++;continue}
      existingCsv.add(key);S.activities.push(c);added++;
    }
    S.activities.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    save();renderActivities();renderAnalysis();renderFitness();
    toast(added+' historiques ajoutées · '+merged+' fusionnées'+(skipped?' · '+skipped+' déjà présentes':''));
  }catch(x){toast('Erreur CSV : '+x.message)}
  e.target.value='';
};


function planDateLabel(d){
  const x=new Date(d+'T12:00:00');
  return x.toLocaleDateString('fr-BE',{weekday:'short',day:'numeric',month:'short'});
}
function renderPlans(){
  const box=$('#planList'); if(!box)return;
  const plans=[...(S.plans||[])].sort((a,b)=>a.date.localeCompare(b.date));
  if(!plans.length){box.innerHTML='<div class="muted">Aucune séance planifiée.</div>';return}
  const now=today();
  box.innerHTML=plans.map(p=>{
    const future=p.date>=now;
    const bits=[];
    if(p.min!=null)bits.push(fmt(p.min)+' min');
    if(p.km!=null)bits.push(fmt(p.km,1)+' km');
    if(p.dplus!=null)bits.push(fmt(p.dplus)+' m D+');
    if(p.rpe!=null)bits.push('RPE '+fmt(p.rpe));
    return '<div class="activity">'+
      '<div class="row"><div>'+
        '<div class="title">'+planDateLabel(p.date)+' · '+p.type+'</div>'+
        '<div class="sub">'+(bits.join(' · ')||'Séance planifiée')+'</div>'+
      '</div><div style="display:flex;gap:6px;align-items:center">'+
        '<span class="pill">'+(future?'à venir':'passée')+'</span>'+
        '<button class="btn ghost small delPlan" data-id="'+p.id+'">Suppr.</button>'+
      '</div></div>'+
      (p.desc?'<div style="margin-top:8px;white-space:pre-wrap">'+p.desc+'</div>':'')+
      (p.note?'<div class="hint" style="margin-top:5px">'+p.note+'</div>':'')+
    '</div>';
  }).join('');
  $$('.delPlan').forEach(b=>b.onclick=()=>{
    S.plans=S.plans.filter(p=>p.id!==b.dataset.id);save();renderPlans();toast('Séance planifiée supprimée');
  });
}
$('#savePlan').onclick=()=>{
  const d=$('#p-date').value;
  const desc=$('#p-desc').value.trim();
  if(!d)return toast('Choisis une date');
  const num=id=>{const v=$(id).value.trim();return v===''?null:+v};
  S.plans.push({
    id:'plan_'+Date.now().toString(36),
    date:d,
    type:$('#p-type').value,
    min:num('#p-min'),
    km:num('#p-km'),
    dplus:num('#p-dplus'),
    rpe:num('#p-rpe'),
    desc,
    note:$('#p-note').value.trim()
  });
  save();renderPlans();
  $('#p-min').value='';$('#p-km').value='';$('#p-dplus').value='';$('#p-rpe').value='';
  $('#p-desc').value='';$('#p-note').value='';
  toast('Séance coach ajoutée');
};

function activitySub(a){return [a.km!=null?fmt(a.km,2)+' km':'',a.min!=null?Math.floor(a.min/60)+'h'+String(Math.round(a.min%60)).padStart(2,'0'):'',a.dplus!=null?'+'+fmt(a.dplus)+' m':'',a.hr!=null?'FC '+fmt(a.hr):'',a.power!=null?fmt(a.power)+' W':''].filter(Boolean).join(' · ')}
function renderActivities(){
 const box=$('#activities'),all=[...S.activities,...S.recos.map((x,i)=>({...x,id:'reco'+i,reference:true}))].sort((a,b)=>b.date.localeCompare(a.date));
 const acts=[...S.activities].filter(a=>a.date).sort((a,b)=>a.date.localeCompare(b.date));
 const hs=$('#historyStats'), sp=$('#historySpan');
 if(hs&&sp){
   if(acts.length){
     const first=acts[0].date,last=acts[acts.length-1].date,span=dateDiff(first,last)+1;
     sp.textContent=span+' jours';
     const km=acts.reduce((s,a)=>s+(+a.km||0),0),dp=acts.reduce((s,a)=>s+(+a.dplus||0),0),mins=acts.reduce((s,a)=>s+(+a.min||0),0);
     hs.innerHTML='<div class="metric"><b>'+acts.length+'</b><span>séances</span></div><div class="metric"><b>'+fmt(km,1)+'</b><span>km</span></div><div class="metric"><b>'+fmt(dp)+'</b><span>D+</span></div><div class="metric"><b>'+fmt(mins/60,1)+'</b><span>heures</span></div>';
   }else{sp.textContent='0 jour';hs.innerHTML='<div class="muted">Aucune séance importée.</div>'}
 }
 const visibleAll=all.slice(0,120);
 box.innerHTML=visibleAll.length?visibleAll.map(a=>'<div class="activity"><div class="row"><div><div class="title">'+a.name+'</div><div class="sub">'+a.date+' · '+activitySub(a)+'</div></div>'+(a.source==='garmin_csv'?'<span class="pill">Garmin CSV</span>':(a.reference?'<span class="pill">référence</span>':'<button class="btn ghost small delAct" data-id="'+a.id+'">Suppr.</button>'))+'</div>'+(a.note?'<div class="hint" style="margin-top:5px">'+a.note+'</div>':'')+'</div>').join('')+(all.length>visibleAll.length?'<div class="hint" style="padding-top:10px">Affichage limité aux 120 séances les plus récentes · '+all.length+' activités stockées au total.</div>':''):'<div class="muted">Aucune séance importée.</div>';
 $$('.delAct').forEach(b=>b.onclick=()=>{S.activities=S.activities.filter(a=>a.id!==b.dataset.id);save();renderActivities();renderAnalysis();renderFitness()});
}
renderActivities();

function actOptions(sel){
 const cur=sel.value;const all=[...S.activities,...S.recos.map((x,i)=>({...x,id:'reco'+i,reference:true}))].sort((a,b)=>b.date.localeCompare(a.date));
 sel.innerHTML='<option value="">Choisir…</option>'+all.map(a=>'<option value="'+a.id+'">'+a.date+' · '+a.name+'</option>').join('');sel.value=cur;
}
function getAct(id){if(!id)return null;if(id.startsWith('reco'))return {...S.recos[+id.slice(4)],id};return S.activities.find(a=>a.id===id)}
function analysisHtml(a){
 if(!a)return '<div class="muted">Choisis une séance.</div>';
 let h=(a.summaryOnly?'<div class="banner" style="margin-bottom:10px">Résumé Garmin CSV : pas de données seconde par seconde. Importe le TCX de cette séance pour l’analyse détaillée.</div>':'')+'<div class="grid3"><div class="metric"><b>'+fmt(a.km,2)+'</b><span>km</span></div><div class="metric"><b>'+fmt(a.dplus)+'</b><span>D+</span></div><div class="metric"><b>'+fmt(a.hr)+'</b><span>FC moy.</span></div><div class="metric"><b>'+fmt(a.power)+'</b><span>W moy.</span></div><div class="metric"><b>'+(a.decoupleFlag==='intensite'?'N/A':fmt(a.decouple,1)+'%')+'</b><span>'+(a.decoupleFlag==='intensite'?'dérive · séance intense':'dérive HR/W · indicative')+'</span></div><div class="metric"><b>'+fmt(a.powerMax)+'</b><span>W max</span></div></div>';
 if(a.zones){const total=a.zones.reduce((x,y)=>x+y,0);h+='<h3>Zones FC</h3>'+a.zones.map((v,i)=>'<div class="zone-row"><b>Z'+(i+1)+'</b><div class="bar"><i style="width:'+(total?100*v/total:0)+'%"></i></div><span>'+fmt(total?100*v/total:0,1)+'%</span></div>').join('')}
 if(a.best){h+='<h3>Meilleurs efforts watts</h3><table><tr><th>10 s</th><th>30 s</th><th>1 min</th><th>5 min</th><th>10 min</th><th>20 min</th><th>30 min</th></tr><tr>'+['s10','s30','m1','m5','m10','m20','m30'].map(k=>'<td>'+fmt(a.best[k])+'</td>').join('')+'</tr></table>'}
 return h;
}
function renderAnalysis(){
 actOptions($('#analysisSelect'));actOptions($('#cmpA'));actOptions($('#cmpB'));$('#analysisBox').innerHTML=analysisHtml(getAct($('#analysisSelect').value));renderCompare();
}
$('#analysisSelect').onchange=()=>$('#analysisBox').innerHTML=analysisHtml(getAct($('#analysisSelect').value));
$('#cmpA').onchange=renderCompare;$('#cmpB').onchange=renderCompare;
function renderCompare(){
 const a=getAct($('#cmpA').value),b=getAct($('#cmpB').value),box=$('#compareBox');if(!a||!b){box.innerHTML='<div class="muted">Choisis deux séances.</div>';return}
 const rows=[['Distance','km','km',2],['D+','dplus','m',0],['FC moy.','hr','bpm',0],['Puissance','power','W',0],['Durée','min','min',0]];
 box.innerHTML='<table><tr><th></th><th>'+a.date+'</th><th>'+b.date+'</th><th>Δ</th></tr>'+rows.map(r=>{const av=a[r[1]],bv=b[r[1]],d=(bv!=null&&av!=null)?bv-av:null;return '<tr><td>'+r[0]+'</td><td>'+fmt(av,r[3])+' '+r[2]+'</td><td>'+fmt(bv,r[3])+' '+r[2]+'</td><td>'+(d==null?'–':(d>0?'+':'')+fmt(d,r[3]))+'</td></tr>'}).join('')+'</table>'+
 ((a.power&&a.hr&&b.power&&b.hr)?'<p class="hint">Efficacité W/bpm : '+fmt(a.power/a.hr,2)+' → '+fmt(b.power/b.hr,2)+' ('+fmt(((b.power/b.hr)/(a.power/a.hr)-1)*100,1)+'%).</p>':'');
}
renderAnalysis();

const NUTRI_PRODUCTS={
 gel30:{name:'Gel — 30 g glucides',carb:30,fluid:0,sod:0},
 iso500:{name:'Flasque iso 500 ml — 35 g glucides + 450 mg sodium',carb:35,fluid:500,sod:450},
 water500:{name:'Eau — 500 ml',carb:0,fluid:500,sod:0},
 water250:{name:'Eau — 250 ml',carb:0,fluid:250,sod:0},
 pfh1500:{name:'PF&H 1500 — 1 pastille',carb:0,fluid:0,sod:1500},
 pfh750:{name:'PF&H 1500 — 1/2 pastille',carb:0,fluid:0,sod:750},
 pfh375:{name:'PF&H 1500 — 1/4 pastille',carb:0,fluid:0,sod:375}
};
let nutriBasket=[];

function nutriTotals(items=nutriBasket){
 return items.reduce((t,x)=>{
   t.carb+=(+x.carb||0)*(+x.qty||0);
   t.fluid+=(+x.fluid||0)*(+x.qty||0);
   t.sod+=(+x.sod||0)*(+x.qty||0);
   return t;
 },{carb:0,fluid:0,sod:0});
}
function renderNutriBasket(){
 const box=$('#n-items');if(!box)return;
 const t=nutriTotals();
 $('#n-carb').value=fmt(t.carb,1);
 $('#n-fluid').value=fmt(t.fluid,0);
 $('#n-sod').value=fmt(t.sod,0);
 if(!nutriBasket.length){
   box.innerHTML='<div class="muted">Rien ajouté pour le moment.</div>';
 }else{
   box.innerHTML=nutriBasket.map((x,i)=>
     '<div class="activity"><div class="row"><div>'+
       '<div class="title">'+x.qty+' × '+x.name+'</div>'+
       '<div class="sub">'+
         (x.carb?fmt(x.carb*x.qty,0)+' g glucides · ':'')+
         (x.fluid?fmt(x.fluid*x.qty,0)+' ml · ':'')+
         (x.sod?fmt(x.sod*x.qty,0)+' mg Na':'')+
       '</div></div>'+
       '<button class="btn ghost small delNutriItem" data-i="'+i+'">Suppr.</button>'+
     '</div></div>'
   ).join('');
   $$('.delNutriItem').forEach(b=>b.onclick=()=>{
     nutriBasket.splice(+b.dataset.i,1);renderNutriBasket();nutriLive();
   });
 }
 nutriLive();
}
$('#n-product').onchange=()=>{
 $('#n-custom').hidden=$('#n-product').value!=='custom';
};
$('#addNutriItem').onclick=()=>{
 const key=$('#n-product').value,qty=+$('#n-qty').value||0;
 if(qty<=0)return toast('Indique une quantité');
 let p;
 if(key==='custom'){
   const name=$('#n-custom-name').value.trim();
   if(!name)return toast('Donne un nom au produit');
   p={name,carb:+$('#n-custom-carb').value||0,fluid:+$('#n-custom-fluid').value||0,sod:+$('#n-custom-sod').value||0};
   if(!p.carb&&!p.fluid&&!p.sod)return toast('Indique au moins glucides, liquide ou sodium');
 }else p=NUTRI_PRODUCTS[key];
 const same=nutriBasket.find(x=>x.name===p.name&&x.carb===p.carb&&x.fluid===p.fluid&&x.sod===p.sod);
 if(same)same.qty+=qty;else nutriBasket.push({...p,qty});
 $('#n-qty').value=1;
 renderNutriBasket();
};
function nutriLive(){
 const m=+$('#n-min').value||0,h=m/60,t=nutriTotals(),w0=+$('#n-w0').value||0,w1=+$('#n-w1').value||0;
 const sweat=h&&w0&&w1?Math.max(0,(w0-w1+t.fluid/1000)/h):null;
 $('#n-live').innerHTML=
   '<div class="metric"><b>'+fmt(h?t.carb/h:null)+'</b><span>g glucides/h</span></div>'+
   '<div class="metric"><b>'+fmt(h?t.fluid/h:null)+'</b><span>ml/h</span></div>'+
   '<div class="metric"><b>'+fmt(h?t.sod/h:null)+'</b><span>mg sodium/h</span></div>'+
   '<div class="metric"><b>'+fmt(sweat,2)+'</b><span>L sudation/h</span></div>';
}
['n-min','n-w0','n-w1'].forEach(id=>$('#'+id).oninput=nutriLive);

$('#saveNutri').onclick=()=>{
 const t=nutriTotals();
 const x={
   id:Date.now().toString(36),
   date:$('#n-date').value||today(),
   min:+$('#n-min').value||0,
   carb:t.carb,fluid:t.fluid,sod:t.sod,
   items:nutriBasket.map(v=>({...v})),
   w0:+$('#n-w0').value||null,w1:+$('#n-w1').value||null,
   note:$('#n-note').value.trim()
 };
 if(!x.min)return toast('Indique la durée');
 if(!x.items.length)return toast('Ajoute au moins un aliment ou une boisson');
 S.nutrition.unshift(x);save();renderNutri();toast('Nutrition enregistrée');
 nutriBasket=[];
 $('#n-min').value='';$('#n-w0').value='';$('#n-w1').value='';$('#n-note').value='';
 renderNutriBasket();
};
function renderNutri(){
 if($('#n-date')&&!$('#n-date').value)$('#n-date').value=today();
 renderNutriBasket();
 $('#nutriList').innerHTML=S.nutrition.length?S.nutrition.map(x=>{
   const h=x.min/60;
   const items=(x.items||[]).map(i=>i.qty+'× '+i.name).join(' · ');
   return '<div class="activity">'+
     '<div class="title">'+x.date+' · '+fmt(x.min)+' min</div>'+
     '<div class="sub">'+fmt(x.carb/h)+' g/h · '+fmt(x.fluid/h)+' ml/h · '+fmt(x.sod/h)+' mg Na/h</div>'+
     (items?'<div class="hint" style="margin-top:5px">'+items+'</div>':'')+
     (x.note?'<div class="hint">'+x.note+'</div>':'')+
   '</div>';
 }).join(''):'<div class="muted">Aucun test enregistré.</div>';
}renderNutri();

const zones=['Fessier G','Fessier D','Psoas G','Psoas D','Quadriceps G','Quadriceps D','Ischio G','Ischio D','Mollet G','Mollet D','Tibial G','Tibial D','Cheville G','Cheville D','Pied G','Pied D','Bassin / sacrum','Lombaires'];
let painSel=null;
function renderPain(){
 $('#painZones').innerHTML=zones.map(z=>'<button data-z="'+z+'" class="'+(painSel===z?'sel':'')+'">'+z+'</button>').join('');$$('#painZones button').forEach(b=>b.onclick=()=>{painSel=b.dataset.z;renderPain();renderPainEditor()});renderPainHistory();
}
function renderPainEditor(){
 const box=$('#painEditor');if(!painSel){box.innerHTML='<div class="muted">Choisis une zone.</div>';return}box.innerHTML='<h2>'+painSel+'</h2><div class="grid"><label><span class="lbl">Intensité 0–10</span><input id="p-score" type="number" min="0" max="10"></label><label><span class="lbl">Type</span><select id="p-type"><option>Raideur</option><option>Courbature</option><option>Tendon</option><option>Articulation</option><option>Douleur aiguë</option><option>Autre</option></select></label><label class="full"><span class="lbl">Note</span><input id="p-note" type="text"></label></div><div class="row" style="margin-top:12px"><span></span><button class="btn" id="p-save">Enregistrer</button></div>';$('#p-save').onclick=()=>{S.pain.unshift({id:Date.now().toString(36),date:today(),zone:painSel,score:+$('#p-score').value||0,type:$('#p-type').value,note:$('#p-note').value.trim()});save();renderPainHistory();toast('Douleur enregistrée')}}
function renderPainHistory(){const cutoff=new Date();cutoff.setDate(cutoff.getDate()-7);$('#painHistory').innerHTML=S.pain.filter(x=>new Date(x.date)>=cutoff).map(x=>'<div class="activity"><div class="title">'+x.zone+' · '+x.score+'/10</div><div class="sub">'+x.date+' · '+x.type+'</div>'+(x.note?'<div class="hint">'+x.note+'</div>':'')+'</div>').join('')||'<div class="muted">Rien noté sur 7 jours.</div>'}
renderPain();

const segments=[
 ['0–8 km','Se freiner','Trop facile.'],
 ['8–27 km','Économiser','Rien à gagner ici.'],
 ['27–42,7 km','Installer le rythme','Régulier. Mange. Avance.'],
 ['42,7–53,7 km','Entrer dans l’ultra','Calme et propre.'],
 ['53,7–62 km','Accepter la fatigue','Un kilomètre à la fois.'],
 ['62–66,3 km','Deux grosses bosses','Marche fort. Relance.'],
 ['66,3–69,7 km','Utiliser ce qu’il reste','Maintenant.']
];
$('#osoSegments').innerHTML=segments.map(x=>'<div class="oso-seg"><div class="lbl">'+x[0]+' · '+x[1]+'</div><div class="mantra">'+x[2]+'</div></div>').join('');
const assists=[
 [0,'Départ','',false],[8,'Ravito','https://maps.app.goo.gl/ayL8BANJ5RUJvzkA8',true],[13.5,'Spectateur','https://maps.app.goo.gl/tjVxyud83VEHojHG9',false],[18.8,'Ravito','https://maps.app.goo.gl/mJb8t8s1vJHdvC896',true],[23,'Spectateur','https://maps.app.goo.gl/QvQU5fN3NegVqUob7',false],[27,'Ravito','https://maps.app.goo.gl/rRzQjpBbVH8CAmRK6',true],[31.5,'Spectateur','https://maps.app.goo.gl/fTzSrdKwbbAqJbP96',false],[35,'Spectateur','https://maps.app.goo.gl/GYN7yjZBUVivxQAq6',false],[42.7,'Ravito','https://maps.app.goo.gl/b4Kvdpo4km2uQ9QG7',true],[44.4,'Spectateur','https://maps.app.goo.gl/Lmwz6fZZFYbfUK6a9',false],[47.8,'Spectateur','https://maps.app.goo.gl/iuDPCfJxEWXiiBxX6',false],[53.7,'Ravito','https://maps.app.goo.gl/WRP8EKMNC8XLei419',true],[56.6,'Spectateur','https://maps.app.goo.gl/MdDvVi4UUvdPqoBp7',false],[62,'Ravito','https://maps.app.goo.gl/nN1XPD7sZMjF2DHX6',true],[66.3,'Spectateur','https://maps.app.goo.gl/wgo2R4Pp6ukPVZ8m8',false],[69.7,'Arrivée','https://maps.app.goo.gl/dXRw8FEZRvfS4hN47',false]
];
$('#assistList').innerHTML=assists.map(a=>'<div class="assist"><b>'+a[0]+'</b><div class="'+(a[3]?'ravito':'')+'">'+a[1]+'</div>'+(a[2]?'<a class="maplink" href="'+a[2]+'" target="_blank">Maps ↗</a>':'<span></span>')+'</div>').join('');


function activityLoad(a){
  if(!a || a.km==null) return 0;
  const dp=(a.dplusGarmin!=null?a.dplusGarmin:a.dplus); return Math.max(0,(+a.km||0)+((+dp||0)/100));
}
function dateAdd(s,n){
  const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10);
}
function dateDiff(a,b){
  return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/86400000);
}
function fitnessSeries(){
  const acts=[...S.activities].filter(a=>a.date&&a.km!=null);
  if(!acts.length) return null;
  const by={};
  acts.forEach(a=>{by[a.date]=(by[a.date]||0)+activityLoad(a)});
  const dates=Object.keys(by).sort();
  const first=dates[0], last=today();
  let c=0,a=0;
  const out=[];
  let d=first;
  while(d<=last){
    const load=by[d]||0;
    c += (load-c)/42;
    a += (load-a)/7;
    out.push({date:d,load,fitness:c*7,fatigue:a*7,fresh:(c-a)*7});
    d=dateAdd(d,1);
  }
  return out;
}
function frDate(s){
  const d=new Date(s+'T12:00:00');
  return d.toLocaleDateString('fr-BE',{day:'numeric',month:'short',year:'numeric'});
}
function renderFitness(){
  const read=$('#fitnessRead'), chart=$('#fitnessChart'), recent=$('#fitnessRecent'), q=$('#fitnessQuality');
  const tooltip=$('#fitnessTooltip');
  const ser=fitnessSeries();
  if(!ser){
    read.innerHTML='<div class="metric"><b>–</b><span>Fitness</span></div><div class="metric"><b>–</b><span>Fatigue</span></div><div class="metric"><b>–</b><span>Fraîcheur</span></div>';
    recent.innerHTML='<div class="muted">Importe tes séances pour construire la courbe.</div>';
    q.textContent='aucune donnée';
    const ctx=chart.getContext('2d');ctx.clearRect(0,0,chart.width,chart.height);
    if(tooltip)tooltip.hidden=true;
    chart._fitnessState=null;
    return;
  }

  const last=ser[ser.length-1];
  const span=dateDiff(ser[0].date,ser[ser.length-1].date)+1;
  if(span<42){
    read.innerHTML='<div class="metric"><b>–</b><span>Fitness</span></div>'+
                   '<div class="metric"><b>–</b><span>Fatigue</span></div>'+
                   '<div class="metric"><b>–</b><span>Fraîcheur</span></div>'+
                   '<p class="hint" style="grid-column:1/-1;margin:2px 0 0">Seulement '+span+' jours importés : valeurs masquées pour éviter une fausse précision. Minimum 42 j, recommandé 60–90 j.</p>';
  }else{
    read.innerHTML='<div class="metric"><b style="color:var(--accent)">'+fmt(last.fitness,1)+'</b><span>Fitness</span></div>'+
                   '<div class="metric"><b style="color:var(--warn)">'+fmt(last.fatigue,1)+'</b><span>Fatigue</span></div>'+
                   '<div class="metric"><b style="color:var(--blue)">'+(last.fresh>0?'+':'')+fmt(last.fresh,1)+'</b><span>Fraîcheur</span></div>';
  }
  q.textContent=span>=365?'historique 1 an+':span>=90?'historique stable':span>=60?'historique bon':span>=42?'historique exploitable':span>=21?'historique partiel':'historique court';
  q.style.color=span>=60?'var(--ok)':span>=42?'var(--warn)':'var(--bad)';

  const ctx=chart.getContext('2d'),W=chart.width,H=chart.height;
  const padL=62,padR=20,padT=24,padB=58;

  // Last 365 calendar days, ending on the latest day in the model.
  const cutoff=dateAdd(last.date,-364);
  const view=ser.filter(p=>p.date>=cutoff);
  const vals=view.flatMap(x=>[x.fitness,x.fatigue,x.fresh]);
  let min=Math.min(0,...vals), max=Math.max(20,...vals);
  const margin=Math.max(2,(max-min)*0.05);
  min-=margin; max+=margin;
  const spanY=(max-min)||1;
  const x=i=>padL+i*(W-padL-padR)/Math.max(1,view.length-1);
  const y=v=>padT+(max-v)/spanY*(H-padT-padB);
  const cs=getComputedStyle(document.documentElement);

  function drawBase(){
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle=cs.getPropertyValue('--surface2').trim()||'#111';
    ctx.fillRect(0,0,W,H);

    // Horizontal grid
    ctx.font='19px sans-serif';
    ctx.fillStyle=cs.getPropertyValue('--muted').trim();
    ctx.strokeStyle=cs.getPropertyValue('--line').trim();
    ctx.lineWidth=1;
    for(let j=0;j<=5;j++){
      const val=min+(max-min)*j/5, yy=y(val);
      ctx.beginPath();ctx.moveTo(padL,yy);ctx.lineTo(W-padR,yy);ctx.stroke();
      ctx.fillText(fmt(val,0),8,yy+6);
    }
    if(min<0&&max>0){
      ctx.strokeStyle=cs.getPropertyValue('--muted').trim();
      ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(padL,y(0));ctx.lineTo(W-padR,y(0));ctx.stroke();
    }

    // Month separators + labels
    ctx.font='17px sans-serif';
    ctx.fillStyle=cs.getPropertyValue('--muted').trim();
    let lastMonth='';
    view.forEach((p,i)=>{
      const month=p.date.slice(0,7);
      if(month!==lastMonth){
        lastMonth=month;
        if(i>0){
          ctx.strokeStyle=cs.getPropertyValue('--line').trim();
          ctx.lineWidth=.7;
          ctx.beginPath();ctx.moveTo(x(i),padT);ctx.lineTo(x(i),H-padB);ctx.stroke();
        }
        // Show about every 2 months to avoid crowding.
        const monthIndex=(+p.date.slice(5,7)-1);
        if(monthIndex%2===0 || i===0){
          const lab=new Date(p.date+'T12:00:00').toLocaleDateString('fr-BE',{month:'short'});
          ctx.fillText(lab,x(i)+3,H-19);
        }
      }
    });

    function line(key,color,width){
      ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
      view.forEach((p,i)=>{const xx=x(i),yy=y(p[key]);if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy)});
      ctx.stroke();
    }
    line('fitness',cs.getPropertyValue('--accent').trim(),5.5);
    line('fatigue',cs.getPropertyValue('--warn').trim(),4.5);
    line('fresh',cs.getPropertyValue('--blue').trim(),3.5);
  }

  drawBase();
  chart._fitnessState={view,x,y,padL,padR,padT,padB,W,H,drawBase};

  const all=[...S.activities].filter(a=>a.date&&a.km!=null).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
  recent.innerHTML=all.length?all.map(a=>'<div class="activity"><div class="row"><div><div class="title">'+a.name+'</div><div class="sub">'+a.date+' · '+activitySub(a)+'</div></div><span class="pill">'+fmt(activityLoad(a),1)+' charge</span></div></div>').join(''):'<div class="muted">Aucune séance.</div>';
}

function fitnessPointer(e){
  const chart=$('#fitnessChart'), tip=$('#fitnessTooltip'), wrap=$('#fitnessChartWrap'), st=chart._fitnessState;
  if(!st||!st.view.length)return;
  const rect=chart.getBoundingClientRect();
  const sx=chart.width/rect.width, sy=chart.height/rect.height;
  let px=(e.clientX-rect.left)*sx;
  px=Math.max(st.padL,Math.min(st.W-st.padR,px));
  const frac=(px-st.padL)/(st.W-st.padL-st.padR);
  const i=Math.max(0,Math.min(st.view.length-1,Math.round(frac*(st.view.length-1))));
  const p=st.view[i], xx=st.x(i);

  st.drawBase();
  const ctx=chart.getContext('2d'),cs=getComputedStyle(document.documentElement);
  ctx.strokeStyle=cs.getPropertyValue('--text').trim()||'#fff';
  ctx.globalAlpha=.55;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(xx,st.padT);ctx.lineTo(xx,st.H-st.padB);ctx.stroke();ctx.globalAlpha=1;

  [['fitness','--accent'],['fatigue','--warn'],['fresh','--blue']].forEach(([key,col])=>{
    ctx.beginPath();ctx.fillStyle=cs.getPropertyValue(col).trim();ctx.arc(xx,st.y(p[key]),6,0,Math.PI*2);ctx.fill();
    ctx.lineWidth=2;ctx.strokeStyle=cs.getPropertyValue('--surface2').trim();ctx.stroke();
  });

  tip.innerHTML='<b>'+frDate(p.date)+'</b>'+
    '<div style="margin-top:5px"><span style="color:'+cs.getPropertyValue('--accent').trim()+'">●</span> Fitness&nbsp; <b>'+fmt(p.fitness,1)+'</b></div>'+
    '<div><span style="color:'+cs.getPropertyValue('--warn').trim()+'">●</span> Fatigue&nbsp; <b>'+fmt(p.fatigue,1)+'</b></div>'+
    '<div><span style="color:'+cs.getPropertyValue('--blue').trim()+'">●</span> Fraîcheur&nbsp; <b>'+(p.fresh>0?'+':'')+fmt(p.fresh,1)+'</b></div>'+
    '<div style="opacity:.72;margin-top:3px">Charge du jour : '+fmt(p.load,1)+'</div>';
  tip.hidden=false;

  // Position tooltip in CSS pixels and keep it inside the graph.
  const wrapRect=wrap.getBoundingClientRect();
  const xCss=(xx/st.W)*rect.width;
  const yCss=Math.max(8,Math.min(rect.height-112,((Math.min(st.y(p.fitness),st.y(p.fatigue),st.y(p.fresh))-12)/st.H)*rect.height));
  const tipW=165;
  let left=xCss+12;
  if(left+tipW>wrapRect.width)left=xCss-tipW-12;
  tip.style.left=Math.max(4,left)+'px';
  tip.style.top=yCss+'px';
}
(function initFitnessInteraction(){
  const chart=$('#fitnessChart'),tip=$('#fitnessTooltip');
  if(!chart||chart.dataset.interactive)return;
  chart.dataset.interactive='1';
  chart.addEventListener('pointerdown',e=>{fitnessPointer(e);try{chart.setPointerCapture(e.pointerId)}catch{}});
  chart.addEventListener('pointermove',e=>{
    if(e.pointerType==='mouse'||chart.hasPointerCapture?.(e.pointerId))fitnessPointer(e);
  });
  chart.addEventListener('pointerleave',e=>{
    if(e.pointerType==='mouse'){
      const st=chart._fitnessState;if(st)st.drawBase();
      if(tip)tip.hidden=true;
    }
  });
  chart.addEventListener('dblclick',()=>{
    const st=chart._fitnessState;if(st)st.drawBase();
    if(tip)tip.hidden=true;
  });
})();

function loadSettings(){for(const k of ['z1','z2','z3','z4','hrmax','weightRef'])$('#'+k).value=S.settings[k]??''}
loadSettings();$('#saveSettings').onclick=()=>{for(const k of ['z1','z2','z3','z4','hrmax','weightRef'])S.settings[k]=+$('#'+k).value||S.settings[k];save();toast('Réglages enregistrés')};

function download(name,content,type='application/json'){const b=new Blob([content],{type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),500)}
$('#exportData').onclick=()=>download('sylvain-training-backup.json',JSON.stringify(S,null,2));
$('#importJson').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{S=JSON.parse(await f.text());save();location.reload()}catch{toast('Sauvegarde invalide')}};
$('#resetAll').onclick=()=>{if(confirm('Tout effacer ?')){safeRemove(storeKey);location.reload()}};

/* V3.1 : initialise explicitement toutes les vues, y compris les pages séparées. */
try{renderActivities();}catch(e){console.error('renderActivities',e)}
try{renderPlans();}catch(e){console.error('renderPlans',e)}
try{renderAnalysis();}catch(e){console.error('renderAnalysis',e)}
try{renderNutri();}catch(e){console.error('renderNutri',e)}
try{renderPain();}catch(e){console.error('renderPain',e)}
try{renderFitness();}catch(e){console.error('renderFitness',e)}
try{loadMorning(today());renderReadiness();drawMorning();renderHealthInfo();}catch(e){console.error('renderMorning',e)}
save();

})();
