const auth=createPasswordAuth();
const privateHeaders={'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"};
export default {async fetch(request,env){
 const url=new URL(request.url),p=url.pathname;
 if(p==='/_worker.js'||p==='/owner-auth.js'||p.startsWith('/tests/')||p.startsWith('/scripts/')||p==='/owner-login.html')return new Response('Not found',{status:404});
 if(p==='/api/recipes')return recipeStore.fetch(request,env,async()=>false);
 if(p==='/api/recipe-archive')return recipeArchive.fetch(request,env,async()=>false);
 if(p==='/owner'||p.startsWith('/owner/')){
  if(!['dc.rodiucov.com','dough-calculator-2nr.pages.dev','dc.test'].includes(url.hostname))return new Response('Not found',{status:404});
  if(p==='/owner/api/recipes')return recipeStore.fetch(request,env,r=>auth.session(r,env.DOUGH_AUTH_DB));
  if(p==='/owner/api/recipe-archive')return recipeArchive.fetch(request,env,r=>auth.session(r,env.DOUGH_AUTH_DB));
  if(p.startsWith('/owner/api/'))return auth.api(request,env.DOUGH_AUTH_DB);
  let signedIn=false;try{signedIn=!!await auth.session(request,env.DOUGH_AUTH_DB);}catch{if(!['/owner/login','/owner/setup'].includes(p))return new Response('Sign-in is temporarily unavailable.',{status:503,headers:privateHeaders});}
  if(p==='/owner/login'||p==='/owner/setup'||p==='/owner/account'){
   if(p==='/owner/account'&&!signedIn)return new Response(null,{status:303,headers:{Location:'/owner/login','Cache-Control':'no-store'}});
   const source=new URL('/owner-login.html',url),asset=await env.ASSETS.fetch(new Request(source));
   if(!asset.ok)return new Response('Sign-in is temporarily unavailable.',{status:503,headers:privateHeaders});return new Response(asset.body,{headers:privateHeaders});
  }
  if(!signedIn)return new Response(null,{status:303,headers:{Location:'/owner/login','Cache-Control':'no-store'}});
  if(p!=='/owner')return new Response(null,{status:303,headers:{Location:'/owner','Cache-Control':'no-store'}});
  const asset=await env.ASSETS.fetch(new Request(new URL('/',url)));
  if(!asset.ok)return new Response('Temporarily unavailable.',{status:503,headers:privateHeaders});
  return new Response((await asset.text()).replace('<head>','<head><base href="/owner"><meta name="dough-owner" content="true">'),{headers:privateHeaders});
 }
 const asset=await env.ASSETS.fetch(request);
 if(p==='/'||/\.(?:js|json|css|html)$/.test(p)){const headers=new Headers(asset.headers);headers.set('Cache-Control',p==='/version.json'?'no-store':'public, max-age=0, must-revalidate');return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});}
 return asset;
}};
