const test=require('node:test'),assert=require('node:assert/strict'),C=require('../training-core.js');
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}};
const sample=()=>({week:42,days:{1:{date:'2026-10-13',title:'Engine',notes:'Important day notes',blocks:[{id:'engine',type:'EMOM',name:'Engine',config:{rounds:20},exerciseId:'engine-emom'}]}}});
test('Both import paths preserve metadata and reject invalid numeric config',()=>{
 const p=C.programme(sample());assert.equal(p.days[1].notes,'Important day notes');assert.equal(p.days[1].date,'2026-10-13');assert.equal(p.days[1].blocks[0].exerciseId,'engine-emom');
 for(const config of [{rounds:-2},{workSec:'invalid'},{restSec:-1},{sides:1.5},{weightKg:NaN}])assert.throws(()=>C.block({type:'INTERVALS',name:'Invalid',config}));
 assert.throws(()=>C.programme({week:42,days:{}}));assert.throws(()=>C.programme({...sample(),week:0}));
 const dup=sample();dup.days[1].blocks.push({...dup.days[1].blocks[0]});assert.throws(()=>C.programme(dup));
});
test('Persistent outbox retains failed writes and retries after reload',async()=>{
 const storage=memory();let online=false,seen=[];
 const q=C.outbox(storage,'vad',async j=>{if(!online)throw Error('offline');seen.push(j.payload.id)});
 q.enqueue('result',{id:'one'});await new Promise(r=>setImmediate(r));assert.equal(q.list().length,1);q.stop();
 online=true;const restored=C.outbox(storage,'vad',async j=>seen.push(j.payload.id));await restored.flush();assert.deepEqual(seen,['one']);assert.equal(restored.list().length,0);
});
test('Profile queues are independent and storage failure is not success',async()=>{
 const s=memory();const q=C.outbox(s,'vad',async()=>{throw Error('offline')});q.enqueue('result',{id:'vad-only'});assert.equal(C.outbox(s,'tatka',async()=>{}).list().length,0);
 const full={getItem:()=>null,setItem:()=>{throw Error('quota')}};const bad=C.outbox(full,'q',async()=>assert.fail());assert.throws(()=>bad.enqueue('result',{id:'x'}));assert.equal(bad.list().length,0);
});
test('Pending local programme/generator edits survive stale snapshots',()=>{
 const local={programme:{42:{local:true}},results:[],generator:{focus:'new'}};
 const snap={programme:{42:{old:true}},results:[],generator:{focus:'old'}};
 const merged=C.reconcile(local,snap,[{kind:'programme',payload:{week:42,days:{local:true}}},{kind:'generator',payload:{}}]);assert.equal(merged.programme[42].local,true);assert.equal(merged.generator.focus,'new');
});
test('Server deletions and pending result edits do not resurrect old records',()=>{
 const old={id:'old',date:'2026-10-13'},replacement={id:'new',date:'2026-10-14'};
 const local={programme:{42:{old:true}},results:[old,replacement],_serverWeeks:['42'],_serverResultIds:['old']};
 const snap={programme:{},results:[old]};const r=C.reconcile(local,snap,[{kind:'replaceResult',payload:{previousId:'old',result:replacement}}]);assert(!r.programme[42]);assert.deepEqual(r.results.map(x=>x.id),['new']);
 assert.equal(C.reconcile(local,{programme:{},results:[]}).results.some(x=>x.id==='old'),false);
});
test('Charts compare workout-specific scores, not prescribed duration',()=>{
 assert.equal(C.metric({mode:'amrap',timeSec:1200,rounds:7,extraReps:8}).value,7);
 assert.equal(C.metric({mode:'fortime',timeSec:389}).higher,false);assert.equal(C.metric({mode:'fortime',timeSec:600,capped:true}),null);
 assert.equal(C.metric({mode:'emom',timeSec:1200}),null);assert.equal(C.metric({mode:'rest',weightKg:80,completed:false}),null);
 assert.equal(C.exerciseKey({blockName:'Back Squat — 4×6 @ 80kg',value:{mode:'rest'}}),C.exerciseKey({blockName:'Back Squat — 4×6 @ 85kg',value:{mode:'rest'}}));
});
test('Calendar and editable result times use explicit valid formats',()=>{
 assert.deepEqual(C.isoWeek(new Date('2026-10-15T12:00:00Z')),{year:2026,week:42});assert.equal(C.weekDate(42,1,2026),'2026-10-13');assert.equal(C.parseTime('06:29'),389);assert.equal(C.parseTime('1:02:03'),3723);assert.throws(()=>C.parseTime('02:99'));
});
