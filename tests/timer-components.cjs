// Source-driven component transition tests; no browser, network writes or training-data logging.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const Babel=require(process.env.BABEL_STANDALONE || '@babel/standalone');
const WorkoutClock=require('../timer-engine.js');
const root=path.resolve(__dirname,'..'),cache={};let groups=0;
function compile(kind){
 if(cache[kind])return cache[kind];
 const html=fs.readFileSync(path.join(root,'src',kind==='workout'?'index.html':'chrono.html'),'utf8');
 const source=kind==='workout'?html.slice(html.indexOf('function ChronoTimer('),html.indexOf('const BLOCK_STYLE =')):html.slice(html.indexOf('function Chrono()'),html.indexOf('ReactDOM.createRoot'));
 return cache[kind]={names:[...source.matchAll(/const \[(\w+),[^\]]+\]\s*=\s*useState\(/g)].map(m=>m[1]),code:Babel.transform(source,{presets:['env','react']}).code};
}
function runtime(kind,initial={},config={},landscape=false){
 const {names,code}=compile(kind),state={...initial},refs=[],effects=[],sounds=[],logs=[];let si=0,ri=0,tree,nodes=[],now=1000000,ticker;
 const noop=()=>{},text=n=>n&&typeof n==='object'?n.children.map(text).join(' '):String(n??'');
 const useState=v=>{const name=names[si++];if(!(name in state))state[name]=typeof v==='function'?v():v;return [state[name],next=>{state[name]=typeof next==='function'?next(state[name]):next;}];};
 const React={createElement(type,props,...children){return {type,props:props||{},children:children.flat(Infinity).filter(v=>v!==null&&v!==undefined&&v!==false)};}};
 const context={React,WorkoutClock,useState,useEffect:(fn,deps)=>effects.push({fn,deps}),useRef:v=>refs[ri]||(refs[ri++]={current:v}),getSound:()=>true,setSoundPref:noop,useAudio:()=>new Proxy({},{get:(_,key)=>()=>sounds.push(key)}),useHaptic:()=>noop,useOrientation:()=>landscape,useWakeLock:noop,PRESTART_SEC:10,fmt:s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`,Icons:new Proxy({},{get:()=>noop}),MODES:[],Date:{now:()=>now},setInterval:fn=>{ticker=fn;return 1;},clearInterval:noop,setTimeout:noop};
 // Stable ref hook index must advance even when the ref already exists.
 context.useRef=v=>{const i=ri++;return refs[i]||(refs[i]={current:v});};
 for(const match of code.matchAll(/React\.createElement\(([A-Z]\w*)[,) ]/g))if(!(match[1] in context))context[match[1]]=noop;
 vm.runInNewContext(code,context);
 const api={state,sounds,logs,refs,text,
  render(overrides={}){Object.assign(state,overrides);si=ri=0;effects.length=0;nodes=[];
   tree=kind==='workout'?context.ChronoTimer({initialMode:initial.mode||'rest',initialConfig:config,onClose:noop,onLog:result=>logs.push(result)}):context.Chrono();
   function walk(n,parent){if(!n||typeof n!=='object')return;nodes.push({n,parent});n.children.forEach(child=>walk(child,n));}walk(tree,null);return api;
  },
  nodes:()=>nodes,
  digit(){return text(nodes.find(({n})=>String(n.props.className).includes('font-digits font-extrabold')&&String(n.props.className).includes('leading-none')).n);},
  button(label){const found=nodes.find(({n})=>n.type==='button'&&(n.props['aria-label']===label||text(n).includes(label)));assert(found,`Missing ${label} in ${kind}/${state.mode}/${state.phase}`);return found.n;},
  click(label){api.button(label).props.onClick();return api.render();},
  transition(t){api.render(t==null?{}:{elapsed:t});const effect=effects.find(e=>e.deps?.length===3&&e.deps[0]===state.elapsed&&e.deps[1]===state.phase&&e.deps[2]===state.mode);assert(effect);effect.fn();return api.render();},
  startClock(){const effect=effects.find(e=>e.deps?.length===1&&e.deps[0]===state.phase);assert(effect);effect.fn();return api;},
  advance(ms){now+=ms;assert(ticker);ticker();return api.render();}
 };
 return api.render();
}
function check(name,fn){fn();groups++;console.log('PASS '+name);}
for(const kind of ['workout','standalone']){
 check(`${kind}: paused remainder and Resume preserve exact clock`,()=>{
  const r=runtime(kind,{mode:'emom',phase:'running',elapsed:95});r.click('Pause');assert.equal(r.digit(),'00:25');r.click('Resume').startClock().advance(10000);assert.equal(r.state.elapsed,105);assert.equal(r.digit(),'00:15');
  assert.equal(runtime(kind,{mode:'intervals',phase:'paused',elapsed:320,intWork:300,intRest:60}).digit(),'00:40');
 });
 check(`${kind}: Again clears score, all indices and elapsed`,()=>{
  const r=runtime(kind,{mode:'amrap',phase:'done',elapsed:1200,rounds:7,extraReps:12,sideIdx:2,holdRoundIdx:3,blockIdx:3,emomBlockIdx:3});r.click('Again');
  for(const key of ['rounds','extraReps','elapsed'])assert.equal(r.state[key],0);for(const key of ['sideIdx','holdRoundIdx'])assert.equal(r.state[key],1);assert.equal(r.state.phase,'prestart');
 });
 check(`${kind}: multi-block rest cues and progress survive delayed callbacks`,()=>{
  const r=runtime(kind,{mode:'emomblocks',phase:'running',elapsed:719.5});r.transition();r.sounds.length=0;r.transition(720);assert(r.sounds.includes('rest'));r.sounds.length=0;r.transition(840);assert(!r.sounds.includes('go'));r.transition(960);assert(r.sounds.includes('go'));assert.equal(r.state.elapsed,960);
 });
 check(`${kind}: delayed hold callback crosses sides/rounds without clock reset`,()=>{
  const r=runtime(kind,{mode:'hold',phase:'running',elapsed:95,holdSec:20,holdSides:2,holdRounds:3});r.transition();assert.equal(r.state.elapsed,95);assert.equal(r.digit(),'00:05');r.transition(125);assert.equal(r.state.phase,'done');assert.equal(r.state.elapsed,120);
 });
 check(`${kind}: interval trailing-rest toggle changes actual finish boundary`,()=>{
  const r=runtime(kind,{mode:'intervals',phase:'running',intWork:300,intRest:60,intRounds:4});r.transition(1380);assert.equal(r.state.phase,'done');
  const trailing=runtime(kind,{mode:'intervals',phase:'running',intWork:300,intRest:60,intRounds:4,includeFinalRest:true});trailing.transition(1380);assert.equal(trailing.state.phase,'running');assert.equal(trailing.digit(),'01:00');trailing.transition(1440);assert.equal(trailing.state.phase,'done');
 });
 check(`${kind}: lead-in and cap end once at exact prescribed elapsed`,()=>{
  const r=runtime(kind,{mode:'amrap',phase:'prestart',amrapMin:1});r.transition(10);assert.equal(r.state.phase,'running');assert.equal(r.state.elapsed,0);r.transition(60.3);assert.equal(r.state.phase,'done');assert.equal(r.state.elapsed,60);
 });
}
check('Workout Engine station sequence, full 20-minute finish, completed result',()=>{
 const config={emomRounds:20,minuteCycle:[{label:'Bike',phase:'work'},{label:'Step-ups',phase:'work'},{label:'Sled',phase:'work'},{label:'Rest',phase:'rest'}]};
 const r=runtime('workout',{mode:'emom',phase:'running'},config);
 for(const [t,label] of [[0,'Bike'],[60,'Step-ups'],[120,'Sled'],[180,'Rest'],[240,'Bike'],[1140,'Rest']]){r.transition(t);assert(r.nodes().some(({n})=>String(n.props.className).includes('workout-timer-context')&&r.text(n).includes(label)));}
 r.transition(1200);r.click('Log result');assert.equal(r.logs[0].timeSec,1200);assert.equal(r.logs[0].completed,true);
});
check('Workout strength paused rest, counted set and final-set finish',()=>{
 const paused=runtime('workout',{mode:'rest',phase:'paused',restPhase:'rest',elapsed:45,restSec:120});assert.equal(paused.digit(),'01:15');
 const r=runtime('workout',{mode:'rest',phase:'running',elapsed:40,setIdx:1,restSets:2,restSec:120});r.click('Set done');assert.equal(r.state.completedSets,1);assert.equal(r.state.restPhase,'rest');r.transition(120);assert.equal(r.state.setIdx,2);r.render({elapsed:30});r.click('Finish');assert.equal(r.state.phase,'done');assert.equal(r.state.completedSets,2);r.click('Log result');assert.equal(r.logs[0].timeSec,190);assert.equal(r.logs[0].setsCompleted,2);assert.equal(r.logs[0].roundEntries.length,2);
});
check('Untimed circuit records each completed round without inventing rest',()=>{
 const r=runtime('workout',{mode:'circuit',phase:'running'},{restSets:4,restSec:0});
 for(let i=1;i<=4;i++){r.render({elapsed:30});r.click(i===4?'Finish':'Round done');assert.equal(r.state.completedSets,i);}
 assert.equal(r.state.phase,'done');r.click('Log result');assert.equal(r.logs[0].roundsCompleted,4);assert.equal(r.logs[0].timeSec,120);assert.equal(r.logs[0].roundEntries.length,4);
});
check('Hold, partial interval and AMRAP extra-rep result callbacks',()=>{
 const h=runtime('workout',{mode:'hold',phase:'running',elapsed:120});h.transition();h.click('Log result');assert.equal(h.logs[0].timeSec,120);
 const i=runtime('workout',{mode:'intervals',phase:'running',elapsed:1});i.click('Log & close');assert.equal(i.logs[0].intervalsCompleted,0);assert.equal(i.logs[0].completed,false);
 const a=runtime('workout',{mode:'amrap',phase:'done',elapsed:1200,rounds:7,extraReps:13});a.click('Log result');assert.equal(a.logs[0].rounds,7);assert.equal(a.logs[0].extraReps,13);
});
check('Reset clears manual round score and block indices',()=>{
 const r=runtime('workout',{mode:'emomblocks',phase:'running',emomBlockIdx:3,rounds:9,completedSets:3,roundEntries:[{round:1}]});r.click('Reset timer');assert.equal(r.state.emomBlockIdx,1);assert.equal(r.state.completedSets,0);assert.equal(r.state.roundEntries.length,0);assert.equal(r.state.rounds,0);
});
check('Controls remain outside scroll pane across all workout modes and states',()=>{
 let cases=0;for(const mode of ['rest','circuit','countdown','amrap','fortime','emom','emomblocks','intervals','hold','stopwatch'])for(const phase of ['idle','prestart','running','paused','done'])for(const land of [false,true])for(const wod of [false,true]){
  const r=runtime('workout',{mode,phase,showWod:wod},{workoutText:'Example workout'},land),nodes=r.nodes();const main=nodes.find(({n})=>n.props.className==='workout-timer-main'),controls=nodes.find(({n})=>n.props['aria-label']==='Workout timer controls');assert(main&&controls);assert.equal(main.parent,controls.parent);cases++;
 }
 assert.equal(cases,200);console.log('200 structural render-state cases checked (not browser layout measurements).');
});
check('Standalone rest Next set advances without stale Again/reset closure',()=>{
 const r=runtime('standalone',{mode:'rest',phase:'done',setIdx:1,restSets:4,elapsed:150});r.click('Next set');assert.equal(r.state.setIdx,2);assert.equal(r.state.phase,'prestart');assert.equal(r.state.elapsed,0);
});

console.log(`${groups} component transition/scoring/structure test groups passed.`);
