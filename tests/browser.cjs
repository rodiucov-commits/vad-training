// Isolated browser fixture: every request is intercepted. No live training API writes.
const {chromium}=require('playwright-core'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:740},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 let offline=false,writes=0;const errors=[];
 const server={programme:{42:{1:{title:'Engine day',date:'2026-10-13',notes:'Day notes must remain visible.',blocks:[{id:'engine',type:'EMOM',name:'Engine EMOM 20 min',config:{rounds:20},movements:['Min 1: Bike','Min 2: Step-ups','Min 3: Sled','Min 4: Rest / walk'],notes:'Repeat the four-minute cycle five times.'},{id:'strength',type:'STRENGTH',name:'Back Squat — 4×6 @ 80kg',config:{sets:4,reps:6,restSec:120,weightKg:80}},{id:'rounds',type:'CORE',name:'Core circuit — 3 rounds',config:{rounds:3,restSec:45}},{id:'amrap',type:'AMRAP',name:'AMRAP test',config:{minutes:10}},{id:'fortime',type:'FOR_TIME',name:'For Time test',config:{capMinutes:10}},{id:'hold',type:'HOLD',name:'Hold test',config:{seconds:20,sides:2,rounds:3}},{id:'intervals',type:'INTERVALS',name:'Intervals test',config:{rounds:4,workSec:300,restSec:60}},{id:'countdown',type:'WARMUP',name:'Rest 4 min'}]}}},results:[],generator:{focus:'General Fitness'}};
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname.startsWith('/api/')){
   if(offline)return route.abort('failed');
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','content-type':'application/json'};
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(url.pathname==='/api/snapshot')return route.fulfill({json:server,headers});
   if(req.method()==='POST'&&url.pathname==='/api/results'){const r=req.postDataJSON();server.results=server.results.filter(x=>x.id!==r.id);server.results.push(r);writes++;return route.fulfill({json:r,headers});}
   if(req.method()==='DELETE'&&url.pathname.startsWith('/api/results/')){const id=decodeURIComponent(url.pathname.split('/').pop());server.results=server.results.filter(x=>x.id!==id);writes++;return route.fulfill({status:204,headers});}
   if(req.method()==='PUT'&&url.pathname==='/api/programme'){const p=req.postDataJSON();server.programme[p.week]=p.days;writes++;return route.fulfill({json:{ok:true},headers});}
   return route.fulfill({json:{ok:true},headers});
  }
  if(url.hostname!=='rodiucov.com')return route.fulfill({status:200,body:'',contentType:'text/css'});
  const name=url.pathname==='/'?'index.html':url.pathname==='/chrono'?'chrono.html':url.pathname.slice(1);const file=path.resolve(root,name);
  if(!file.startsWith(root+'/')||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:'Not found'});
  return route.fulfill({body:fs.readFileSync(file),contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html'});
 });
 await context.addInitScript(()=>{
  localStorage.setItem('vt_active_profile_v1','vad');localStorage.setItem('vt_session_v1',JSON.stringify({ts:Date.now()}));localStorage.setItem('vt_pwhash_v1','fixture-password-hash');
  if(!localStorage.getItem('vad-training-v1-vad'))localStorage.setItem('vad-training-v1-vad',JSON.stringify({programme:{},results:[],selectedWeek:42,generator:{}}));
 });
 const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('https://rodiucov.com/');await page.getByText('All changes uploaded',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>typeof window.Babel),'undefined');
 if(!await page.getByText('Day notes must remain visible.').isVisible())await page.getByRole('button',{name:/Tuesday/}).click();await page.getByText('Day notes must remain visible.').waitFor();console.log('PASS app load/day metadata');
 await page.locator('[data-workout-block=engine]').getByRole('button',{name:'Start workout',exact:true}).click();
 const controls=page.getByRole('group',{name:'Workout timer controls'});
 async function visibleControls(label){for(const button of await controls.getByRole('button').all()){
  await button.scrollIntoViewIfNeeded();const b=await button.boundingBox(),v=page.viewportSize();assert(b&&b.y>=0&&b.y+b.height<=v.height+1&&b.x>=0&&b.x+b.width<=v.width+1,label+' button outside viewport');
 }}
 await page.getByRole('button',{name:'Close timer',exact:true}).click();
 for(const id of ['engine','strength','rounds','amrap','fortime','hold','intervals','countdown']) {
  await page.setViewportSize({width:390,height:740});await page.locator('[data-workout-block='+id+']').getByRole('button',{name:'Start workout',exact:true}).click();
  await page.evaluate(()=>{document.documentElement.style.setProperty('--safe-top','20px');document.documentElement.style.setProperty('--safe-bottom','34px');});
  await visibleControls(id+' portrait idle');await controls.getByRole('button',{name:'Start',exact:true}).click();await controls.getByRole('button',{name:/Skip/}).click();await visibleControls(id+' portrait running');
  await page.setViewportSize({width:844,height:390});await visibleControls(id+' landscape running');
  await page.getByRole('button',{name:'Close timer',exact:true}).click();
 }
 await page.setViewportSize({width:390,height:740});await page.locator('[data-workout-block=engine]').getByRole('button',{name:'Start workout',exact:true}).click();
 console.log('PASS 8 workout timer modes: portrait/landscape bounds with safe-area padding');
 await visibleControls('portrait idle');await controls.getByRole('button',{name:'Start',exact:true}).click();await controls.getByRole('button',{name:/Skip/}).click();await visibleControls('portrait running');
 await page.setViewportSize({width:844,height:390});await visibleControls('landscape running');
 await page.screenshot({path:'/tmp/training-landscape-tested.png'});
 await page.setViewportSize({width:390,height:740});console.log('PASS portrait and landscape control bounds');
 await controls.getByRole('button',{name:'Log & close'}).click();await page.getByRole('dialog',{name:'Review & save result'}).waitFor();
 await page.getByLabel('Actual load (kg)',{exact:true}).fill('50');await page.getByLabel('Actual reps',{exact:true}).fill('12');
 await page.getByRole('button',{name:'Save result',exact:true}).click();await page.getByText('All changes uploaded',{exact:true}).waitFor();
 console.log('PASS reviewed result save');assert.equal(server.results.length,1);assert.equal(server.results[0].value.weightKg,50);assert.equal(server.results[0].value.completed,false);
 await page.getByRole('button',{name:'Progress',exact:true}).click();await page.getByRole('button',{name:/Engine EMOM/}).first().click();
 await page.getByRole('button',{name:/Edit result Engine/}).click();await page.getByLabel('Notes',{exact:true}).fill('Edited in isolated browser fixture');
 await page.getByRole('button',{name:'Save result',exact:true}).click();await page.getByText('All changes uploaded',{exact:true}).waitFor();
 assert.equal(server.results.length,1);assert.equal(server.results[0].value.notes,'Edited in isolated browser fixture');
 // Queue survives an offline save and page reload; reconnect retries exactly once.
 await page.getByRole('button',{name:/Edit result Engine/}).click();try{await page.getByRole('dialog',{name:'Edit result',exact:true}).waitFor();}catch(e){console.log('DEBUG',JSON.stringify({errors,body:(await page.locator('body').innerText()).slice(-1800)}));throw e;}await page.getByLabel('Notes',{exact:true}).fill('Offline edited value');offline=true;
 await page.getByRole('button',{name:'Save result',exact:true}).click();await page.getByText(/change\(s\) saved locally/).waitFor();
 await page.reload();await page.getByText(/change\(s\) saved locally/).waitFor();
 offline=false;await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.getByText('All changes uploaded',{exact:true}).waitFor();
 assert.equal(server.results.length,1);assert.equal(server.results[0].value.notes,'Offline edited value');
 await page.getByRole('button',{name:'Progress',exact:true}).click();await page.getByRole('button',{name:/Engine EMOM/}).first().click();await page.getByRole('button',{name:/Edit result Engine/}).click();await page.getByRole('button',{name:'Delete result',exact:true}).click();await page.getByText('All changes uploaded',{exact:true}).waitFor();assert.equal(server.results.length,0);
 await page.getByRole('button',{name:'Today',exact:true}).click();if(!await page.getByText('Day notes must remain visible.').isVisible())await page.getByRole('button',{name:/Tuesday/}).click();await page.locator('[data-workout-block=engine]').getByRole('button',{name:'Start workout',exact:true}).click();await controls.getByRole('button',{name:'Start',exact:true}).click();await controls.getByRole('button',{name:/Skip/}).click();await controls.getByRole('button',{name:'Log & close'}).click();await page.getByRole('button',{name:'Save & next block',exact:true}).click();await page.getByRole('dialog',{name:'Back Squat — 4×6 @ 80kg',exact:true}).waitFor();await page.getByRole('button',{name:'Close timer',exact:true}).click();await page.getByText('All changes uploaded',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Import',exact:true}).click();
 const pasted={week:42,days:{1:{title:'Imported',date:'2026-10-13',notes:'Preserved notes',blocks:[{id:'imported',type:'INTERVALS',name:'Intervals',config:{rounds:4,workSec:-1,restSec:60}}]}}};
 await page.locator('textarea').first().fill(JSON.stringify(pasted));await page.getByRole('button',{name:'Validate',exact:true}).click();await page.getByText(/invalid workSec/).waitFor();
 pasted.days[1].blocks[0].config.workSec=300;await page.locator('textarea').first().fill(JSON.stringify(pasted));await page.getByRole('button',{name:'Validate',exact:true}).click();
 await page.getByRole('button',{name:'Upload',exact:true}).click();await page.getByText('All changes uploaded',{exact:true}).waitFor();assert.equal(server.programme[42][1].notes,'Preserved notes');assert.equal(server.programme[42][1].date,'2026-10-13');
 await page.goto('https://rodiucov.com/chrono');await page.getByRole('button',{name:'Start',exact:true}).waitFor();
 const standalone=page.getByRole('group',{name:'Timer controls'});for(const button of await standalone.getByRole('button').all()){const b=await button.boundingBox();assert(b.y+b.height<=740);}
 await page.screenshot({path:'/tmp/training-portrait-tested.png'});
 assert.deepEqual(errors,[]);console.log('PASS browser: production assets, portrait/landscape control bounds, logging, edit, offline/reload retry, import validation/metadata, standalone rendering; '+writes+' mock writes, zero live API writes.');
 await context.close();await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
