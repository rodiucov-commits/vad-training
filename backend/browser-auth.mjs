import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{DatabaseSync}from'node:sqlite';import{createRequire}from'node:module';import{createSecureGateway,sha}from'./auth.mjs';
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(root+'/package.json'),{chromium}=require('playwright-core');
const sqlite=new DatabaseSync(':memory:');
const DB={
 exec:s=>sqlite.exec(s),
 prepare(sql){const q=sqlite.prepare(sql);return {bind(...args){return {
  first:async()=>q.get(...args)||null,
  all:async()=>({results:q.all(...args)}),
  run:async()=>({meta:{changes:q.run(...args).changes}})
 };}};}
};
const gateway=createSecureGateway({async fetch(req){const url=new URL(req.url);if(url.pathname==='/api/snapshot')return Response.json({programme:{},results:[],generator:{}});return Response.json({ok:true});}},{machineHash:await sha('fixture-machine'),setupHashes:{vad:await sha('fixture-setup')},setupExpires:Date.now()+3600000});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const ctx=await browser.newContext({viewport:{width:390,height:740}});const errors=[];
await ctx.route('**/*',async route=>{
 const request=route.request(),url=new URL(request.url());
 if(!['rodiucov.com','www.rodiucov.com'].includes(url.hostname))return route.fulfill({body:'',contentType:'text/css'});
 if(url.pathname.startsWith('/api/')){
  assert(!request.headers()['authorization'],'Frontend must not send embedded bearer credentials');
  const req=new Request(request.url(),{method:request.method(),headers:request.headers(),...(['GET','HEAD'].includes(request.method())?{}:{body:request.postData()||''})});
  const response=await gateway.fetch(req,{DB,API_TOKEN:'obsolete-fixture-token'});
  return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
 }
 const name=url.pathname==='/'?'index.html':url.pathname.slice(1);const file=path.resolve(root,name);
 if(!file.startsWith(root+'/')||!fs.existsSync(file))return route.fulfill({status:404,body:''});
 return route.fulfill({body:fs.readFileSync(file),contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html'});
});
await ctx.addInitScript(()=>{localStorage.setItem('vt_active_profile_v1','vad');localStorage.setItem('vt_session_v1',JSON.stringify({ts:Date.now()}));});
const p=await ctx.newPage();p.setDefaultTimeout(8000);p.on('pageerror',e=>errors.push(e.message));
await p.goto('https://rodiucov.com/');await p.getByRole('button',{name:'Sign in',exact:true}).waitFor();
assert.equal(await p.evaluate(async()=>(await fetch('/api/snapshot?profile=vad')).status),401);
await p.goto('https://www.rodiucov.com/?activate=fixture#profile=vad&setup=fixture-setup');await p.waitForURL('https://rodiucov.com/?activate=fixture#profile=vad&setup=fixture-setup');await p.getByLabel('Password',{exact:true}).fill('Fixture secure password 2026');await p.getByLabel('Confirm password',{exact:true}).fill('Fixture secure password 2026');await p.getByRole('button',{name:'Create password & sign in',exact:true}).click();await p.getByRole('button',{name:'Today',exact:true}).waitFor();
const cookies=await ctx.cookies('https://rodiucov.com/api/');assert(cookies.some(c=>c.httpOnly&&c.secure&&c.sameSite==='Strict'));
assert(!p.url().includes('setup='));assert.equal(await p.evaluate(async()=>(await fetch('/api/snapshot?profile=tatka')).status),401);
await p.reload();await p.getByRole('button',{name:'Today',exact:true}).waitFor();
await p.getByRole('button',{name:'Settings',exact:true}).click();await p.getByRole('button',{name:'Change password',exact:true}).click();await p.getByLabel('Current password',{exact:true}).fill('Fixture secure password 2026');await p.getByLabel('New password (10+ characters)',{exact:true}).fill('Changed fixture password 2026');await p.getByLabel('Confirm new password',{exact:true}).fill('Changed fixture password 2026');await p.getByRole('button',{name:'Save password',exact:true}).click();await p.getByText('Password changed. Other sessions have been signed out.').waitFor();await p.getByRole('button',{name:'Close settings',exact:true}).click();
await p.getByRole('button',{name:'Sign out',exact:true}).click();
// Choose the Vad profile using the real profile picker, then sign in again.
const profileButton=p.getByRole('button',{name:'Vad',exact:true});await profileButton.click();await p.getByLabel('Password',{exact:true}).fill('Changed fixture password 2026');await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.getByRole('button',{name:'Today',exact:true}).waitFor();
assert.deepEqual(errors,[]);console.log('PASS real gateway + browser UI: www canonical redirect preserves setup link, forged local session rejected, one-time setup, secure cookie, profile isolation, reload, password change, logout and sign-in; zero production requests.');await browser.close();
