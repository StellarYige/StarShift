// Separate from timing measurements: OS sampling and forced GC perturb timing.
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const args=process.argv.slice(2), option=(n,d)=>args.includes(n)?args[args.indexOf(n)+1]:d;
const name=option('--browser','chromium'), rounds=Number(option('--rounds',name==='chromium'?'10':'3'));
const base=option('--url','http://127.0.0.1:4187/StarShift/');
const output=option('--output',`docs/evidence/v0.1.1/memory-${name}.json`);
const tool=option('--tool','docx-pdf');
if(!['docx-pdf','image-pdf'].includes(tool))throw Error('Unsupported measurement tool');
const inputs=tool==='docx-pdf'?['tests/fixtures/中文表格分页.docx']:Array.from({length:10},(_,i)=>`.cache/five-tools-fixtures/image-${String(i+1).padStart(2,'0')}.jpg`);
await mkdir(path.dirname(output),{recursive:true});
const server=await ({chromium,firefox,webkit}[name]).launchServer({headless:true});
const browser=await ({chromium,firefox,webkit}[name]).connect(server.wsEndpoint());
const context=await browser.newContext(), page=await context.newPage();
await context.addInitScript(() => {
  if (window !== top || typeof WeakRef === 'undefined') return;
  const references = window.__releaseReferences = [];
  document.addEventListener('change', event => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'file') {
      for (const file of event.target.files || []) references.push({ kind: 'input', ref: new WeakRef(file) });
    }
  }, true);
  const create = URL.createObjectURL.bind(URL);
  URL.createObjectURL = blob => { references.push({ kind: 'blob', ref: new WeakRef(blob) }); return create(blob); };
});
const cdp=name==='chromium'?await context.newCDPSession(page):null;
await cdp?.send('Performance.enable');
const report={browser:name,version:browser.version(),os:process.platform,time:new Date().toISOString(),rounds,samples:[],limitations:'OS private bytes include engine, browser and subprocesses. Working set sums can double-count shared mappings. Peak is sampled, not guaranteed absolute maximum. CDP GC covers page JS only; it does not prove complete native/WASM reclamation. WeakRef counts cover selected File objects and parent-page Blob URL inputs, without retaining them or recording names. Firefox/WebKit do not have forced page GC here, so live weak references are not by themselves proof of a leak. No instrumentation retaining frames.'};
const execute=promisify(execFile);
report.conversionFailures=[];
async function memory(phase,round) {
  let osMemory=null,jsHeap=null;
  if(process.platform==='win32') {
    const pid=server.process().pid;
    const command=`$allProcesses = Get-CimInstance Win32_Process; $taskPids = [System.Collections.Generic.HashSet[int]]::new(); [void]$taskPids.Add(${pid}); do { $added = $false; foreach ($taskProcess in $allProcesses) { if ($taskPids.Contains([int]$taskProcess.ParentProcessId) -and $taskPids.Add([int]$taskProcess.ProcessId)) { $added = $true } } } while ($added); $taskStats = Get-Process -Id @($taskPids) -ErrorAction SilentlyContinue; [pscustomobject]@{ count = @($taskStats).Count; privateBytes = ($taskStats | Measure-Object -Property PrivateMemorySize64 -Sum).Sum; workingSetBytes = ($taskStats | Measure-Object -Property WorkingSet64 -Sum).Sum } | ConvertTo-Json -Compress`;
    const result=await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{windowsHide:true});osMemory=JSON.parse(result.stdout);
  }
  if(cdp){const {metrics}=await cdp.send('Performance.getMetrics');jsHeap=metrics.find(m=>m.name==='JSHeapUsedSize')?.value??null;}
  const weakReferences=await page.evaluate(() => {
    const refs=window.__releaseReferences;
    if (!refs) return null;
    return Object.fromEntries(['input','blob'].map(kind=>[kind,{observed:refs.filter(r=>r.kind===kind).length,live:refs.filter(r=>r.kind===kind&&r.ref.deref()).length}]));
  });
  const sample={round,phase,time:new Date().toISOString(),osMemory,jsHeap,weakReferences,frames:await page.locator('iframe').count()};report.samples.push(sample);return sample;
}
try {
  report.tool=tool;
  await page.goto(base+'#'+tool);await expect(page.locator('header')).toBeVisible({timeout:30000});
  await memory('baseline',0);
  for(let round=1;round<=rounds;round++) {
    await page.getByTestId('file-input').setInputFiles(inputs);
    await expect(page.getByRole('button',{name:'取消任务',exact:true})).toBeHidden();
    await memory('inputs-ready',round);
    await page.getByRole('button',{name:'开始转换',exact:true}).click();
    while(await page.getByRole('button',{name:'取消任务',exact:true}).isVisible())await memory('processing',round);
    let count=await page.locator('.result-list li').count();
    if(!count&&tool==='image-pdf')throw Error('Image PDF conversion failed');
    if(!count&&name==='chromium') {
      const timeout=await page.locator('.notice').last().textContent();
      const failure={round,type:timeout?.includes('超时')?'timeout':'other',retryRecovered:false};
      report.conversionFailures.push(failure);
      if(failure.type!=='timeout')throw Error('Unexpected Chromium DOCX failure');
      await expect(page.locator('.file-row')).toHaveCount(1);
      await expect(page.locator('iframe')).toHaveCount(0);
      await memory('timed-out-input-retained',round);
      // The resource test also exercises the product's explicit retry. This is
      // outside performance measurement; record the failure, never relabel it.
      await page.getByRole('button',{name:'开始转换',exact:true}).click();
      while(await page.getByRole('button',{name:'取消任务',exact:true}).isVisible())await memory('retry-processing',round);
      count=await page.locator('.result-list li').count();
      if(count!==1)throw Error('Chromium explicit retry did not recover');
      failure.retryRecovered=true;
    }
    if(!count) {
      const message=await page.locator('.notice').last().textContent();
      if(!message?.includes('不兼容'))throw Error('Unexpected DOCX failure');
      report.docx='incompatible';
    } else { report.outcome='converted'; if(tool==='docx-pdf')report.docx='converted'; }
    await memory('batch-finished',round);
    await page.getByRole('button',{name:'清空任务'}).click();
    await expect(page.locator('.file-row, .result-list li, iframe')).toHaveCount(0);
    await memory('cleared-before-gc',round);
    if(cdp){
      await cdp.send('HeapProfiler.collectGarbage');
      const after=await memory('cleared-after-page-gc',round);
      if(after.weakReferences?.input.observed !== inputs.length*round || after.weakReferences?.blob.observed !== (tool==='docx-pdf'?1:11)*round)throw Error('File/Blob reference instrumentation missed an input or output');
      if(after.weakReferences?.input.live || after.weakReferences?.blob.live)throw Error('Selected File or output Blob remains reachable after clear and page GC');
    }
    await mkdir('docs/evidence/v0.1.1',{recursive:true});await writeFile(output,JSON.stringify(report,null,2));
    console.log(JSON.stringify({browser:name,tool,round,outcome:report.outcome,docx:report.docx,after:report.samples.at(-1)}));
  }
}catch(e){report.failure=e.message;process.exitCode=1;}
finally{await writeFile(output,JSON.stringify(report,null,2));await browser.close();await server.close();}
