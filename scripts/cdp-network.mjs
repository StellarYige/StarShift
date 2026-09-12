// Test-only CDP collector. Observe every target without Fetch interception or cache overrides.
// A Service Worker response is a wrapper; count only its underlying network/cache request.
import { networkTotals } from './network-totals.mjs';
export async function collectNetwork(endpoint) {
  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map(), requests = new Map(), targets = new Map(), errors = [];
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, {resolve,reject}); socket.send(JSON.stringify({id,method,params,sessionId}));
  });
  socket.onmessage = async ({data}) => {
    const event = JSON.parse(data);
    if (event.id) { const p = pending.get(event.id); pending.delete(event.id); event.error ? p?.reject(Error(event.error.message)) : p?.resolve(event.result); return; }
    const {method,params:p,sessionId} = event;
    if (method === 'Target.attachedToTarget') {
      targets.set(p.sessionId,p.targetInfo.type);
      try {
        await send('Network.enable',{},p.sessionId);
        await send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:true},p.sessionId);
      } catch (e) { errors.push({target:p.targetInfo.type,error:e.message}); }
      finally { await send('Runtime.runIfWaitingForDebugger',{},p.sessionId).catch(()=>{}); }
    }
    if (!method?.startsWith('Network.') || !p.requestId) return;
    const key = sessionId+':'+p.requestId;
    if (method === 'Network.requestWillBeSent') {
      if (!/^https?:/.test(p.request.url)) return;
      const u=new URL(p.request.url);
      // Only static resource paths are persisted, never request bodies or document metadata.
      requests.set(key,{key,target:targets.get(sessionId),url:u.origin+u.pathname,method:p.request.method,hasBody:!!p.request.hasPostData,start:p.timestamp,decodedBytes:0,payloadBytes:0});
    }
    const r=requests.get(key); if(!r)return;
    if(method==='Network.requestServedFromCache')r.cache=true;
    if(method==='Network.responseReceived') {
      const h=Object.fromEntries(Object.entries(p.response.headers).map(([k,v])=>[k.toLowerCase(),v]));
      Object.assign(r,{status:p.response.status,diskCache:p.response.fromDiskCache||false,serviceWorker:p.response.fromServiceWorker||false,encoding:h['content-encoding']||'identity',cacheControl:h['cache-control']||null,age:h.age||null,date:h.date||null,expires:h.expires||null,contentLength:h['content-length']||null,response:p.timestamp});
    }
    if(method==='Network.responseReceivedExtraInfo')r.networkStatus=p.statusCode;
    if(method==='Network.dataReceived'){r.decodedBytes+=p.dataLength;r.payloadBytes+=p.encodedDataLength;r.dataEvents=(r.dataEvents||0)+1;}
    if(method==='Network.loadingFinished'){r.receivedBytes=p.encodedDataLength;r.end=p.timestamp;}
    if(method==='Network.loadingFailed'){r.failure=p.errorText;r.end=p.timestamp;}
  };
  await send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:true});
  return {
    snapshot() {
      const raw=[...requests.values()];
      return {requests:raw,...networkTotals(raw),targetTypes:[...new Set(targets.values())],errors};
    },
    clear(){requests.clear();},
    async close(){await send('Target.setAutoAttach',{autoAttach:false,waitForDebuggerOnStart:false,flatten:true}).catch(()=>{});socket.close();},
  };
}
