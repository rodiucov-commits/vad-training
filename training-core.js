/* Data validation, profile-local durable sync and workout-aware comparisons. */
(function(root){
'use strict';
const TYPES=['WARMUP','COOLDOWN','STRENGTH','CORE','AMRAP','FOR_TIME','EMOM','INTERVALS','HOLD'];
const clone=x=>JSON.parse(JSON.stringify(x));
const uuid=()=>root.crypto?.randomUUID?.() || Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
function block(b,where='Block') {
 if(!b || typeof b!=='object' || Array.isArray(b))throw Error(where+': expected a block object');
 const type=String(b.type||'').toUpperCase();if(!TYPES.includes(type))throw Error(where+': unknown block type');
 if(!String(b.name||'').trim())throw Error(where+': missing name');
 if(b.config!=null && (typeof b.config!=='object'||Array.isArray(b.config)))throw Error(where+': config must be an object');
 const config={...(b.config||{})};
 for(const key of ['sets','reps','rounds','minutes','capMinutes','workSec','restSec','seconds','sides','weightKg'])if(key in config){
  const n=Number(config[key]);const zero=['restSec','weightKg'].includes(key);
  if(config[key]===''||!Number.isFinite(n)||n<(zero?0:1)||n>86400)throw Error(`${where}: invalid ${key}`);
  if(['sets','reps','rounds','sides'].includes(key)&&(!Number.isInteger(n)||n>1000))throw Error(`${where}: ${key} must be a positive integer ≤ 1000`);
  config[key]=n;
 }
 if(config.minuteCycle!=null){if(!Array.isArray(config.minuteCycle)||!config.minuteCycle.length||config.minuteCycle.length>60)throw Error(where+': invalid minuteCycle');config.minuteCycle=config.minuteCycle.map(s=>{if(!s||!String(s.label||'').trim()||!['work','rest'].includes(s.phase))throw Error(where+': invalid station');return {label:String(s.label),phase:s.phase};});}
 if(config.includeFinalRest!=null&&typeof config.includeFinalRest!=='boolean')throw Error(where+': includeFinalRest must be true or false');
 return {...b,id:String(b.id||'b_'+uuid()),type,name:String(b.name),config,movements:Array.isArray(b.movements)?b.movements.map(String):[],notes:String(b.notes||'')};
}
function day(d,where='Day'){
 if(!d||typeof d!=='object'||!Array.isArray(d.blocks)||!d.blocks.length)throw Error(where+': blocks must be a non-empty array');
 const blocks=d.blocks.map((b,i)=>block(b,`${where}, block ${i+1}`));
 if(new Set(blocks.map(b=>b.id)).size!==blocks.length)throw Error(where+': duplicate block IDs');
 if(d.date!=null&&(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||(!Number.isFinite(Date.parse(d.date))||new Date(d.date).toISOString().slice(0,10)!==d.date)))throw Error(where+': invalid date (use YYYY-MM-DD)');
 return {...d,title:String(d.title||''),notes:String(d.notes||''),blocks};
}
function programme(json,targetWeek){
 const week=Number(json?.week??targetWeek);if(!Number.isInteger(week)||week<1||week>53)throw Error('Week must be 1–53');
 if(!json?.days||typeof json.days!=='object'||Array.isArray(json.days)||!Object.keys(json.days).length)throw Error('days must contain at least one training day (0–6)');
 const days={};const ids=new Set();
 for(const [key,value] of Object.entries(json.days)){
  if(!/^[0-6]$/.test(key))throw Error('Day must be 0–6');days[key]=day(value,'Day '+key);
  for(const b of days[key].blocks){if(ids.has(b.id))throw Error('Duplicate block ID across days: '+b.id);ids.add(b.id);}
 }
 return {week,days};
}
function exerciseKey(r){
 if(r.exerciseId)return r.exerciseId;
 const mode=r.value?.mode||r.type||'workout';let name=String(r.blockName||r.name||'').trim();
 if(mode==='rest'||mode==='STRENGTH')name=name.replace(/\s*[—–]\s*\d.*$/,'').replace(/\s*@\s*[\d.]+\s*kg.*$/i,'');
 return mode+':'+name.toLowerCase().replace(/\s+/g,' ');
}
function metric(value){
 if(value.completed===false)return null;
 if(value.mode==='amrap')return {value:Number(value.rounds||0),extra:Number(value.extraReps||0),unit:'rounds',higher:true};
 if(value.mode==='fortime')return value.capped?null:{value:Number(value.timeSec),unit:'s',higher:false};
 if(value.weightKg!=null)return {value:Number(value.weightKg),unit:'kg',higher:true};
 if(value.reps!=null)return {value:Number(value.reps),unit:'reps',higher:true};
 if(value.calories!=null)return {value:Number(value.calories),unit:'cal',higher:true};
 if(value.mode==='circuit')return {value:Number(value.roundsCompleted||0),unit:'rounds',higher:true};
 return null; // Prescribed duration / completed sets are not a performance PR.
}
function isoWeek(now=new Date()){
 const d=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
 const year=d.getUTCFullYear();return {year,week:Math.ceil((((d-new Date(Date.UTC(year,0,1)))/86400000)+1)/7)};
}
function weekDate(week,day,year=isoWeek().year){const d=new Date(Date.UTC(year,0,4));d.setUTCDate(d.getUTCDate()-(d.getUTCDay()||7)+1+(Number(week)-1)*7+Number(day));return d.toISOString().slice(0,10);}
function parseTime(text){
 if(typeof text==='number'&&Number.isFinite(text)&&text>=0)return text;
 if(!/^\d+(?::[0-5]\d){0,2}$/.test(String(text).trim()))throw Error('Time must be seconds, mm:ss or hh:mm:ss');
 return String(text).trim().split(':').reduce((n,v)=>n*60+Number(v),0);
}
function outbox(storage,key,execute,onState=()=>{}){
 let running=false,stopped=false;let jobs=JSON.parse(storage.getItem(key)||'[]');if(!Array.isArray(jobs))throw Error('Invalid pending-change queue');
 const persist=()=>storage.setItem(key,JSON.stringify(jobs));
 const report=state=>{if(!stopped)onState(state,jobs.length);};
 const api={
  list:()=>clone(jobs),stop(){stopped=true;},
  enqueue(kind,payload){const old=jobs;const candidate={id:uuid(),kind,payload:clone(payload)};
   jobs=[...jobs,candidate];try{persist();}catch(e){jobs=old;report('offline');throw e;}report(running?'syncing':'offline');void api.flush();return candidate.id;},
  async flush(){if(running||stopped)return false;running=true;report('syncing');
   try{while(jobs.length&&!stopped){const current=jobs[0];await execute(current);const old=jobs;jobs=jobs.filter(j=>j.id!==current.id);try{persist();}catch(e){jobs=old;throw e;}}
    report(jobs.length?'offline':'synced');return !jobs.length;
   }catch(e){report('offline');return false;}finally{running=false;}
  }
 };return api;
}
function reconcile(local,snap,jobs=[]){
 const pendingWeeks=new Map(),deleted=new Set(),pendingResults=new Set();
 for(const {kind,payload:p} of jobs){
  if(kind==='programme')pendingWeeks.set(String(p.week),p.days);
  if(kind==='clearWeek')pendingWeeks.set(String(p.week),null);
  if(kind==='result')pendingResults.add(p.id);
  if(kind==='replaceResult'){deleted.add(p.previousId);pendingResults.add(p.result.id);}
  if(kind==='deleteResult')deleted.add(p.id);
 }
 const programme={...(local.programme||{}),...(snap.programme||{})};
 for(const key of local._serverWeeks||[])if(!(key in (snap.programme||{}))&&!pendingWeeks.has(String(key)))delete programme[key];
 for(const [key,value] of pendingWeeks)value===null?delete programme[key]:programme[key]=value;
 const server=snap.results||[],serverIds=new Set(server.map(r=>r.id)),known=new Set(local._serverResultIds||[]),results=new Map();
 for(const r of local.results||[])if(!deleted.has(r.id)&&(!known.has(r.id)||serverIds.has(r.id)||pendingResults.has(r.id)))results.set(r.id,r);
 for(const r of server)if(!deleted.has(r.id)&&!pendingResults.has(r.id))results.set(r.id,r);
 return {...local,programme,results:[...results.values()].sort((a,b)=>new Date(b.date)-new Date(a.date)),generator:jobs.some(j=>j.kind==='generator')?local.generator:(snap.generator||local.generator),
  _serverWeeks:Object.keys(snap.programme||{}),_serverResultIds:server.map(r=>r.id)};
}
const api={block,day,programme,exerciseKey,metric,isoWeek,weekDate,parseTime,outbox,reconcile,uuid};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.TrainingCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
