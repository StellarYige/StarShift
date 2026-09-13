import type { PageItem, Settings } from '../types';

// This shared protocol has no runtime imports or Worker initialization.
export type WorkerJob =
  | { type: 'image'; file: Blob; settings: Settings; rotation: number }
  | { type: 'image-pdf'; images: { file: Blob; rotation: number }[]; settings: Settings }
  | { type: 'image-pdf-stream'; count: number; settings: Settings }
  | { type: 'organize'; sources: { id: string; bytes: Uint8Array }[]; pages: PageItem[]; split: boolean }
  | { type: 'zip'; outputs: { name: string; blob: Blob }[] };
export interface WorkerResult { blob: Blob; name?: string }
export type ImageChunk = { type: 'image-pdf-chunk'; index: number; image: { blob: Blob; width: number; height: number } };
