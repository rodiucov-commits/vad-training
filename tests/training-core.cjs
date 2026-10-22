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
test('Dated programme weeks beat legacy ISO slots, including rest days and year rollover',()=>{
 const programmes={1:{0:{date:'2026-10-19'},3:{date:'2026-10-22'}},2:{0:{date:'2026-10-26'}},43:{3:{title:'Old strength'}}};
 assert.equal(C.currentProgrammeWeek(programmes,new Date(2026,9,22,12)),1);
 assert.equal(C.currentProgrammeWeek(programmes,new Date(2026,9,25,12)),1);
 assert.equal(C.currentProgrammeWeek(programmes,new Date(2026,9,26,12)),2);
 assert.equal(C.currentProgrammeWeek({12:{0:{date:'2026-12-28'}}},new Date(2027,0,1,12)),12);
 assert.equal(C.currentProgrammeWeek({42:{}},new Date(2026,9,15,12)),42);
});
test('A stale cached week is corrected again when dated cloud data arrives',()=>{
 const now=new Date(2026,9,22,12),local=C.selectCurrentWeek({programme:{43:{}},selectedWeek:43,results:[{id:'saved'}]},now);
 const snap={programme:{1:{3:{date:'2026-10-22'}}},results:[{id:'saved'}]};
 const current=C.selectCurrentWeek(C.reconcile(local,snap),now);
 assert.equal(current.selectedWeek,1);assert.deepEqual(current.results,[{id:'saved'}]);assert.equal(current.programme[43]!=null,true);
});
test('Manual browsing survives same-day reload but Today and a new day use programme dates',()=>{
 const now=new Date(2026,9,22,12),manual={programme:{1:{0:{date:'2026-10-19'}}},selectedWeek:2,_weekSelectionMode:'manual',_weekSelectionDate:'2026-10-22'};
 assert.equal(C.selectCurrentWeek(manual,now).selectedWeek,2);
 assert.equal(C.selectCurrentWeek(manual,now,true).selectedWeek,1);
 assert.equal(C.selectCurrentWeek(manual,new Date(2026,9,23,12)).selectedWeek,1);
});
test('Repeated weekly guidance is shown once without losing day-specific instructions',()=>{
 const shared='Programme guidance: use the appropriate modifications and respect the prescribed progression. Stop if symptoms worsen.';
 const days={0:{notes:shared+' Monday: rest three minutes.',blocks:[{}]},3:{notes:shared+' Thursday: complete both sides.',blocks:[{}]}};
 const original=JSON.stringify(days),out=C.programmeNotes(days);
 assert.equal(out.shared,shared);assert.equal(out.dayNotes[0],'Monday: rest three minutes.');assert.equal(out.dayNotes[3],'Thursday: complete both sides.');assert.equal(JSON.stringify(days),original);
 assert.equal(C.programmeNotes({0:days[0]}).shared,'');
 assert.equal(C.programmeNotes({0:days[0],1:{notes:'Different important instruction',blocks:[{}]}}).shared,'');
 assert.equal(C.programmeNotes({0:{notes:shared,blocks:[{}]},1:{notes:shared,blocks:[{}]}}).dayNotes[1],'');
});
