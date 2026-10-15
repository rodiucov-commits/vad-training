const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process'),Babel=require('@babel/standalone');
const root=path.resolve(__dirname,'..');process.chdir(root);fs.mkdirSync('assets',{recursive:true});
const hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,12);
// Only build-generated, content-hashed assets may be retired; vendor files stay pinned.
// Retain old content-hashed files so an already-open/cached page can finish loading after deployment.
const result=cp.spawnSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-c','tailwind.config.cjs','-i','scripts/tailwind.css','-o','assets/styles.build.css','--minify'],{stdio:'inherit'});if(result.status)process.exit(result.status);
const css=fs.readFileSync('assets/styles.build.css'),cssFile='assets/styles.'+hash(css)+'.css';fs.renameSync('assets/styles.build.css',cssFile);
for(const file of ['index.html','chrono.html']){
 let html=fs.readFileSync('src/'+file,'utf8');
 html=html.replace('<script src="https://cdn.tailwindcss.com"></script>',`<link rel="stylesheet" href="/${cssFile}">`)
 .replace(/<script src="https:\/\/unpkg.com\/@babel\/standalone[^>]+><\/script>/,'')
 .replace(/https:\/\/unpkg.com\/react@[^/]+\/umd\/react.production.min.js/g,'/assets/vendor/react-18.3.1.min.js')
 .replace(/https:\/\/unpkg.com\/react-dom@[^/]+\/umd\/react-dom.production.min.js/g,'/assets/vendor/react-dom-18.3.1.min.js');
 html=html.replace(/<script\b[^>]*type="text\/babel"[^>]*>([\s\S]*?)<\/script>/g,(_,code)=>{
  const js=Babel.transform(code,{presets:['env','react'],compact:true,comments:false}).code;
  const dest='assets/'+(file==='index.html'?'app':'chrono')+'.'+hash(js)+'.js';fs.writeFileSync(dest,js);return `<script src="/${dest}"></script>`;
 });
 fs.writeFileSync(file,html);console.log(file+' production assets built');
}
