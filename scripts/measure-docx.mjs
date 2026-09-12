// Repeatable diagnostic harness, never included in the product. No request interception.
import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { collectNetwork } from './cdp-network.mjs';
const args=process.argv.slice(2), option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const base=option('--url','http://127.0.0.1:4188/StarShift/');
const label=option('--label','baseline-local');
const rounds=Number(option('--rounds','5'));
const batches=Number(option('--batches','5'));
const directory=path.resolve(option('--output','docs/evidence/v0.1.1/performance'));
const profileRoot=path.resolve('.cache/performance',label+'-'+Date.now());
await mkdir(directory,{recursive:true});await mkdir(profileRoot,{recursive:true});
const report={label,base,time:new Date().toISOString(),node:process.version,os:os.type()+' '+os.release(),cpu:os.cpus()[0].model,ram:os.totalmem(),profiles:[],method:'CDP all-target Network; no Fetch/route/cache override or debugger pause. Encoded received bytes include protocol-reported headers; decoded body counts from dataReceived, no manifest substitution. Duplicate sessions and SW wrappers excluded. Cold new profile; revisit new process with same disk profile; five batches in one page.',samples:[]};
const fixture=await readFile('tests/fixtures/中文表格分页.docx');
async function bounded(promise,ms) {
  let timer;
  try {return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Diagnostic operation timed out')),ms);})]);}
  finally {clearTimeout(timer);}
}
async function launch(profile) {
  const child=spawn(chromium.executablePath(),['--headless=new','--no-first-run','--no-default-browser-check','--no-sandbox','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
  process.once('exit',()=>child.kill());
  let buffer='';const endpoint=await new Promise((resolve,reject)=>{child.stderr.on('data',b=>{buffer+=b;const match=buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match)resolve(match[1]);});child.on('error',reject);child.on('exit',code=>reject(Error('Chromium exited '+code)));});
  const network=await collectNetwork(endpoint);
  const browser=await chromium.connectOverCDP(endpoint);
  report.browser=browser.version();
  const context=browser.contexts()[0];
  await context.addInitScript(()=>{
    if(window!==top)return;
    window.__docxMeasure={events:[],start:0};
    const record=(event)=>window.__docxMeasure.events.push({ms:performance.now(),...event});
    const Native=window.MessageChannel;
    window.MessageChannel=class extends Native {
      constructor(){super();this.port1.addEventListener('message',({data})=>{
        if(['progress','ready','done','error'].includes(data?.type))record({type:data.type,id:data.id,phase:data.detail?.phase,message:data.type==='progress'?data.message:undefined});
      });this.port1.start();const post=this.port1.postMessage.bind(this.port1);this.port1.postMessage=(data,...rest)=>{if(data?.type==='convert')record({type:'convert',id:data.id});return post(data,...rest);};}
    };
    let previous='';new MutationObserver(()=>{const value=document.querySelector('.progress-panel')?.textContent||'';if(value!==previous){previous=value;if(value.includes('检查文档'))record({type:'check'});}}).observe(document,{childList:true,subtree:true,characterData:true});
  });
  const page=await context.newPage();await page.setViewportSize({width:1365,height:1000});
  const startupErrors=[];page.on('pageerror',e=>startupErrors.push(e.message));
  await page.goto(base+'#docx-pdf');
  try { await expect(page.locator('header')).toBeVisible({timeout:30000}); }
  catch(e){await writeFile(path.join(directory,label+'-startup-failed.json'),JSON.stringify({error:e.message,startupErrors,network:network.snapshot(),state:await page.evaluate(()=>({isolated:crossOriginIsolated,controller:!!navigator.serviceWorker.controller,html:document.body.innerText}))},null,2));await network.close();await browser.close();throw e;}
  await page.getByTestId('file-input').setInputFiles([1,2].map(n=>({name:`synthetic-${n}.docx`,mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:fixture})));
  await expect(page.getByRole('button',{name:'取消任务',exact:true})).toBeHidden();
  return {browser,context,page,network,async close(){
    // A hung engine can also stop renderer diagnostics. Bound cleanup and end
    // only this harness-owned browser; keep the failed sample in the report.
    await bounded(network.close(),5000).catch(()=>{});
    await bounded(browser.close(),5000).catch(()=>{});
    if(child.exitCode===null)await new Promise(resolve=>{child.once('exit',resolve);setTimeout(()=>{child.kill();resolve();},5000).unref();});
    if(process.platform==='win32') {
      const cleanup=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-File','scripts/stop-test-browser.ps1','-Profile',profile],{encoding:'utf8',windowsHide:true}));
      if(cleanup.stoppedOwnedProcesses.length){
        (report.browserCleanup??=[]).push({time:new Date().toISOString(),profile:path.relative(process.cwd(),profile),...cleanup});
        await writeFile(path.join(directory,label+'.json'),JSON.stringify(report,null,2));
      }
    }
    child.stderr.destroy();
  }};
}
async function measure(session,round,scenario,batch=1) {
  const {page,network}=session;network.clear();
  await page.evaluate(()=>{window.__docxMeasure.events=[];window.__docxMeasure.start=performance.now();});
  const sample={round,scenario,batch,started:new Date().toISOString()};
  const start=Date.now();
  try {
    await page.getByRole('button',{name:/^(开始转换|重新转换)$/}).click();
    await expect(page.locator('.result-list li')).toHaveCount(2,{timeout:270000});
    await expect(page.getByRole('button',{name:'取消任务',exact:true})).toBeHidden();
    sample.elapsedMs=Date.now()-start;
    sample.events=await page.evaluate(()=>window.__docxMeasure.events.map(e=>({...e,ms:e.ms-window.__docxMeasure.start})));
    sample.isolated=await page.evaluate(()=>crossOriginIsolated);
    sample.frames=await page.locator('iframe').count();
    sample.network=network.snapshot();
    // Inspect actual output in each sample; save only synthetic evidence, not input details.
    const download=page.waitForEvent('download');await page.locator('.result-list a[download]').first().click();
    const result=await download;const output=path.join(profileRoot,'verify.pdf');await result.saveAs(output);
    sample.layout=execFileSync('python',['scripts/assert-docx-output.py',output],{encoding:'utf8',windowsHide:true}).includes('PASS');
    if(!sample.layout||sample.frames||!sample.isolated)throw Error('Resource/layout acceptance failed');
    const origin=new URL(base).origin;
    if(sample.network.requests.some(r=>r.method!=='GET'||r.hasBody||new URL(r.url).origin!==origin))throw Error('Network privacy acceptance failed');
    sample.status='passed';
  }catch(e){sample.status='failed';sample.failure=String(e.message).slice(0,1200);sample.elapsedMs=Date.now()-start;sample.network=network.snapshot();sample.events=await bounded(page.evaluate(()=>window.__docxMeasure.events.map(e=>({...e,ms:e.ms-window.__docxMeasure.start}))),5000).catch(()=>null);}
  report.samples.push(sample);await writeFile(path.join(directory,label+'.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({label,round,scenario,batch,status:sample.status,elapsedMs:sample.elapsedMs,receivedBytes:sample.network.receivedBytes,cacheResponses:sample.network.cacheResponses,failure:sample.failure}));
}
const reuseProfile=option('--profile',null);
if(reuseProfile) {
  report.profiles.push(reuseProfile);const session=await launch(path.resolve(reuseProfile));
  try {await measure(session,1,'expired');}finally{await session.close();}
}
for(let round=1;!reuseProfile&&round<=rounds;round++) {
  const profile=path.join(profileRoot,String(round));
  report.profiles.push(path.relative(process.cwd(),profile));
  let session=await launch(profile);
  try {await measure(session,round,'cold');}finally{await session.close();}
  session=await launch(profile);
  try {await measure(session,round,'revisit');for(let batch=1;batch<=batches;batch++)await measure(session,round,'continuous',batch);}finally{await session.close();}
}
if(report.samples.some(s=>s.status!=='passed'))process.exitCode=1;
