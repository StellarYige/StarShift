// Use the exact Pages artifact listing from a completed, audited build. A local
// output directory can contain extra generated files from earlier preparations.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [auditFile,output]=process.argv.slice(2);
if(!auditFile||!output)throw Error('Usage: collect-build-paths.mjs ci-audit.json paths.json');
const audit=JSON.parse(await readFile(auditFile,'utf8'));
const job=audit.jobs.find(j=>j.name==='check');
if(audit.run.conclusion!=='success'||job?.conclusion!=='success')throw Error('Build was not successful');
const log=await readFile(job.log,'utf8');
if(createHash('sha256').update(log).digest('hex')!==job.logSha256)throw Error('Audit log changed');
const start=log.indexOf('##[start-action display=Archive artifact;id=__actions_upload-pages-artifact.__run]');
const end=log.indexOf('##[end-action id=__actions_upload-pages-artifact.__run;',start);
if(start<0||end<start)throw Error('No completed Pages archive listing');
const paths=log.slice(start,end).split('\n').map(line=>line.match(/Z \.\/(.+?)\r?$/)?.[1]).filter(p=>p&&!p.endsWith('/')).sort();
if(paths.length<200||new Set(paths).size!==paths.length||!paths.includes('index.html')||!paths.includes('asset-manifest.json'))throw Error('Incomplete or duplicate artifact listing');
const result={time:new Date().toISOString(),sha:audit.run.sha,run:audit.run.url,log:job.log,logSha256:job.logSha256,method:'File names from the completed Pages tar listing, used only for path verification; not transfer or decoded-size measurements.',paths};
await writeFile(output,JSON.stringify(result,null,2));console.log(JSON.stringify({output,sha:result.sha,paths:paths.length}));
