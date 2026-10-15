const assert=require('node:assert/strict');
const C=require('../timer-engine.js');
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
check('Alternating 12-minute EMOM retains 6 work and 6 rest minutes',()=>{
 const t=C.fromBlock({type:'EMOM',config:{rounds:12},notes:'Every minute: odd minutes = Bike + pull-ups; even minutes = rest. 6 work intervals total.'});
 const p=C.build(t.mode,t.config);assert.equal(p.totalSec,720);assert.equal(p.segments.filter(s=>s.phase==='work').length,6);
 for(const [t,phase] of [[0,'work'],[59.99,'work'],[60,'rest'],[119.99,'rest'],[120,'work']])assert.equal(C.at(p,t).segment.phase,phase);
 assert.equal(C.at(p,360).done,false);assert.equal(C.at(p,719.99).done,false);assert.equal(C.at(p,720).done,true);
});
check('20-minute Engine cycles Bike, step-ups, sled, rest five times',()=>{
 const t=C.fromBlock({type:'EMOM',config:{rounds:20},movements:['Min 1: Bike','Min 2: Step-ups','Min 3: Sled','Min 4: Rest / easy walk']});
 const p=C.build(t.mode,t.config);assert.equal(p.totalSec,1200);
 for(let i=0;i<20;i++){const x=C.at(p,i*60).segment;assert.equal(x.label,['Bike','Step-ups','Sled','Rest / easy walk'][i%4]);assert.equal(x.phase,i%4===3?'rest':'work');assert.equal(x.round,Math.floor(i/4)+1);}
 assert.equal(C.at(p,1199.99).done,false);assert.equal(C.at(p,1200).done,true);
});
check('Explicit rest and warmup durations, not untimed or ranged durations',()=>{
 assert.deepEqual(C.fromBlock({type:'WARMUP',name:'Rest 4 min'}),{mode:'countdown',config:{countdownSec:240}});
 assert.equal(C.fromBlock({type:'WARMUP',name:'Mobility — 8 min'}).config.countdownSec,480);
 assert.equal(C.fromBlock({type:'WARMUP',name:'Warm-up — 10 min (untimed)'}).mode,'stopwatch');
 assert.equal(C.fromBlock({type:'COOLDOWN',name:'5–10 min easy'}).mode,'stopwatch');
});
check('Untimed/core circuits preserve round and rest prescriptions',()=>{
 assert.deepEqual(C.fromBlock({type:'CORE',name:'Core circuit',config:{rounds:3,restSec:45}}),{mode:'circuit',config:{restSets:3,restSec:45,includeFinalRest:false}});
 assert.equal(C.fromBlock({type:'WARMUP',name:'Strength — 4 rounds (untimed; log each round)'}).config.restSets,4);
});
check('Intervals finish after final work unless final rest explicitly requested',()=>{
 const cfg={intRounds:4,intWork:300,intRest:60};const p=C.build('intervals',cfg);
 assert.equal(p.totalSec,1380);assert.equal(C.at(p,299.99).segment.phase,'work');assert.equal(C.at(p,300).segment.phase,'rest');assert.equal(C.at(p,360).segment.round,2);
 assert.equal(C.at(p,1379.99).done,false);assert.equal(C.at(p,1380).done,true);
 assert.equal(C.build('intervals',{...cfg,includeFinalRest:true}).totalSec,1440);
});
check('Partial intervals count completed work bouts, not the current bout',()=>{
 const p=C.build('intervals',{intRounds:4,intWork:300,intRest:60});
 assert.equal(C.score(p,1).intervalsCompleted,0);assert.equal(C.score(p,300).intervalsCompleted,1);assert.equal(C.score(p,361).intervalsCompleted,1);assert.equal(C.score(p,1380).intervalsCompleted,4);assert.equal(C.score(p,1380).timeSec,1380);
});
check('Hold state and total score survive multiple boundaries / delayed ticks',()=>{
 const p=C.build('hold',{holdSec:20,holdSides:2,holdRounds:3});
 assert.equal(p.totalSec,120);assert.equal(C.at(p,20).segment.side,2);assert.equal(C.at(p,40).segment.round,2);assert.equal(C.at(p,95).segment.side,1);assert.equal(C.at(p,95).segment.round,3);
 assert.equal(C.score(p,120).timeSec,120);assert.equal(C.score(p,120).roundsCompleted,3);assert.equal(C.score(p,120).sidesCompleted,6);assert.equal(C.score(p,999).timeSec,120);
});
check('Multi-block EMOM keeps one continuous rest segment and global progress',()=>{
 const p=C.build('emomblocks',{blockWorkMin:12,blockRestMin:4,blockCount:3});
 assert.equal(p.totalSec,2640);assert.equal(C.at(p,719.99).segment.betweenBlocks,undefined);
 const rest=C.at(p,720);assert.equal(rest.segment.betweenBlocks,true);assert.equal(rest.segment.phase,'rest');assert.equal(C.at(p,840).index,rest.index);
 assert.equal(C.at(p,960).segment.block,2);assert.equal(C.at(p,960).progress,960/2640);assert.equal(C.at(p,2200).segment.block,3);assert.equal(C.at(p,2640).done,true);
});
check('AMRAP score includes extra reps and early stop is not marked complete',()=>{
 const p=C.build('amrap',{amrapMin:10});const r=C.score(p,320,{rounds:5,extraReps:8});assert.equal(r.rounds,5);assert.equal(r.extraReps,8);assert.equal(r.completed,false);assert.equal(C.score(p,600).completed,true);
});
check('For Time distinguishes manual finish from cap and clamps elapsed',()=>{
 const p=C.build('fortime',{capMin:10});assert.equal(C.score(p,389,{completed:true}).capped,false);assert.equal(C.score(p,389,{completed:true}).completed,true);assert.equal(C.score(p,609).capped,true);assert.equal(C.score(p,609).timeSec,600);
});
console.log(`${checks} scheduler/adapter/scoring test groups passed.`);
