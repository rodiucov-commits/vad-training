/* Shared, deterministic workout schedules. Durations exclude the pre-start countdown. */
(function (root) {
  'use strict';
  const num = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const count = (v, fallback = 1) => Math.max(1, Math.min(1000, Math.floor(num(v, fallback))));
  const seconds = (v, fallback = 60) => Math.max(0, num(v, fallback));
  function cycleFrom(block) {
    const c = block.config || {};
    if (Array.isArray(c.minuteCycle) && c.minuteCycle.length) return c.minuteCycle;
    const stations = (block.movements || []).map(line => String(line).match(/^min(?:ute)?\s*(\d+)\s*:\s*(.+)$/i)).filter(Boolean);
    if (stations.length && stations.every((m, i) => Number(m[1]) === i + 1)) {
      return stations.map(m => ({label: m[2], phase: /^rest\b/i.test(m[2]) ? 'rest' : 'work'}));
    }
    if (/odd minutes\s*=/i.test(block.notes || '') && /even minutes\s*=\s*rest/i.test(block.notes || '')) {
      const work = block.notes.match(/odd minutes\s*=\s*([^;]+)/i);
      return [{label: work ? work[1].trim() : block.name, phase: 'work'}, {label: 'Rest', phase: 'rest'}];
    }
    return [];
  }
  function fromBlock(block) {
    const c = block.config || {}, cycle = cycleFrom(block);
    switch (block.type) {
      case 'EMOM': return {mode: 'emom', config: {emomRounds: c.rounds ?? c.minutes ?? 12, minuteCycle: cycle}};
      case 'AMRAP': return {mode: 'amrap', config: {amrapMin: c.minutes ?? 20}};
      case 'FOR_TIME': return {mode: 'fortime', config: {capMin: c.capMinutes ?? 15}};
      case 'INTERVALS': return {mode: 'intervals', config: {intWork:c.workSec ?? 60, intRest:c.restSec ?? 60, intRounds:c.rounds ?? 6, includeFinalRest:c.includeFinalRest === true}};
      case 'HOLD': return {mode:'hold', config:{holdSec:c.seconds ?? 30, holdSides:c.sides ?? 1, holdRounds:c.rounds ?? 3}};
      case 'STRENGTH': return {mode:'rest', config:{restSec:c.restSec ?? 150, restSets:c.sets ?? 4, includeFinalRest:c.includeFinalRest === true, weightKg:c.weightKg}};
      default: {
        const rounds = c.rounds ?? String(block.name || '').match(/\b(\d+)\s*rounds\b/i)?.[1];
        if (rounds && (block.type === 'CORE' || /strength|circuit/i.test(block.name || '') || c.rounds)) {
          return {mode:'circuit', config:{restSets:count(rounds),restSec:c.restSec ?? 0,includeFinalRest:c.includeFinalRest === true}};
        }
        // Only explicit durations: never turn a deliberately untimed/ranged warm-up into a guessed countdown.
        const timed = String(block.name || '').match(/^rest\s+(\d+(?:\.\d+)?)\s*(min(?:utes?)?|s(?:ec(?:onds?)?)?)\b/i);
        const named = !/\d+\s*[-–]\s*\d+\s*min/i.test(block.name || '') && String(block.name || '').match(/\b(\d+(?:\.\d+)?)\s*min(?:utes?)?\b/i);
        const duration = c.seconds ?? (c.minutes != null ? c.minutes * 60 : timed ? Number(timed[1]) * (/^m/i.test(timed[2]) ? 60 : 1) : named ? Number(named[1])*60 : null);
        if (duration != null && !/untimed/i.test(block.name || '')) return {mode:'countdown',config:{countdownSec:seconds(duration)}};
        return {mode:'stopwatch',config:{}};
      }
    }
  }
  function build(mode, c = {}) {
    const segments = []; let total = 0;
    const add = (duration, phase, label, meta = {}) => {
      duration = seconds(duration, 0);
      if (!duration) return;
      segments.push({start:total,end:total+duration,duration,phase,label,...meta}); total += duration;
    };
    if (mode === 'emom') {
      const minutes=count(c.emomRounds,12), cycle=Array.isArray(c.minuteCycle) ? c.minuteCycle : [];
      for(let i=0;i<minutes;i++) {
        const station=cycle[i % (cycle.length || 1)] || {phase:'work',label:'Work'};
        add(60,station.phase === 'rest' ? 'rest' : 'work',station.label || 'Work',{minute:i+1,minutes,round:Math.floor(i/(cycle.length || 1))+1,rounds:Math.ceil(minutes/(cycle.length || 1)),station:cycle.length ? i%cycle.length+1 : null,stations:cycle.length});
      }
    } else if (mode === 'emomblocks') {
      const blocks=count(c.blockCount,3), minutes=count(c.blockWorkMin,12);
      for(let b=1;b<=blocks;b++) {
        for(let i=0;i<minutes;i++) add(60,i%2 ? 'rest':'work',i%2 ? 'Rest':(c.exercise || 'Work'),{block:b,blocks,minute:i+1,minutes,round:Math.floor(i/2)+1,rounds:Math.ceil(minutes/2)});
        if(b<blocks) add(seconds(c.blockRestMin,4)*60,'rest','Rest between blocks',{block:b,blocks,betweenBlocks:true});
      }
    } else if (mode === 'intervals') {
      const rounds=count(c.intRounds,6);
      for(let r=1;r<=rounds;r++) {
        add(seconds(c.intWork,60),'work','Work',{round:r,rounds});
        if(r<rounds || c.includeFinalRest) add(seconds(c.intRest,60),'rest','Rest',{round:r,rounds});
      }
    } else if (mode === 'hold') {
      const rounds=count(c.holdRounds,3),sides=count(c.holdSides,1);
      for(let r=1;r<=rounds;r++) for(let s=1;s<=sides;s++) add(seconds(c.holdSec,20),'work',sides===2 ? (s===1?'Left':'Right') : sides>1 ? `Side ${s}`:'Hold',{round:r,rounds,side:s,sides});
    } else if (mode === 'amrap') add(seconds(c.amrapMin,20)*60,'work','AMRAP');
    else if (mode === 'fortime') add(seconds(c.capMin,15)*60,'work','For time');
    else if (mode === 'countdown') add(seconds(c.countdownSec,60),'rest','Countdown');
    return {mode,segments,totalSec:total};
  }
  function at(plan, elapsed = 0) {
    elapsed=Math.max(0,num(elapsed,0));
    const timed=plan.segments.length>0, done=timed && elapsed>=plan.totalSec;
    const index=timed ? (done ? plan.segments.length-1 : plan.segments.findIndex(s=>elapsed<s.end)) : -1;
    const segment=plan.segments[index] || null;
    const timeSec=timed ? Math.min(elapsed,plan.totalSec) : elapsed;
    return {segment,index,done,timeSec,remaining:segment ? Math.max(0,segment.end-timeSec):0,progress:plan.totalSec ? timeSec/plan.totalSec : 0,
      completedIntervals:plan.segments.filter(s=>s.phase==='work' && s.end<=timeSec).length};
  }
  function describe(plan, elapsed) {
    const s=at(plan,elapsed),x=s.segment;
    if(!x) return {big:elapsed,label:'RUNNING',context:''};
    let context=x.label;
    if(plan.mode==='emom') context=`MIN ${x.minute}/${x.minutes}${x.stations ? ` · CYCLE ${x.round}/${x.rounds} · ${x.label}` : ''}`;
    else if(plan.mode==='emomblocks') context=`BLOCK ${x.block}/${x.blocks} · ${x.betweenBlocks ? x.label : `MIN ${x.minute}/${x.minutes} · ${x.label}`}`;
    else if(plan.mode==='hold') context=`ROUND ${x.round}/${x.rounds} · ${x.label}`;
    else if(plan.mode==='intervals') context=`ROUND ${x.round}/${x.rounds} · ${x.label}`;
    return {big:plan.mode==='fortime' ? s.timeSec : s.remaining,label:s.done?'DONE':x.phase==='rest'?'REST':plan.mode==='hold'?x.label.toUpperCase():'WORK',context};
  }
  function score(plan, elapsed, values = {}) {
    const s=at(plan,elapsed), mode=plan.mode;
    const result={mode,timeSec:Math.floor(s.timeSec),completed:s.done || values.completed === true};
    if(mode==='amrap') Object.assign(result,{rounds:values.rounds || 0,extraReps:values.extraReps || 0});
    if(mode==='fortime') result.capped=s.done;
    if(mode==='intervals') Object.assign(result,{intervalsCompleted:s.completedIntervals,repsCompleted:s.completedIntervals});
    if(mode==='emom') Object.assign(result,{minutesCompleted:Math.floor(s.timeSec/60),cyclesCompleted:Math.floor(s.timeSec/(60*(plan.segments[0]?.stations || 1)))});
    if(mode==='emomblocks') result.blocksCompleted=plan.segments.filter(x=>!x.betweenBlocks && x.minute===x.minutes && x.end<=s.timeSec).length;
    if(mode==='hold') Object.assign(result,{roundsCompleted:plan.segments.filter(x=>x.side===x.sides && x.end<=s.timeSec).length,sidesCompleted:s.completedIntervals});
    return result;
  }
  const api={fromBlock,build,at,describe,score};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  root.WorkoutClock=api;
})(typeof globalThis!=='undefined' ? globalThis : this);
