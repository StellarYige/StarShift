import { docxDirectory } from './measurement-paths.mjs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { networkTotals, uniqueRequests } from './network-totals.mjs';
const root=docxDirectory;
const statistics=values=>{
  const v=values.filter(Number.isFinite).sort((a,b)=>a-b);
  return v.length?{n:v.length,median:v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2,min:v[0],max:v.at(-1)}:null;
};
const summaries={};
for(const file of await readdir(root)) {
  if(!file.endsWith('.json')||file.startsWith('pilot')||file==='summary.json')continue;
  const report=JSON.parse(await readFile(root+'/'+file,'utf8'));if(!report.samples)continue;
  for(const sample of report.samples) {
    const network=sample.network;
    Object.assign(network,networkTotals(network.requests));
    const unique=uniqueRequests(network.requests);
    const underlying=unique.filter(r=>!r.serviceWorker);
    const events=sample.events||[];
    const first=predicate=>events.find(predicate)?.ms;
    const font=first(e=>e.message==='正在加载中文字体…'), engine=first(e=>e.message==='正在加载文档引擎资源…');
    const ready=first(e=>e.type==='ready');
    const initialize=events.filter(e=>e.message==='正在初始化文档排版引擎…').at(-1)?.ms;
    const imports=events.filter(e=>e.message==='正在解析文档并排版…');
    const exports=events.filter(e=>e.message==='正在导出 PDF…');
    const done=events.filter(e=>e.type==='done');
    const checks=events.filter(e=>e.type==='check');
    const converts=events.filter(e=>e.type==='convert');
    const resources=underlying.filter(r=>/\/(engine|fonts|office)\//.test(r.url)&&r.end!==undefined);
    const duration=(end,start)=>Number.isFinite(end)&&Number.isFinite(start)?end-start:null;
    sample.stages={
      firstDocumentCheckIsolatedMs:null,
      firstCheckAndAdapterBootstrapMs:duration(font,checks[0]?.ms),
      nextDocumentCheckMs:duration(converts[1]?.ms,checks[1]?.ms),
      fontWaitMs:duration(engine,font),
      resourceResponsesSpanMs:resources.length?(Math.max(...resources.map(r=>r.end))-Math.min(...resources.map(r=>r.start)))*1000:null,
      lastInitializationToUnoReadyMs:duration(ready,initialize),
      startToUnoReadyMs:ready??null,
      importMs:imports.map((e,i)=>duration(exports[i]?.ms,e.ms)),
      exportMs:exports.map((e,i)=>duration(done[i]?.ms,e.ms)),
      documentMs:converts.map((e,i)=>duration(done[i]?.ms,e.ms)),
      batchMs:sample.elapsedMs,
    };
  }
  report.measurementNotes='Statistics recomputed from immutable raw events with cross-session request deduplication. CDP font/data/wasm body events are observed directly; no manifest sizes used. First document check cannot be isolated from adapter bootstrap in v0.1.0; explicitly null. Resource response span and initialization overlap; do not sum these stages. Failures remain in the sample set and are excluded only from success medians.';
  await writeFile(root+'/'+file,JSON.stringify(report,null,2));
  const groups={};
  for(const scenario of [...new Set(report.samples.map(s=>s.scenario))]){
    const all=report.samples.filter(s=>s.scenario===scenario),ok=all.filter(s=>s.status==='passed');
    groups[scenario]={passed:ok.length,failed:all.length-ok.length,batchMs:statistics(ok.map(s=>s.elapsedMs)),receivedBytes:statistics(ok.map(s=>s.network.receivedBytes)),decodedNetworkBytes:statistics(ok.map(s=>s.network.decodedNetworkBytes)),decodedCacheBytes:statistics(ok.map(s=>s.network.decodedCacheBytes))};
    for(const stage of ['fontWaitMs','resourceResponsesSpanMs','lastInitializationToUnoReadyMs','startToUnoReadyMs','nextDocumentCheckMs'])groups[scenario][stage]=statistics(ok.map(s=>s.stages[stage]??NaN));
    groups[scenario].firstDocumentMs=statistics(ok.map(s=>s.stages.documentMs[0]??NaN));
    groups[scenario].subsequentDocumentMs=statistics(ok.map(s=>s.stages.documentMs[1]??NaN));
    groups[scenario].firstImportMs=statistics(ok.map(s=>s.stages.importMs[0]??NaN));
    groups[scenario].firstExportMs=statistics(ok.map(s=>s.stages.exportMs[0]??NaN));
    groups[scenario].subsequentImportMs=statistics(ok.map(s=>s.stages.importMs[1]??NaN));
    groups[scenario].subsequentExportMs=statistics(ok.map(s=>s.stages.exportMs[1]??NaN));
    groups[scenario].failures=all.filter(s=>s.status!=='passed').map(s=>({round:s.round,batch:s.batch,elapsedMs:s.elapsedMs,failure:s.failure}));
  }
  summaries[report.label]={browser:report.browser,time:report.time,groups};
}
await writeFile(root+'/summary.json',JSON.stringify(summaries,null,2));
console.log(JSON.stringify(summaries,null,2));
