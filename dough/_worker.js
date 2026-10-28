const OWNER={issuer:'https://rodiucov.cloudflareaccess.com',audience:'d9cdbfcad5836f48bdad41910ec5e42b87633534bc4dc0c1b69917cd3488bd69',email:'rodiucov@gmail.com'};
let certCache;
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function verifyOwnerJWT(token,config=OWNER,get=fetch,now=Date.now()/1000){
 try{
  if(!token||token.length>16000||config.audience==='PENDING')return null;
  const parts=token.split('.');if(parts.length!==3)return null;
  const header=JSON.parse(new TextDecoder().decode(decode(parts[0]))),claims=JSON.parse(new TextDecoder().decode(decode(parts[1])));
  if(header.alg!=='RS256'||typeof header.kid!=='string'||claims.iss!==config.issuer||!Array.isArray(claims.aud)||!claims.aud.includes(config.audience)||claims.email?.toLowerCase()!==config.email||!Number.isFinite(claims.exp)||claims.exp<=now||claims.nbf&&claims.nbf>now+30)return null;
  if(!certCache||certCache.issuer!==config.issuer||certCache.until<now||!certCache.keys.some(k=>k.kid===header.kid)){const response=await get(config.issuer+'/cdn-cgi/access/certs');if(!response.ok)return null;const data=await response.json();certCache={issuer:config.issuer,keys:data.keys||[],until:now+300}}
  const jwk=certCache.keys.find(k=>k.kid===header.kid);if(!jwk)return null;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]))?claims:null;
 }catch{return null}
}
function accessToken(request){return request.headers.get('Cf-Access-Jwt-Assertion')||request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('CF_Authorization='))?.slice(17)||''}

export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/_worker.js'||url.pathname==='/owner-auth.js'||url.pathname.startsWith('/tests/')||url.pathname.startsWith('/scripts/'))return new Response('Not found',{status:404});
  if(url.pathname.startsWith('/owner')){
   const claims=await verifyOwnerJWT(accessToken(request));
   if(!claims)return new Response('Owner sign-in required.',{status:401,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}});
   if(url.pathname!=='/owner'){url.pathname='/owner';return Response.redirect(url.href,302)}
   const source=new URL('/',url);const asset=await env.ASSETS.fetch(new Request(source,request));
   const html=(await asset.text()).replace('<head>','<head><base href="/"><meta name="dough-owner" content="true">');
   return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"}});
  }
  const asset=await env.ASSETS.fetch(request);
  if(url.pathname==='/'||/\.(?:js|json|css|html)$/.test(url.pathname)){const headers=new Headers(asset.headers);headers.set('Cache-Control',url.pathname==='/version.json'?'no-store':'public, max-age=0, must-revalidate');return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers})}
  return asset;
 }
};
