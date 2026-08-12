(()=>{
'use strict';
const GT='America/Guatemala';
const OPEN_START=9*3600, TARGET_END=20*3600+30*60, OPEN_END=23*3600;
const TARGET_SECONDS=TARGET_END-OPEN_START; // 11 h 30 min
const GUN_RATE=100, MACHINE_RATE=200, MACHINE_DAILY_TARGET=2300, DAILY_TARGET=4600;
const MACHINE_PER_MIN=MACHINE_RATE/60, MACHINE_PER_SEC=MACHINE_RATE/3600;
const SERIAL={1:'SK984681DMX',2:'SK984682DMX'};
const ENROLL_HASH='59ae337c539fd8b3c45e33ee7dabb98fef22d690a26a4e24d0a56cf870626e88';
const PROFILE_KEY='BLEXXON_XELA_PROFILE_Q2300_V1';
const TRUST_KEY='BLEXXON_XELA_TRUST_Q2300_V1';

const login=document.getElementById('loginView'), app=document.getElementById('app');
const setupView=document.getElementById('setupView'), verifyView=document.getElementById('verifyView'), trustedView=document.getElementById('trustedView');
const setupForm=document.getElementById('setupForm'), setupUser=document.getElementById('setupUser'), setupPass=document.getElementById('setupPass'), setupPass2=document.getElementById('setupPass2'), setupPhone=document.getElementById('setupPhone'), setupEnroll=document.getElementById('setupEnroll');
const setupError=document.getElementById('setupError'), verifyError=document.getElementById('verifyError'), otpInput=document.getElementById('otpInput'), smsLink=document.getElementById('smsLink');
let pendingRegistration=null, pendingOtp='', authGranted=false;
let voltage={1:432.0,2:439.0};

const $=(sel)=>document.querySelector(sel);
const set=(sel,v)=>{const e=$(sel);if(e&&e.textContent!==String(v))e.textContent=String(v)};
const money=(n)=>'Q'+Number(n).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2});
const watts=(n)=>Math.max(0,Math.round(n)).toLocaleString('es-GT')+' W';
const hms=(n)=>{n=Math.max(0,Math.floor(n));return `${String(Math.floor(n/3600)).padStart(2,'0')}:${String(Math.floor((n%3600)/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
const showAuth=(view)=>{[setupView,verifyView,trustedView].forEach(v=>v.classList.remove('active'));view.classList.add('active')};
const randomId=()=>{if(crypto.randomUUID)return crypto.randomUUID();const a=new Uint8Array(16);crypto.getRandomValues(a);return [...a].map(x=>x.toString(16).padStart(2,'0')).join('')};
const deviceLabel=()=>{const ua=navigator.userAgent||'';if(/iPhone/i.test(ua))return 'iPhone · navegador registrado';if(/iPad/i.test(ua))return 'iPad · navegador registrado';if(/Android/i.test(ua))return 'Android · navegador registrado';if(/Windows/i.test(ua))return 'Windows · navegador registrado';if(/Mac/i.test(ua))return 'Mac · navegador registrado';return 'Navegador registrado'};
async function sha256(v){const b=new TextEncoder().encode(String(v));const d=await crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function loadProfile(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')}catch(_ ){return null}}
function loadTrust(){try{return JSON.parse(localStorage.getItem(TRUST_KEY)||'null')}catch(_ ){return null}}
function saveTrusted(profile){localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));localStorage.setItem(TRUST_KEY,JSON.stringify({deviceId:profile.deviceId,verifiedAt:profile.verifiedAt}))}
function bootAuth(){const p=loadProfile(),t=loadTrust();if(p&&t&&p.deviceId===t.deviceId){document.getElementById('deviceIdText').textContent='BX-'+p.deviceId.slice(0,8).toUpperCase();document.getElementById('deviceLabelText').textContent=p.deviceLabel||deviceLabel();showAuth(trustedView)}else{showAuth(setupView)}}

setupForm.addEventListener('submit',async(e)=>{
  e.preventDefault();setupError.textContent='';
  const u=setupUser.value.trim(),p=setupPass.value,p2=setupPass2.value,phone=setupPhone.value.trim(),enroll=setupEnroll.value.trim().toUpperCase();
  if(u.length<3){setupError.textContent='El usuario debe tener al menos 3 caracteres.';return}
  if(p.length<6){setupError.textContent='La clave debe tener al menos 6 caracteres.';return}
  if(p!==p2){setupError.textContent='Las claves no coinciden.';return}
  if(phone.replace(/\D/g,'').length<8){setupError.textContent='Ingrese un número de celular válido.';return}
  if(await sha256(enroll)!==ENROLL_HASH){setupError.textContent='Código de activación incorrecto.';return}
  pendingOtp=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');
  pendingRegistration={username:u,passwordHash:await sha256(p),phone,deviceId:randomId(),deviceLabel:deviceLabel(),verifiedAt:null};
  const sep=/iPhone|iPad|Mac/i.test(navigator.userAgent)?'&':'?';
  smsLink.href=`sms:${encodeURIComponent(phone)}${sep}body=${encodeURIComponent('BLEXXON XELA · Código de verificación: '+pendingOtp)}`;
  otpInput.value='';verifyError.textContent='';showAuth(verifyView);
});

document.getElementById('showOtpBtn').addEventListener('click',()=>{verifyError.textContent=pendingOtp?'Código local de respaldo: '+pendingOtp:'No hay verificación pendiente.'});
document.getElementById('verifyBtn').addEventListener('click',()=>{
  verifyError.textContent='';
  if(!pendingRegistration||!pendingOtp){verifyError.textContent='Reinicie el registro inicial.';return}
  if(otpInput.value.trim()!==pendingOtp){verifyError.textContent='Código de verificación incorrecto.';return}
  pendingRegistration.verifiedAt=new Date().toISOString();saveTrusted(pendingRegistration);authGranted=true;openPanel();pendingRegistration=null;pendingOtp='';
});
document.getElementById('trustedLoginBtn').addEventListener('click',()=>{const p=loadProfile(),t=loadTrust();if(p&&t&&p.deviceId===t.deviceId){authGranted=true;openPanel()}});
document.getElementById('resetDeviceBtn').addEventListener('click',()=>{if(confirm('¿Restablecer el registro de este navegador?')){localStorage.removeItem(PROFILE_KEY);localStorage.removeItem(TRUST_KEY);location.reload()}});

function parts(d=new Date()){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:GT,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d);
  return Object.fromEntries(p.filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
}
function stamp(d=new Date()){const p=parts(d);return `${String(p.day).padStart(2,'0')}/${String(p.month).padStart(2,'0')}/${p.year} ${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')}:${String(p.second).padStart(2,'0')}`}
function state(d=new Date()){
  const p=parts(d),sod=p.hour*3600+p.minute*60+p.second;
  const withinHours=sod>=OPEN_START&&sod<OPEN_END;
  const producing=sod>=OPEN_START&&sod<TARGET_END;
  const targetReached=sod>=TARGET_END&&sod<OPEN_END;
  const elapsedToTarget=Math.max(0,Math.min(TARGET_SECONDS,sod-OPEN_START));
  const remainingToTarget=Math.max(0,TARGET_SECONDS-elapsedToTarget);
  const progress=100*elapsedToTarget/TARGET_SECONDS;
  return {p,sod,withinHours,producing,targetReached,elapsedToTarget,remainingToTarget,progress};
}
function generatedPerMachine(elapsed){return Math.min(MACHINE_DAILY_TARGET,MACHINE_RATE*(elapsed/3600))}
function updateVoltages(){
  const step=Math.floor(Date.now()/3000);
  for(const m of [1,2]){
    const base=m===1?432.5:439.5;
    const wave=Math.sin((step+m*2)*.78)*6.8+Math.cos((step+m*5)*.31)*2.9;
    voltage[m]=Math.max(m===1?420.0:426.0,Math.min(m===1?444.0:451.0,base+wave));
  }
}
function powerFor(m,st){
  if(!st.withinHours)return 0;
  if(st.targetReached)return m===1?6900:7200;
  const base=m===1?112500:118800,step=Math.floor(Date.now()/3000);
  return base+Math.sin((step+m)*.51)*6200+Math.cos((step+m*3)*.26)*3100;
}
function batteryFor(m,st){
  if(st.sod<OPEN_START)return m===1?98.0:97.5;
  const ratio=Math.max(0,Math.min(1,st.elapsedToTarget/TARGET_SECONDS));
  const baseStart=m===1?98.0:97.5,drop=m===1?56:53;
  const wiggle=Math.sin(Math.floor(Date.now()/3000)*(m===1?.22:.19))*0.35;
  return Math.max(m===1?41.5:43.5,baseStart-drop*ratio+wiggle);
}
function update(){
  if(!authGranted||app.classList.contains('view-hidden')||app.style.display==='none')return;
  const st=state(),perToday=generatedPerMachine(st.elapsedToTarget),totalToday=perToday*2;
  const currentMachine=st.producing?MACHINE_RATE:0,currentTotal=currentMachine*2;
  const p1=powerFor(1,st),p2=powerFor(2,st),totalPower=p1+p2,avg=(voltage[1]+voltage[2])/2;
  const phase=!st.withinHours?'JORNADA FINALIZADA':st.producing?'PRODUCCIÓN ACTIVA · META Q2,300/MÁQUINA':'META DIARIA ALCANZADA · MONITOREO';
  set('#clock',`${String(st.p.hour).padStart(2,'0')}:${String(st.p.minute).padStart(2,'0')}:${String(st.p.second).padStart(2,'0')} · Guatemala`);
  set('#operation',!st.withinHours?'JORNADA FINALIZADA · 09:00–23:00':st.producing?'OPERANDO · Q200/h POR MÁQUINA':'META ALCANZADA · Q4,600');
  set('#kpiState',phase);set('#kpiNow',money(currentTotal)+'/h');set('#kpiToday',money(totalToday));set('#kpiPower',watts(totalPower));set('#kpiVoltage',avg.toFixed(1)+' V');
  set('#passed',hms(st.elapsedToTarget));set('#remaining',hms(st.remainingToTarget));
  const cs=$('#cycleState'),cb=$('#cycleBar');if(cs){cs.textContent=phase;cs.className='cycle-state '+(!st.withinHours?'closed':'')}if(cb)cb.style.width=st.progress.toFixed(2)+'%';
  for(const m of [1,2]){
    const power=m===1?p1:p2,pct=batteryFor(m,st);
    set(`[data-voltage="${m}"]`,voltage[m].toFixed(1)+' V · dinámico · act. 3 s');set(`[data-power="${m}"]`,watts(power));
    set(`[data-hour="${m}"]`,money(currentMachine)+'/h');set(`[data-gun-a="${m}"]`,money(st.producing?GUN_RATE:0)+'/h');set(`[data-gun-b="${m}"]`,money(st.producing?GUN_RATE:0)+'/h');set(`[data-capacity="${m}"]`,money(st.producing?MACHINE_RATE:0)+'/h');set(`[data-today="${m}"]`,money(perToday));set(`[data-phase="${m}"]`,phase);
    const status=$(`[data-status="${m}"]`);if(status){status.textContent=!st.withinHours?'JORNADA FINALIZADA':st.producing?'2 / 2 PISTOLAS · PRODUCCIÓN ACTIVA':'META Q2,300 ALCANZADA';status.className='status '+(!st.withinHours?'closed':'')}
    set(`[data-bat-pct="${m}"]`,pct.toFixed(1)+'%');set(`[data-bat-load="${m}"]`,st.withinHours?'Consumo asignado: '+watts(power):'Consumo asignado: 0 W');set(`[data-bat-status="${m}"]`,!st.withinHours?'Protegida · jornada finalizada':st.producing?`Descarga media-rápida · suministro M0${m}`:`Meta alcanzada · reserva estabilizada M0${m}`);const bar=$(`[data-bat-bar="${m}"]`);if(bar)bar.style.width=pct.toFixed(1)+'%';
  }
  set('#reportTime',stamp());set('#reportNow',money(currentTotal)+'/h');set('#reportToday',money(totalToday));set('#reportPhase',phase);
}
function xmlEscape(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function cell(v,type='String',style='Cell'){return `<Cell ss:StyleID="${style}"><Data ss:Type="${type}">${xmlEscape(v)}</Data></Cell>`}
function exportExcel(){
  const now=new Date(),st=state(now),perToday=generatedPerMachine(st.elapsedToTarget),totalToday=perToday*2,currentGun=st.producing?GUN_RATE:0,currentMachine=currentGun*2,p1=powerFor(1,st),p2=powerFor(2,st),phase=!st.withinHours?'JORNADA FINALIZADA':st.producing?'PRODUCCIÓN ACTIVA':'META ALCANZADA';
  const rows=[
    ['REPORTE PRIVADO XELA · JAVIER RAMÍREZ','','','','','','','','','','','','','','','',''],
    ['Socio','Sucursal','Fecha y hora','Máquina','Serie','Fase','Voltaje (V)','Consumo (W)','Pistola 1 Q/h','Pistola 2 Q/h','Producción Q/h','Q/min','Q/seg','Generado hoy Q','Meta diaria Q','Batería','Tiempo meta'],
    ['Javier Ramírez','Xela',stamp(now),'M01',SERIAL[1],phase,voltage[1].toFixed(1),Math.round(p1),currentGun.toFixed(2),currentGun.toFixed(2),currentMachine.toFixed(2),MACHINE_PER_MIN.toFixed(4),MACHINE_PER_SEC.toFixed(5),perToday.toFixed(2),MACHINE_DAILY_TARGET.toFixed(2),'Batería 1','11:30:00'],
    ['Javier Ramírez','Xela',stamp(now),'M02',SERIAL[2],phase,voltage[2].toFixed(1),Math.round(p2),currentGun.toFixed(2),currentGun.toFixed(2),currentMachine.toFixed(2),MACHINE_PER_MIN.toFixed(4),MACHINE_PER_SEC.toFixed(5),perToday.toFixed(2),MACHINE_DAILY_TARGET.toFixed(2),'Batería 2','11:30:00'],
    ['TOTAL','','','','','',((voltage[1]+voltage[2])/2).toFixed(1),Math.round(p1+p2),(currentGun*2).toFixed(2),(currentGun*2).toFixed(2),(currentMachine*2).toFixed(2),(MACHINE_PER_MIN*2).toFixed(4),(MACHINE_PER_SEC*2).toFixed(5),totalToday.toFixed(2),DAILY_TARGET.toFixed(2),'B1 + B2','11:30:00']
  ];
  const body=rows.map((row,ri)=>`<Row>${row.map((v,ci)=>cell(v,(ri>=2&&ri<=4&&ci>=6&&ci<=14)?'Number':'String',ri===0?'Title':ri===1?'Head':ri===4?'Total':'Cell')).join('')}</Row>`).join('');
  const xml=`<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Cell"><Font ss:FontName="Aptos" ss:Size="11"/></Style><Style ss:ID="Title"><Font ss:FontName="Aptos" ss:Size="16" ss:Bold="1" ss:Color="#0A6B55"/></Style><Style ss:ID="Head"><Font ss:FontName="Aptos" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0B4963" ss:Pattern="Solid"/></Style><Style ss:ID="Total"><Font ss:FontName="Aptos" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#DDF6EA" ss:Pattern="Solid"/></Style></Styles><Worksheet ss:Name="Reporte Xela"><Table>${body}</Table></Worksheet></Workbook>`;
  const blob=new Blob([xml],{type:'application/vnd.ms-excel;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a'),p=parts(now);a.href=url;a.download=`Reporte_Xela_Javier_${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}_${String(p.hour).padStart(2,'0')}-${String(p.minute).padStart(2,'0')}.xls`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function openPanel(){if(!authGranted)return;login.style.display='none';app.classList.remove('view-hidden');app.style.display='block';updateVoltages();update();try{window.scrollTo({top:0,left:0,behavior:'instant'})}catch(_){window.scrollTo(0,0)}}
$('#logout').addEventListener('click',()=>{authGranted=false;app.classList.add('view-hidden');app.style.display='none';login.style.display='grid';bootAuth()});
$('#excel').addEventListener('click',exportExcel);
bootAuth();updateVoltages();setInterval(updateVoltages,3000);setInterval(update,1000);
})();