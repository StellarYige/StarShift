export type OfficeErrorCode = 'download' | 'initialize' | 'incompatible' | 'document' | 'timeout';
const messages: Record<OfficeErrorCode, string> = {
  download: '文档引擎资源下载失败，请检查网络和站点资源后重试。',
  initialize: '文档引擎初始化失败，请关闭其他大文件后重试。',
  incompatible: '当前浏览器不兼容此文档引擎，请使用桌面 Chrome / Edge。其他四项工具仍可使用。',
  document: '文档无法导入或导出，请在原软件中重新另存为 DOCX 后重试。',
  timeout: '文档处理超时，请减少文档大小后重试。',
};
export class OfficeError extends Error {
  constructor(public readonly code: OfficeErrorCode, message = messages[code]) { super(message); this.name = 'OfficeError'; }
  get stopsBatch() { return this.code !== 'document'; }
}
