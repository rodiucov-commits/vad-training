const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright-core');
const assert=require('node:assert/strict'),path=require('path'),fs=require('fs'),http=require('http');
const root=path.resolve(__dirname,'../proposals/dimuzio');
const close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
(async()=>{
 const server=http.createServer((q,s)=>{
  const pathname=new URL(q.url,'http://localhost').pathname,name=pathname==='/'?'index.html':pathname.slice(1);
  if(!['index.html','worksheet.js','worksheet.css'].includes(name)){s.writeHead(404);return s.end('Not found')}
  s.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'");
  s.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html');s.end(fs.readFileSync(root+'/'+name));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.SITE_URL||'http://127.0.0.1:'+server.address().port);
  const result=()=>page.evaluate(()=>demoResult);
  const tableMass=()=>page.locator('#ledger tr:not(.grand) td:last-child').allTextContents().then(x=>x.reduce((a,v)=>a+Number(v.replace(/,/g,'')),0));
  assert.equal(await page.locator('.planning label').count(),3);assert.equal(await page.locator('#overall-ledger tr.reference-section').count(),3);assert.match(await page.locator('#overall-ledger').innerText(),/Starter levain/);assert.equal(await page.locator('#overall-ledger tr:not(.reference-section)').first().locator('td').nth(1).textContent(),'100%');assert.equal(await page.locator('#overall-ledger tr:not(.reference-section)').nth(1).locator('td').nth(1).textContent(),'69%');assert.equal(await page.locator('#overall-ledger tr.overall-total td').last().textContent(),'1,200.0');assert(await page.locator('.planning').evaluate(e=>e.compareDocumentPosition(document.querySelector('#overall-formula'))&Node.DOCUMENT_POSITION_FOLLOWING));assert(await page.locator('#overall-formula').evaluate(e=>e.compareDocumentPosition(document.querySelector('.build-section'))&Node.DOCUMENT_POSITION_FOLLOWING));
  assert.equal(await page.locator('#ledger tr.blank,#ledger tr.transfer,#ledger tr.total').count(),0);
  assert.equal(await page.locator('#ledger tr.grand').count(),1);
  assert.equal(await page.locator('#ledger tr.grand td').count(),3);
  assert.equal(await page.locator('#ledger').innerText().then(t=>t.includes('included')),false);
  assert.equal(await page.locator('#ledger tr.preferment-row').count(),1);
  assert.match(await page.locator('#levain-build-rows').innerText(),/Starter levain/);
  assert(await page.locator('#build-breakdown').evaluate(e=>e.compareDocumentPosition(document.querySelector('#ledger'))&Node.DOCUMENT_POSITION_FOLLOWING));
  let r=await result();close(r.total,1200);close(r.builds[0].mass/r.total*100,22/1.714);close(r.builds[0].bakerPercent,22);close(r.builds[0].p,11);
  assert(Math.abs(await tableMass()-1200)<.3);
  assert.equal(await page.locator('#total-weight').textContent(),'1,200.0');
  await page.locator('#levainShare').fill('20');assert(await page.locator('#levainShare').evaluate(e=>e===document.activeElement));
  r=await result();close(r.builds[0].mass,240);close(r.builds[0].doughShare,20);close(r.builds[0].p,17.14);close(r.total,1200);
  close(r.builds[0].feedFlour+r.builds[0].feedWater+r.seed,240);close(r.overall[1]/r.F*100,69);
  await page.locator('#hydration').fill('75');r=await result();close(r.builds[0].doughShare,20);close(r.overall[1]/r.F*100,75);close(r.total,1200);assert.equal(await page.locator('#overall-ledger tr:not(.reference-section)').nth(1).locator('td').nth(1).textContent(),'75%');assert.equal(await page.locator('#overall-ledger tr.overall-total td').last().textContent(),'1,200.0');
  await page.locator('#count').fill('6');r=await result();close(r.builds[0].mass,480);close(r.total,2400);close(r.builds[0].doughShare,20);assert.equal(await page.locator('#overall-ledger tr.overall-total td').last().textContent(),'2,400.0');
  await page.locator('#starter-options').evaluate(e=>e.open=true);
  await page.locator('#seedHydration').fill('50');assert(await page.locator('#seedHydration').evaluate(e=>e===document.activeElement));
  r=await result();close(r.seedFlour,r.seed/1.5);close(r.builds[0].feedFlour+r.builds[0].feedWater+r.seed,r.builds[0].mass);close(r.total,2400);
  await page.locator('#seedHydration').fill('');assert(await page.locator('#error').textContent());assert.equal(await page.locator('#levain-build-rows tr').count(),0);assert.equal(await page.locator('#overall-ledger tr').count(),0);
  await page.locator('#seedHydration').fill('100');assert.equal(await page.locator('#error').textContent(),'');
  await page.locator('#seedPercent').fill('60');assert.match(await page.locator('#error').textContent(),/more flour or water/);
  await page.locator('#seedPercent').fill('2');await page.locator('#p1').fill('9');assert(await page.locator('#p1').evaluate(e=>e===document.activeElement));r=await result();close(r.builds[0].p,9);close(r.builds[0].doughShare,18/1.774);
  await page.locator('#reset').click();assert.equal(await page.locator('#mixing-total').textContent(),'8–9 min');
  await page.locator('#autolyse').fill('20');assert.equal(await page.locator('#elapsed-total').textContent(),'28–29 min');
  await page.locator('#speed1').fill('6');await page.locator('#speed2').fill('4');assert.equal(await page.locator('#mixing-total').textContent(),'10 min');
  assert.match(await page.locator('#cooking-method').textContent(),/30 min/);
  await page.locator('#piece').fill('500');assert.equal(await page.locator('#speed1').inputValue(),'6');assert.match(await page.locator('#recipe-yield').textContent(),/3 pieces × 500.0 g/);
  assert.equal(await page.locator('.temperature-fields a').getAttribute('href'),'https://dc.rodiucov.com/#recipe/dough-temperature');
  await page.locator('#start-time').fill('2026-11-02T20:00');
  for(const [id,value] of Object.entries({'levain-hours':'8–10','bulk-min':'120','bench-min':'20','shape-min':'10','proof-min':'60–90','bake-min':'20–25','cool-min':'60'}))await page.locator('#'+id).fill(value);
  assert.match(await page.locator('#schedule-summary').textContent(),/Start to cooled bread/);
  assert.equal(await page.locator('#timeline li').count(),12);
  assert.match(await page.locator('#timeline').innerText(),/Tue 03 Nov/);
  const beforeSchedule=await page.locator('#timeline').innerText();await page.locator('#count').fill('4');assert.equal(await page.locator('#timeline').innerText(),beforeSchedule);
  await page.locator('#shape-min').fill('');assert.match(await page.locator('#schedule-summary').textContent(),/shaping/);assert.equal(await page.locator('#timeline li').count(),0);
  await page.locator('#two').click();r=await result();close(r.total,1400);assert.equal(await page.locator('#ledger tr.preferment-row').count(),2);
  assert(await page.locator('#second-fields').isVisible());assert.equal(await page.locator('#overall-ledger tr.reference-section').count(),4);assert.match(await page.locator('#overall-ledger').innerText(),/SPONGE/);assert.equal(await page.locator('.mix-card table').count(),0);
  assert.match(await page.locator('#recipe-gap').textContent(),/not a complete source baking recipe/);
  await page.locator('#levainShare').fill('15');await page.locator('#spongeShare').fill('10');r=await result();close(r.builds[0].mass,210);close(r.builds[1].mass,140);close(r.total,1400);close(r.overall[1]/r.F*100,70);
  assert.match(await page.locator('#cooking-method').textContent(),/210.0 g ripe/);assert.match(await page.locator('#cooking-method').textContent(),/140.0 g ripe/);
  await page.locator('#levainShare').fill('90');assert(await page.locator('#error').textContent());assert(await page.locator('#results').evaluate(e=>getComputedStyle(e).display==='none'));
  await page.locator('#levainShare').fill('15');assert.equal(await page.locator('#error').textContent(),'');
  const pure=await page.evaluate(()=>{const s={count:15,piece:400,hydration:69,salt:2,p1:11,h1:100,p2:0,h2:60,seedPercent:2,seedHydration:100,two:false};return{a:calculate(s),b:calculate({...s,p1:9}),inverse:pffFromMassShare(massShareFromPff(11,100,1.714),100,1.714)}});
  close(pure.a.F,6000/1.714);close(pure.a.total,6000);close(pure.inverse,11);close(pure.a.overall[1],pure.b.overall[1]);assert(pure.b.final[1]>pure.a.final[1]);
  const clock=await page.evaluate(()=>{const stages={levain:[480,600],sponge:[720,720],speed1:[5,5],autolyse:[20,20],speed2:[3,4],bulk:[120,120],bench:[20,20],shape:[10,10],proof:[60,90],bake:[20,25],cool:[60,60]};const plan=calculateSchedule('2026-11-02T20:00',stages);let bad=false;try{calculateSchedule('2026-11-02T20:00',{...stages,bulk:[-1,2]})}catch{bad=true}return{plan,bad,start:new Date('2026-11-02T20:00').getTime()}});
  assert.deepEqual(clock.plan.duration,[1038,1074]);assert.deepEqual(clock.plan.events[3].minutes,[720,720]);close(clock.plan.events.at(-1).times[0]-clock.start,1038*60000);assert(clock.bad);
  await page.locator('#reset').click();await page.locator('#start-time').fill('2026-11-02T20:00');
  for(const [id,value] of Object.entries({'levain-hours':'8–10','sponge-hours':'12','speed1':'5','autolyse':'20','speed2':'3–4','bulk-min':'120','bench-min':'20','shape-min':'10','proof-min':'60–90','bake-min':'20–25','cool-min':'60'}))await page.locator('#'+id).fill(value);
  assert.match(await page.locator('#schedule-summary').textContent(),/17 h 18 min – 17 h 54 min/);
  assert.match(await page.locator('#cooking-method').innerText(),/60–90 min/);
  assert.equal(await page.locator('#timeline li').count(),13);
  const sections=await page.locator('#overall-ledger').evaluate(e=>{let out=[],current=[];for(const row of e.rows){if(row.classList.contains('reference-section')){if(current.length)out.push(current);current=[]}else current.push(Number(row.cells[2].textContent.replace(/,/g,'')))}out.push(current);return out});
  for(const section of sections)assert(Math.abs(section.slice(0,-1).reduce((a,b)=>a+b,0)-section.at(-1))<.4,'reference section mass balance');
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:950});
   for(const preset of ['one','two']){
    await page.locator('#'+preset).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);
    assert.equal(await page.locator('#ledger tr.blank,#ledger tr.transfer').count(),0);
    assert.equal(await page.locator('#ledger tr.grand').count(),1);
    if(width===1440)await page.screenshot({path:root+'/desktop-'+preset+'.png',fullPage:true});
    if(width===390)await page.screenshot({path:root+'/mobile-'+preset+'.png',fullPage:true});
   }
  }
  assert.deepEqual(errors,[]);console.log('PASS: levain/sponge dough-mass percentages, baker/PFF conversions, fixed-share hydration/scaling edits, explicit seed, impossible/unknown inputs, one clean final formula, builds first, process/DDT links, focus, 390/768/1440px; no browser errors.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
