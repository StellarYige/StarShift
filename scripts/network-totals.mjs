export function uniqueRequests(raw) {
  return [...new Map(raw.map(r => [[r.target, r.key.split(':').at(-1), r.url, r.start].join('|'), r])).values()];
}
export function networkTotals(raw) {
  const unique = uniqueRequests(raw), underlying = unique.filter(r => !r.serviceWorker);
  const cached = r => r.diskCache || r.cache || r.networkStatus === 304;
  const transferred = underlying.filter(r => r.networkStatus === 304 || !cached(r));
  const networkBodies = underlying.filter(r => !cached(r));
  const cacheBodies = underlying.filter(cached);
  const decoded = rows => rows.some(r => !r.dataEvents) ? null : rows.reduce((n, r) => n + r.decodedBytes, 0);
  const knownReceivedBytes = transferred.reduce((n, r) => n + (r.receivedBytes || 0), 0);
  const unmeasuredReceivedRequests = transferred.filter(r => !Number.isFinite(r.receivedBytes)).length;
  return {
    duplicateObservations: raw.length - unique.length,
    receivedBytes: unmeasuredReceivedRequests ? null : knownReceivedBytes,
    knownReceivedBytes, unmeasuredReceivedRequests,
    decodedBytes: decoded(underlying),
    decodedNetworkBytes: decoded(networkBodies), decodedCacheBytes: decoded(cacheBodies),
    unmeasuredDecodedRequests: underlying.filter(r => !r.dataEvents).length,
    // Observed payload chunks are a lower bound when a request fails; they are
    // never substituted for a missing loadingFinished total.
    payloadBytes: transferred.reduce((n, r) => n + r.payloadBytes, 0),
    cacheResponses: cacheBodies.length,
    serviceWorkerWrappers: unique.length - underlying.length,
    incomplete: unique.filter(r => r.end === undefined).length,
  };
}
