import { describe, expect, it } from 'vitest';
import { moveToPosition, settingsErrors } from '../../src/core/queue';
import { DEFAULT_SETTINGS } from '../../src/types';

describe('queue position and local parameter validation', () => {
  it('moves disjoint selections in queue order using the remaining queue positions', () => {
    const list = ['a', 'b', 'c', 'd', 'e'].map(id => ({ id, rotation: 90 }));
    expect(moveToPosition(list, new Set(['d', 'b']), 3).map(i => i.id)).toEqual(['a', 'c', 'b', 'd', 'e']);
    expect(moveToPosition(list, new Set(['a', 'c']), 4).map(i => i.id)).toEqual(['b', 'd', 'e', 'a', 'c']);
    expect(moveToPosition(list, new Set(['a']), 6)).toBe(list);
    expect(moveToPosition(list, new Set(list.map(i => i.id)), 1)).toEqual(list);
  });
  it('rejects invalid dimensions and syntax before converting; defers file-specific bounds', () => {
    for (const width of [-1, 0.5, 16385, NaN]) expect(settingsErrors('image-convert', { ...DEFAULT_SETTINGS, width }).width).toBeTruthy();
    for (const pages of ['0', '3-1', '1,', 'NaN', '1.5']) expect(settingsErrors('pdf-image', { ...DEFAULT_SETTINGS, pages }).pages).toBeTruthy();
    for (const pages of ['', '999', '3,1-2，3']) expect(settingsErrors('pdf-image', { ...DEFAULT_SETTINGS, pages })).toEqual({});
    expect(settingsErrors('image-pdf', { ...DEFAULT_SETTINGS, margin: NaN }).margin).toBeTruthy();
    expect(settingsErrors('image-pdf', { ...DEFAULT_SETTINGS, margin: 0.5 })).toEqual({});
  });
});
