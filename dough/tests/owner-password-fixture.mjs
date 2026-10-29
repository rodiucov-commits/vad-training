import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';import path from 'node:path';
import {AUTH_SCHEMA,tokenHash} from '../../scripts/dough-password-auth.mjs';
import https from 'node:https';import os from 'node:os';import {execFileSync} from 'node:child_process';import worker from '../_worker.js';
export const fixtureToken='a'.repeat(64),fixturePassword='GoodTest10',email='rodiucov@gmail.com',origin='https://dc.test';
export async function fixtureDB(){const raw=new DatabaseSync(':memory:');const db={raw,exec:async s=>raw.exec(s),prepare(sql){const stmt=raw.prepare(sql);const bound=(values=[])=>({first:async()=>stmt.get(...values)||null,all:async()=>({results:stmt.all(...values)}),run:async()=>({meta:{changes:stmt.run(...values).changes}}),runSync:()=>({meta:{changes:stmt.run(...values).changes}})});return {...bound(),bind:(...values)=>bound(values)};}};db.batch=async statements=>{raw.exec('BEGIN');try{const results=statements.map(s=>s.runSync());raw.exec('COMMIT');return results;}catch(e){raw.exec('ROLLBACK');throw e;}};await db.exec(AUTH_SCHEMA);await db.prepare('UPDATE dough_owner SET setup_hash=?,setup_expires=? WHERE id=1').bind(await tokenHash(fixtureToken),Date.now()+3600000).run();return db;}
export function assets(){const root=path.resolve(import.meta.dirname,'..');return {fetch:async req=>{const p=new URL(req.url).pathname,file=path.join(root,p==='/'?'index.html':p);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return new Response('Not found',{status:404});return new Response(fs.readFileSync(file),{headers:{'Content-Type':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.svg')?'image/svg+xml':'text/html'}});}};}
// A real HTTPS fixture tests redirects and cookies without Playwright's intercepted-
// redirect limitation. The certificate and all account secrets are synthetic.
export async function fixtureServer(env){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dough-auth-fixture-'));
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',dir+'/key.pem','-out',dir+'/cert.pem','-days','1','-subj','/CN=dc.test'],{stdio:'ignore'});
 let origin;
 const server=https.createServer({key:fs.readFileSync(dir+'/key.pem'),cert:fs.readFileSync(dir+'/cert.pem')},async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);const response=await worker.fetch(new Request(origin+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})}),env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(error){res.writeHead(500);res.end(String(error));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='https://dc.test:'+server.address().port;
 return {origin,close:async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
