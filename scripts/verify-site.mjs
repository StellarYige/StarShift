import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
const base=process.argv[2]||'http://127.0.0.1:4187/StarShift/';
const output=process.argv[3]||'docs/evidence/v0.1.1/site-local.json';
const build=process.argv[4]||'dist';
const expected=JSON.parse(await readFile('public/asset-manifest.json','utf8'));
const requests=[];
const get=async(relative)=>{
  const response=await fetch(new URL(relative,base));
  requests.push({path:relative,status:response.status,mime:response.headers.get('content-type'),cacheControl:response.headers.get('cache-control')});
  if(!response.ok)throw Error(relative+': HTTP '+response.status);
  return response;
};
const html=await(await get('')).text();
if(!html.includes('name="application-version" content="0.1.1"'))throw Error('Wrong site version');
const assetPaths=[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]).filter(p=>p.includes('/assets/'));
for(const p of assetPaths)await get(p);
const frameUrl=new URL('office/frame.html',base);
const frame=await(await get(frameUrl.href)).text();
// Follow the script URL actually referenced by the built adapter HTML, keeping
// its entire cache identifier rather than guessing from the product version.
const adapters=[...frame.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m=>new URL(m[1],frameUrl));
if(!adapters.length)throw Error('Missing adapter script');
for(const url of adapters) {
  if(url.origin!==new URL(base).origin||!url.searchParams.get('v'))throw Error('Invalid adapter URL');
  const script=await(await get(url.href)).text();
  const thread=script.match(/(?:\.\/)?thread\.js\?[^"'`\s)]+/);
  if(!thread)throw Error('Missing actual thread URL');
  await get(new URL(thread[0],url).href);
}
await get('coi-serviceworker.js');
const manifest=await(await get('asset-manifest.json')).json();
if(JSON.stringify(manifest)!==JSON.stringify(expected))throw Error('Engine/font manifest changed');
const assets=[];
for(const [file,meta] of Object.entries(expected)) {
  const response=await get(file);
  if(file.endsWith('.wasm')&&!response.headers.get('content-type')?.startsWith('application/wasm'))throw Error('Wrong WASM MIME');
  const bytes=Buffer.from(await response.arrayBuffer());
  const sha256=createHash('sha256').update(bytes).digest('hex');
  if(sha256!==meta.sha256||bytes.length!==meta.bytes)throw Error('Resource differs: '+file);
  assets.push({path:file,sha256,decodedBytes:bytes.length});
}
const licenses=await(await get('licenses/dependencies.json')).json();
await get('licenses/Noto-CJK-OFL.txt');await get('licenses/BUNDLED-FONT-NOTICES.txt');
// Check every built file, including lazily used PDF CMaps, standard fonts and
// optional decoders. HEAD is deployment verification, not transfer measurement.
async function files(directory,prefix='') {
  const result=[];
  for(const entry of await readdir(directory,{withFileTypes:true})) {
    const relative=prefix+entry.name;
    if(entry.isDirectory())result.push(...await files(path.join(directory,entry.name),relative+'/'));
    else if(entry.isFile())result.push(relative);
  }
  return result;
}
const index=build.endsWith('.json')?JSON.parse(await readFile(build,'utf8')):null;
const paths=index?index.paths:await files(build),resourcePaths=[];let next=0;
if(!Array.isArray(paths)||!paths.length||paths.some(p=>typeof p!=='string'||!p||p.includes('\\')||p.startsWith('/')||p.split('/').includes('..'))||new Set(paths).size!==paths.length)throw Error('Invalid build path listing');
await Promise.all(Array.from({length:4},async()=>{
  while(next<paths.length) {
    const relative=paths[next++];
    const response=await fetch(new URL(relative.split('/').map(encodeURIComponent).join('/'),base),{method:'HEAD'});
    if(!response.ok)throw Error(relative+': HEAD '+response.status);
    resourcePaths.push({path:relative,status:response.status,mime:response.headers.get('content-type')});
  }
}));
resourcePaths.sort((a,b)=>a.path.localeCompare(b.path));
await mkdir(path.dirname(output),{recursive:true});
const report={time:new Date().toISOString(),base,version:'0.1.1',buildPathSource:build,buildIdentity:index?{sha:index.sha,run:index.run,logSha256:index.logSha256}:null,requests,resourcePaths,assets,licenseEntries:licenses.length,warning:'Decoded bytes and HEAD checks used only for integrity and deployment, never substituted for performance transfer measurements.'};
await writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify({base,version:report.version,resources:resourcePaths.length,assets:assets.length,licenses:licenses.length}));
