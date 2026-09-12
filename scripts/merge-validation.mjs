import {readFile,writeFile} from 'node:fs/promises';
const [output,...inputs]=process.argv.slice(2);
if(!output||!inputs.length)throw Error('Usage: merge-validation.mjs output.json earlier.json later.json');
const byTest=new Map(),sources=[];
for(const input of inputs) {
  const report=JSON.parse(await readFile(input,'utf8'));
  sources.push({path:input,stats:report.stats});
  for(const test of report.tests)byTest.set([test.project,test.file,test.title].join('|'),{...test,evidenceSource:input});
}
const tests=[...byTest.values()];
const count=status=>tests.filter(t=>t.results.at(-1)?.status===status).length;
const stats={passed:count('passed'),skipped:count('skipped'),failed:tests.filter(t=>!['passed','skipped'].includes(t.results.at(-1)?.status)).length};
await writeFile(output,JSON.stringify({time:new Date().toISOString(),method:'Latest result per project/file/title from the complete matrix and targeted reruns. Earlier failures remain in source reports. This is not presented as a single clean run.',sources,stats,tests},null,2));
console.log(JSON.stringify({output,stats}));
if(stats.failed)process.exitCode=1;
