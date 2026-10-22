// Exercise the built production page against an isolated, read-only mock API.
const {chromium}=require('playwright-core'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:740},isMobile:true,hasTouch:true,timezoneId:'Europe/Zurich'});
  const block={id:'new-strength',name:'Kettlebell deadlift — 3 × 5',type:'STRENGTH',config:{sets:3,reps:5,restSec:180}};
  const server={programme:{1:{3:{title:'Strength B — Foundation',date:'2026-10-22',blocks:[block]}},2:{0:{title:'Foundation progression',date:'2026-10-26',blocks:[block]}},43:{3:{title:'Old hinge programme',blocks:[{...block,id:'old-strength',name:'Romanian DL — 4×6 @ 82.5kg'}]}}},results:[],generator:{}};
  const guidance='Programme guidance: use the appropriate modifications and respect the prescribed progression. Stop if symptoms worsen.';
  server.programme[1][0]={title:'Strength A — Foundation',date:'2026-10-19',notes:guidance+' Monday-specific instructions.',blocks:[{...block,id:'monday',name:'Goblet squat — 3 × 5'}]};
  server.programme[1][3].notes=guidance+' Thursday-specific instructions.';
  let writes=0;const errors=[];
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.pathname.startsWith('/api/')){
    if(req.method()!=='GET'){writes++;return route.fulfill({status:500,json:{error:'No writes permitted'}});}
    if(url.pathname==='/api/auth/session')return route.fulfill({json:{ok:true,profile:'vad'}});
    if(url.pathname==='/api/snapshot')return route.fulfill({json:server});
    return route.fulfill({status:404,json:{error:'Unknown fixture route'}});
   }
   const name=url.pathname==='/'?'index.html':url.pathname.slice(1),file=path.resolve(root,name);
   if(!file.startsWith(root+'/')||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:'Not found'});
   return route.fulfill({body:fs.readFileSync(file),contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html'});
  });
  await context.addInitScript(()=>{
   localStorage.setItem('vt_active_profile_v1','vad');
   if(!localStorage.getItem('vad-training-v1-vad'))localStorage.setItem('vad-training-v1-vad',JSON.stringify({selectedWeek:43,programme:{43:{3:{title:'Stale cached plan',blocks:[]}}},results:[],generator:{}}));
  });
  const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-22T05:00:00+02:00'));
  await page.goto('https://rodiucov.com/');await page.getByText('All changes uploaded',{exact:true}).waitFor();
  await page.getByText('Kettlebell deadlift — 3 × 5',{exact:true}).waitFor();
  const guidanceNote=page.locator('details').filter({has:page.locator('summary',{hasText:'Programme guidance & safety'})});
  assert.equal(await guidanceNote.count(),1);
  assert.equal(await page.getByText(guidance,{exact:true}).isVisible(),false);
  await page.getByText('Thursday-specific instructions.',{exact:true}).waitFor();
  await guidanceNote.locator('summary').click();assert.equal(await page.getByText(guidance,{exact:true}).isVisible(),true);
  await guidanceNote.locator('summary').click();
  assert.equal(await page.getByText('Romanian DL — 4×6 @ 82.5kg',{exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vad-training-v1-vad')).selectedWeek),1);
  await page.getByRole('button',{name:'Next week',exact:true}).click();
  await page.reload();await page.getByText('All changes uploaded',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vad-training-v1-vad')).selectedWeek),2);
  await page.getByRole('button',{name:'Jump to current week',exact:true}).click();
  await page.getByText('Kettlebell deadlift — 3 × 5',{exact:true}).waitFor();
  await page.screenshot({path:'/tmp/training-dated-week-mobile.png',fullPage:true});
  await page.clock.setFixedTime(new Date('2026-10-26T05:00:00+01:00'));
  await page.reload();await page.getByText('All changes uploaded',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vad-training-v1-vad')).selectedWeek),2);
  assert.equal(writes,0);assert.deepEqual(errors,[]);
  console.log('PASS dated programme: stale cache/cloud load → week 1, correct strength, manual browsing/reload, Today button, DST/week rollover; zero API writes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
