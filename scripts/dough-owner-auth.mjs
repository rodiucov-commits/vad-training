export const OWNER={issuer:'https://rodiucov.cloudflareaccess.com',audience:'d9cdbfcad5836f48bdad41910ec5e42b87633534bc4dc0c1b69917cd3488bd69',email:'rodiucov@gmail.com'};
let certCache;
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export async function verifyOwnerJWT(token,config=OWNER,get=fetch,now=Date.now()/1000){
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
export function accessToken(request){return request.headers.get('Cf-Access-Jwt-Assertion')||request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('CF_Authorization='))?.slice(17)||''}
