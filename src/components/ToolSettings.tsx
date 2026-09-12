import type { Settings, ToolId } from '../types';
import { settingsErrors } from '../core/queue';

export default function ToolSettings({ tool, settings, set, disabled }: { tool: ToolId; settings: Settings; set: (value: Partial<Settings>) => void; disabled: boolean }) {
  const image = tool === 'image-convert';
  const raster = tool === 'pdf-image';
  const pdf = tool === 'image-pdf';
  const errors = settingsErrors(tool, settings);
  const error = (key: keyof Settings) => errors[key] && <span className="field-error" id={`error-${key}`} role="alert">{errors[key]}</span>;
  const invalid = (key: keyof Settings) => ({ 'aria-invalid': !!errors[key], 'aria-describedby': errors[key] ? `error-${key}` : undefined });
  return <fieldset className="settings-fields" disabled={disabled}>
    {(image || raster) && <>
      <label>输出格式<select value={settings.format} onChange={e => set({ format: e.target.value as Settings['format'] })}><option value="png">PNG · 无损</option><option value="jpg">JPG · 更小体积</option>{image && <option value="webp">WebP</option>}</select></label>
      {settings.format !== 'png' && <label>图片质量 <span className="field-value">{Math.round(settings.quality * 100)}%</span><input {...invalid('quality')} aria-label="图片质量" type="range" min="0.1" max="1" step="0.05" value={settings.quality} onChange={e => set({ quality: Number(e.target.value) })} />{error('quality')}</label>}
    </>}
    {image && <>
      <div><span className="field-label">尺寸上限（像素）</span><div className="two-fields"><label><input {...invalid('width')} aria-label="最大宽度" type="number" min="0" max="16384" step="1" value={Number.isNaN(settings.width) ? '' : settings.width || ''} placeholder="原始宽度" onChange={e => set({ width: e.target.validity.badInput ? NaN : Number(e.target.value) })} /><span className="input-caption">宽度</span>{error('width')}</label><span>×</span><label><input {...invalid('height')} aria-label="最大高度" type="number" min="0" max="16384" step="1" value={Number.isNaN(settings.height) ? '' : settings.height || ''} placeholder="原始高度" onChange={e => set({ height: e.target.validity.badInput ? NaN : Number(e.target.value) })} /><span className="input-caption">高度</span>{error('height')}</label></div><p className="hint">保持比例缩小，不放大。留空或 0 保留原尺寸；上限为 16384 像素。</p></div>
      {settings.format !== 'jpg' && <label className="check-label"><input type="checkbox" checked={settings.transparent} onChange={e => set({ transparent: e.target.checked })} />保留透明背景</label>}
      {(settings.format === 'jpg' || !settings.transparent) && <label className="color-label">透明区域填充色<input aria-label="背景填充色" type="color" value={settings.background} onChange={e => set({ background: e.target.value })} /></label>}
      <p className="hint">JPG 不支持透明。动图仅转换第一帧；导出不保留原始 EXIF 元数据。</p>
    </>}
    {pdf && <>
      <label>纸张大小<select value={settings.paper} onChange={e => set({ paper: e.target.value as Settings['paper'] })}><option value="a4">A4 · 210 × 297 mm</option><option value="letter">Letter · 8.5 × 11 in</option><option value="fit">适应图片尺寸</option></select></label>
      {settings.paper !== 'fit' && <label>纸张方向<select value={settings.landscape ? 'landscape' : 'portrait'} onChange={e => set({ landscape: e.target.value === 'landscape' })}><option value="portrait">纵向</option><option value="landscape">横向</option></select></label>}
      <label>页边距（mm）<input {...invalid('margin')} type="number" min="0" max="50" step="any" value={Number.isNaN(settings.margin) ? '' : settings.margin} onChange={e => set({ margin: e.target.valueAsNumber })} />{error('margin')}</label>
      <p className="hint">每张图片一页，按列表顺序排列。透明区域填充为白色。</p>
    </>}
    {raster && <>
      <label>选择页码<input {...invalid('pages')} value={settings.pages} placeholder="全部页面，例如 1-3,5" onChange={e => set({ pages: e.target.value })} />{error('pages')}</label>
      <label>清晰度<select value={settings.dpi} onChange={e => set({ dpi: Number(e.target.value) })}><option value="72">标准 · 72 DPI</option><option value="144">清晰 · 144 DPI</option><option value="216">高清 · 216 DPI</option><option value="300">打印 · 300 DPI</option></select></label>
      <p className="hint">页码从 1 开始，每份文件分别应用。清晰度越高，内存与输出体积越大。</p>
    </>}
    {tool === 'pdf-organize' && <>
      <label>输出方式<select value={settings.split ? 'split' : 'merge'} onChange={e => set({ split: e.target.value === 'split' })}><option value="merge">合并选中页为一个 PDF</option><option value="split">每个选中页拆为单独 PDF</option></select></label>
      <p className="hint">勾选需要的页面，通过箭头排序和旋转。原文字和矢量内容保留。</p>
      <p className="hint">首版不保留书签、交互表单、批注、链接与数字签名；请保留原文件。</p>
    </>}
    {tool === 'docx-pdf' && <div className="docx-notes"><span className="local-tag">LibreOffice 本地排版</span><p>保留中文、内嵌图片、表格与基本分页，PDF 文字可选择。</p><p>首次使用按需加载约 266 MiB 引擎与中文字体，可能需要数分钟。建议使用桌面 Chrome / Edge。</p><p className="hint">使用 Noto 中文替代字体，特殊字体与复杂版式可能变化，请先预览。外部图片与链接不会加载。</p></div>}
  </fieldset>;
}
