import { checkAbort } from './common';
import { OfficeError } from './office-error';

// Capability checks already used by the pinned engine, without allocating it
// or asking for clipboard access. A denied permission is not incompatibility.
export async function checkOfficeCompatibility(signal?: AbortSignal) {
  checkAbort(signal);
  if (!crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') throw new OfficeError('incompatible', 'DOCX 转 PDF 需要安全隔离环境。请通过 HTTPS 或 localhost 访问并刷新；其他四项工具仍可使用。');
  if (typeof OffscreenCanvas === 'undefined') throw new OfficeError('incompatible');
  if (navigator.permissions?.query) {
    try { await navigator.permissions.query({ name: 'clipboard-read' as PermissionName }); }
    catch (error) { if (error instanceof TypeError) throw new OfficeError('incompatible'); }
  }
  checkAbort(signal);
}
