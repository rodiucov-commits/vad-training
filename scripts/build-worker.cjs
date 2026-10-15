const fs=require('fs'),path=require('path');
if(!process.argv[2])throw Error('Usage: node scripts/build-worker.cjs /private/auth.config.json /private/output.mjs');
const root=path.resolve(__dirname,'..'),config=JSON.parse(fs.readFileSync(process.argv[2]));
if(!/^[a-f0-9]{64}$/.test(config.machineHash))throw Error('Expected a machine credential HASH, never the raw credential');
const legacy=fs.readFileSync(root+'/backend/worker.legacy.mjs','utf8').replace(/export\s*\{\s*worker_default as default\s*\};/,'').replace(/\/\/# sourceMappingURL=.*$/m,'');
const auth=fs.readFileSync(root+'/backend/auth.mjs','utf8').replace(/export /g,'');
const output=process.argv[3]||'/tmp/vad-training-api-secure.mjs';fs.writeFileSync(output,legacy+'\n'+auth+'\nexport default createSecureGateway(worker_default,'+JSON.stringify(config)+');\n',{mode:0o600});console.log('Prepared single-module Worker; existing DB and API_TOKEN bindings must be retained.');
