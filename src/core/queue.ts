import type { Settings, ToolId } from '../types';

// Position is one-based, after removing the moving entries. Their relative
// order always comes from the current queue, never the range input order.
export function moveToPosition<T extends { id: string }>(queue: T[], ids: Set<string>, position: number): T[] {
  const moving = queue.filter(item => ids.has(item.id));
  const rest = queue.filter(item => !ids.has(item.id));
  if (!moving.length || !Number.isInteger(position) || position < 1 || position > rest.length + 1) return queue;
  return [...rest.slice(0, position - 1), ...moving, ...rest.slice(position - 1)];
}

export function rangeSyntaxError(value: string): string | undefined {
  if (!value.trim()) return;
  for (const part of value.replaceAll('，', ',').split(',')) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) return '页码格式有误，请输入如 1-3,5,8。';
    const start = Number(match[1]), end = Number(match[2] || match[1]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start) return '页码须为从 1 开始的整数，范围起点不能大于终点。';
  }
}

export function settingsErrors(tool: ToolId, settings: Settings): Partial<Record<keyof Settings, string>> {
  const errors: Partial<Record<keyof Settings, string>> = {};
  if (tool === 'image-convert') {
    for (const key of ['width', 'height'] as const) {
      if (!Number.isInteger(settings[key]) || settings[key] < 0 || settings[key] > 16384) errors[key] = '请输入 0–16384 的整数；留空或 0 保留原尺寸。';
    }
  }
  if ((tool === 'image-convert' || tool === 'pdf-image') && settings.format !== 'png' && (!Number.isFinite(settings.quality) || settings.quality < 0.1 || settings.quality > 1)) errors.quality = '质量须在 10%–100% 之间。';
  if (tool === 'image-pdf' && (!Number.isFinite(settings.margin) || settings.margin < 0 || settings.margin > 50)) errors.margin = '页边距须在 0–50 mm 之间。';
  if (tool === 'pdf-image') {
    const error = rangeSyntaxError(settings.pages);
    if (error) errors.pages = error;
    if (![72, 144, 216, 300].includes(settings.dpi)) errors.dpi = '请选择受支持的清晰度。';
  }
  return errors;
}
