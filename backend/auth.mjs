// Server-side profile sessions. All authentication state lives in D1, never browser storage.
const PROFILES=new Set(['vad','tatka']);
const SESSION_MS=30*24*60*60*1000;
const encoder=new TextEncoder();
export async function sha(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
const random=()=>{const b=crypto.getRandomValues(new Uint8Array(32));return [...b].map(x=>x.toString(16).padStart(2,'0')).join('');};
async function passwordHash(password,salt){const k=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);const b=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},k,256);return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;}
function reply(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});}
const cookieName=p=>'__Secure-vt_session_'+p;
const cookie=(p,t,age=SESSION_MS/1000)=>`${cookieName(p)}=${t}; Path=/api; Max-Age=${age}; HttpOnly; Secure; SameSite=Strict`;
export function createSecureGateway(legacy,config){
 let ready;
 async function schema(db){
  if(!ready)ready=(async()=>{
   await db.exec('CREATE TABLE IF NOT EXISTS auth_v1_users (profile TEXT PRIMARY KEY,password_hash TEXT,salt TEXT,setup_hash TEXT,setup_expires INTEGER);\nCREATE TABLE IF NOT EXISTS auth_v1_sessions (token_hash TEXT PRIMARY KEY,profile TEXT NOT NULL,expires INTEGER NOT NULL);\nCREATE TABLE IF NOT EXISTS auth_v1_attempts (attempt_key TEXT PRIMARY KEY,failures INTEGER NOT NULL,blocked_until INTEGER NOT NULL);');
   for(const [profile,hash]of Object.entries(config.setupHashes||{}))await db.prepare('INSERT INTO auth_v1_users (profile,setup_hash,setup_expires) VALUES (?,?,?) ON CONFLICT(profile) DO NOTHING').bind(profile,hash,config.setupExpires).run();
  })().catch(e=>{ready=null;throw e;});return ready;
 }
 async function session(req,env,profile){
  const raw=(req.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName(profile)+'='))?.slice(cookieName(profile).length+1);
  if(!raw||!/^[0-9a-f]{64}$/.test(raw))return null;
  return env.DB.prepare('SELECT profile FROM auth_v1_sessions WHERE token_hash=? AND profile=? AND expires>?').bind(await sha(raw),profile,Date.now()).first();
 }
 async function issue(env,profile){
  const token=random();await env.DB.prepare('INSERT INTO auth_v1_sessions (token_hash,profile,expires) VALUES (?,?,?)').bind(await sha(token),profile,Date.now()+SESSION_MS).run();
  await env.DB.prepare('DELETE FROM auth_v1_sessions WHERE expires<=?').bind(Date.now()).run();
  return reply({ok:true,profile},200,{'Set-Cookie':cookie(profile,token)});
 }
 return {async fetch(req,env,ctx){
  const url=new URL(req.url),path=url.pathname;
  if(path==='/api/health')return reply({ok:true,ts:Date.now(),authVersion:1});
  if(!path.startsWith('/api/'))return reply({error:'Not found'},404);
  const profile=(url.searchParams.get('profile')||'vad').toLowerCase();
  if(!PROFILES.has(profile))return reply({error:'Unknown profile'},400);
  const bearer=req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  const machine=!!bearer&&equal(await sha(bearer),config.machineHash);
  const origin=req.headers.get('Origin');
  if(!machine && origin && origin!==url.origin && origin!=='https://rodiucov.com')return reply({error:'Origin not allowed'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
  try{
   await schema(env.DB);
   if(path==='/api/auth/session'&&req.method==='GET')return (machine||await session(req,env,profile))?reply({ok:true,profile}):reply({error:'Sign in required'},401);
   if(path==='/api/auth/logout'&&req.method==='POST'){
    const token=(req.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName(profile)+'='))?.slice(cookieName(profile).length+1);
    if(token)await env.DB.prepare('DELETE FROM auth_v1_sessions WHERE token_hash=? AND profile=?').bind(await sha(token),profile).run();
    return reply({ok:true},200,{'Set-Cookie':cookie(profile,'',0)});
   }
   if(path==='/api/auth/enroll'&&req.method==='POST'){
    if(!machine)return reply({error:'Not authorized'},403);
    const token=random(),expires=Date.now()+48*60*60*1000;
    await env.DB.prepare('UPDATE auth_v1_users SET setup_hash=?,setup_expires=? WHERE profile=?').bind(await sha(token),expires,profile).run();
    return reply({ok:true,profile,setupToken:token,expires});
   }
   if((path==='/api/auth/login'||path==='/api/auth/setup'||path==='/api/auth/change-password')&&req.method==='POST'){
    const size=Number(req.headers.get('Content-Length')||0);if(size>8192)return reply({error:'Request too large'},413);
    const text=await req.text();if(text.length>8192)return reply({error:'Request too large'},413);
    let body;try{body=JSON.parse(text);}catch{return reply({error:'Invalid request'},400);}
    const changing=path==='/api/auth/change-password';
    if(changing){if(!await session(req,env,profile))return reply({error:'Sign in required'},401);if(typeof body.newPassword!=='string'||body.newPassword.length<10||body.newPassword.length>256)return reply({error:'Use a password of 10–256 characters'},400);body.password=body.oldPassword;}
    const key=await sha((req.headers.get('CF-Connecting-IP')||'unknown')+':'+profile);
    const attempt=await env.DB.prepare('SELECT failures,blocked_until FROM auth_v1_attempts WHERE attempt_key=?').bind(key).first();
    const user=await env.DB.prepare('SELECT * FROM auth_v1_users WHERE profile=?').bind(profile).first();
    // A valid, high-entropy one-time recovery token is a separate credential:
    // password guessing must not prevent its owner recovering the account.
    const validSetup=path==='/api/auth/setup'&&!!user?.setup_hash&&user.setup_expires>Date.now()&&typeof body.token==='string'&&body.token.length<=256&&equal(await sha(body.token),user.setup_hash);
    if(attempt?.blocked_until>Date.now()&&!validSetup)return reply({error:'Too many attempts. Try again in 10 minutes.'},429,{'Retry-After':'600'});
    let valid=false;
    if(path.endsWith('/setup')){
     if(typeof body.password!=='string'||body.password.length<10||body.password.length>256)return reply({error:'Use a password of 10–256 characters'},400);
     valid=validSetup;
     if(valid){const salt=random(),hash=await passwordHash(body.password,salt);
      const changed=await env.DB.prepare('UPDATE auth_v1_users SET password_hash=?,salt=?,setup_hash=NULL,setup_expires=NULL WHERE profile=? AND setup_hash=?').bind(hash,salt,profile,user.setup_hash).run();
      if(changed.meta?.changes===0)return reply({error:'Setup link has already been used'},401);
      await env.DB.prepare('DELETE FROM auth_v1_sessions WHERE profile=?').bind(profile).run();
     }
    }else if(typeof body.password==='string'&&body.password.length<=256){
     // Equal work for missing accounts prevents cheap user-state probing.
     const candidate=await passwordHash(body.password,user?.salt||'unconfigured-account');valid=!!user?.password_hash&&equal(candidate,user.password_hash);
    }
    if(!valid){const failures=(attempt?.blocked_until&&attempt.blocked_until<=Date.now()?0:attempt?.failures||0)+1;
     await env.DB.prepare('INSERT INTO auth_v1_attempts (attempt_key,failures,blocked_until) VALUES (?,?,?) ON CONFLICT(attempt_key) DO UPDATE SET failures=excluded.failures,blocked_until=excluded.blocked_until').bind(key,failures,failures>=5?Date.now()+600000:0).run();
     return reply({error:'Invalid credentials or setup link'},401);
    }
    if(changing){const salt=random(),hash=await passwordHash(body.newPassword,salt);await env.DB.prepare('UPDATE auth_v1_users SET password_hash=?,salt=?,setup_hash=NULL,setup_expires=NULL WHERE profile=?').bind(hash,salt,profile).run();await env.DB.prepare('DELETE FROM auth_v1_sessions WHERE profile=?').bind(profile).run();}
    await env.DB.prepare('DELETE FROM auth_v1_attempts WHERE attempt_key=?').bind(key).run();return issue(env,profile);
   }
   if(!machine&&!await session(req,env,profile))return reply({error:'Sign in required'},401);
   // The legacy handler still enforces its own bearer check for writes. This header exists
   // only in this server-to-server Request; the public legacy token is never accepted above.
   const headers=new Headers(req.headers);headers.set('Authorization','Bearer '+env.API_TOKEN);
   const result=await legacy.fetch(new Request(req,{headers}),env,ctx);
   const responseHeaders=new Headers(result.headers);responseHeaders.set('Cache-Control','no-store');responseHeaders.delete('Access-Control-Allow-Origin');
   return new Response(result.body,{status:result.status,statusText:result.statusText,headers:responseHeaders});
  }catch(e){return reply({error:'Service temporarily unavailable'},503);}
 }};
}
