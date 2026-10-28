// Password authentication for Dough only. Deploy by bundling this module into _worker.js.
// DOUGH_AUTH_DB is a separate D1 database, never the training database.
export const OWNER_EMAIL='rodiucov@gmail.com';
export const OWNER_COOKIE='__Host-dough_owner';
const SESSION_MS=8*60*60*1000, BLOCK_MS=10*60*1000;
const encode=new TextEncoder();
export const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
export async function tokenHash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encode.encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
async function derive(password,salt){const key=await crypto.subtle.importKey('raw',encode.encode(password),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:100000,salt:encode.encode(salt)},key,256)),b=>b.toString(16).padStart(2,'0')).join('');}
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
function json(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...headers}});}
function rawCookie(req){return (req.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(OWNER_COOKIE+'='))?.slice(OWNER_COOKIE.length+1);}
const cookie=(raw,age=SESSION_MS/1000)=>`${OWNER_COOKIE}=${raw}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Strict`;
export const AUTH_SCHEMA=`CREATE TABLE IF NOT EXISTS dough_owner (id INTEGER PRIMARY KEY CHECK(id=1), password_hash TEXT, salt TEXT, setup_hash TEXT, setup_expires INTEGER);
CREATE TABLE IF NOT EXISTS dough_sessions (token_hash TEXT PRIMARY KEY, salt TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS dough_attempts (attempt_key TEXT PRIMARY KEY, failures INTEGER NOT NULL, blocked_until INTEGER NOT NULL);
INSERT OR IGNORE INTO dough_owner (id) VALUES (1);`;
export function createPasswordAuth(){
 let initialized;
 async function ready(db){if(!db)throw Error('Missing auth database');if(!initialized)initialized=Promise.resolve(db.exec(AUTH_SCHEMA)).catch(e=>{initialized=null;throw e;});return initialized;}
 async function session(req,db){await ready(db);const raw=rawCookie(req);if(!raw||!/^[a-f0-9]{64}$/.test(raw))return null;return db.prepare('SELECT s.token_hash FROM dough_sessions s JOIN dough_owner u ON u.id=1 AND u.salt=s.salt WHERE s.token_hash=? AND s.expires>?').bind(await tokenHash(raw),Date.now()).first();}
 async function issue(db,salt){const raw=randomToken();await db.prepare('INSERT INTO dough_sessions (token_hash,salt,expires) VALUES (?,?,?)').bind(await tokenHash(raw),salt,Date.now()+SESSION_MS).run();await db.prepare('DELETE FROM dough_sessions WHERE expires<=?').bind(Date.now()).run();return json({ok:true,email:OWNER_EMAIL},200,{'Set-Cookie':cookie(raw)});}
 async function api(req,db){
  try{
   const url=new URL(req.url),path=url.pathname;
   if(path==='/owner/api/session'&&req.method==='GET')return await session(req,db)?json({ok:true,email:OWNER_EMAIL}):json({error:'Sign in required'},401);
   if(req.method!=='POST')return json({error:'Method not allowed'},405,{'Allow':'POST'});
   if(req.headers.get('Origin')!==url.origin||req.headers.get('Sec-Fetch-Site')==='cross-site')return json({error:'Request origin not allowed'},403);
   if(!/^application\/json(?:;|$)/i.test(req.headers.get('Content-Type')||''))return json({error:'JSON required'},415);
   await ready(db);
   if(path==='/owner/api/logout'){const raw=rawCookie(req);if(raw&&/^[a-f0-9]{64}$/.test(raw))await db.prepare('DELETE FROM dough_sessions WHERE token_hash=?').bind(await tokenHash(raw)).run();return json({ok:true},200,{'Set-Cookie':cookie('',0)});}
   if(!['/owner/api/login','/owner/api/setup','/owner/api/change-password'].includes(path))return json({error:'Not found'},404);
   if(Number(req.headers.get('Content-Length')||0)>4096)return json({error:'Request too large'},413);
   // Stream cap avoids reading unbounded chunked bodies before validation.
   const reader=req.body?.getReader();let text='',length=0;if(reader){const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>4096){await reader.cancel();return json({error:'Request too large'},413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}
   let body;try{body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw 0;}catch{return json({error:'Invalid request'},400);}
   const setup=path.endsWith('/setup'),changing=path.endsWith('/change-password');
   if(changing&&!await session(req,db))return json({error:'Sign in required'},401);
   const user=await db.prepare('SELECT * FROM dough_owner WHERE id=1').first();
   const validSetup=setup&&typeof body.token==='string'&&/^[a-f0-9]{64}$/.test(body.token)&&user?.setup_expires>Date.now()&&equal(await tokenHash(body.token),user.setup_hash);
   const ipKey=await tokenHash(req.headers.get('CF-Connecting-IP')||'unknown');
   const keys=[ipKey,'account'];const attempts=await Promise.all(keys.map(k=>db.prepare('SELECT failures,blocked_until FROM dough_attempts WHERE attempt_key=?').bind(k).first()));
   if(attempts.some(a=>a?.blocked_until>Date.now())&&!validSetup)return json({error:'Too many attempts. Try again in 10 minutes.'},429,{'Retry-After':'600'});
   const password=changing?body.oldPassword:body.password;
   const newPassword=changing?body.newPassword:body.password;
   if((setup||changing)&&(typeof newPassword!=='string'||newPassword.length<10||newPassword.length>256))return json({error:'Use a password of 10–256 characters.'},400);
   let valid=validSetup;
   if(!setup){const candidate=await derive(typeof password==='string'&&password.length<=256?password:'',user?.salt||'unconfigured-account');valid=typeof password==='string'&&password.length<=256&&equal(candidate,user?.password_hash)&&typeof body.email==='string'&&body.email.trim().toLowerCase()===OWNER_EMAIL;}
   if(!valid){for(const [i,k]of keys.entries()){const prior=attempts[i],n=(prior?.blocked_until&&prior.blocked_until<=Date.now()?0:prior?.failures||0)+1;await db.prepare('INSERT INTO dough_attempts (attempt_key,failures,blocked_until) VALUES (?,?,?) ON CONFLICT(attempt_key) DO UPDATE SET failures=CASE WHEN blocked_until>0 AND blocked_until<=? THEN 1 ELSE failures+1 END,blocked_until=CASE WHEN blocked_until>0 AND blocked_until<=? THEN 0 WHEN failures+1>=? THEN ? ELSE blocked_until END').bind(k,n,n>=(i?25:5)?Date.now()+BLOCK_MS:0,Date.now(),Date.now(),i?25:5,Date.now()+BLOCK_MS).run();}return json({error:'Invalid email, password or setup link.'},401);}
   let salt=user.salt;
   if(setup||changing){salt=randomToken();const hash=await derive(newPassword,salt);const result=setup?await db.prepare('UPDATE dough_owner SET password_hash=?,salt=?,setup_hash=NULL,setup_expires=NULL WHERE id=1 AND setup_hash=? AND setup_expires>?').bind(hash,salt,user.setup_hash,Date.now()).run():await db.prepare('UPDATE dough_owner SET password_hash=?,salt=?,setup_hash=NULL,setup_expires=NULL WHERE id=1 AND salt=?').bind(hash,salt,user.salt).run();if(!result.meta?.changes)return json({error:'This link or session is no longer valid.'},401);await db.prepare('DELETE FROM dough_sessions WHERE salt<>?').bind(salt).run();}
   await db.prepare('DELETE FROM dough_attempts WHERE attempt_key=? OR attempt_key=?').bind(ipKey,'account').run();return issue(db,salt);
  }catch{return json({error:'Sign-in is temporarily unavailable. Please try again later.'},503);}
 }
 return {session,api};
}
