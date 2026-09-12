export async function prepareIsolation() {
  if (crossOriginIsolated || !isSecureContext || !('serviceWorker' in navigator)) return;
  // Complete any first-visit refresh BEFORE the user can select files.
  const key = 'starshift-isolation-reload';
  try {
    await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}coi-serviceworker.js`, { scope: import.meta.env.BASE_URL });
    await Promise.race([navigator.serviceWorker.ready, new Promise(resolve => setTimeout(resolve, 5000))]);
    if (!navigator.serviceWorker.controller) {
      await Promise.race([new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })), new Promise(resolve => setTimeout(resolve, 3000))]);
    }
    if (navigator.serviceWorker.controller && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      location.reload();
      await new Promise(() => {});
    }
  } catch { /* Other tools work without isolation; DOCX shows a capability message. */ }
}
