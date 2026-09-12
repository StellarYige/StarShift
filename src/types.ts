export type ToolId = 'docx-pdf' | 'image-pdf' | 'pdf-image' | 'pdf-organize' | 'image-convert';
export type ImageFormat = 'png' | 'jpg' | 'webp';
export type TaskStatus = 'ready' | 'working' | 'done' | 'error' | 'cancelled';
export interface InputItem {
  id: string;
  file: File;
  rotation: number;
  status: TaskStatus;
  message?: string;
  thumbnail?: string;
}
export interface PageItem {
  id: string;
  sourceId: string;
  sourceName: string;
  page: number;
  rotation: number;
  selected: boolean;
  thumbnail: string;
}
export interface OutputItem {
  id: string;
  name: string;
  blob: Blob;
  url: string;
}
export interface Settings {
  format: ImageFormat;
  quality: number;
  width: number;
  height: number;
  background: string;
  transparent: boolean;
  paper: 'a4' | 'letter' | 'fit';
  landscape: boolean;
  margin: number;
  pages: string;
  dpi: number;
  split: boolean;
}
export type ProgressPhase = 'document-check' | 'resource-load' | 'initialize' | 'import' | 'export';
export interface ProgressDetail {
  phase: ProgressPhase;
  resource?: 'font' | 'engine';
  loadedBytes?: number;
  totalBytes?: number;
  byteKind?: 'decoded';
}
// The first three arguments retain the existing file/page progress semantics.
export type Progress = (message: string, completed?: number, total?: number, detail?: ProgressDetail) => void;
export const DEFAULT_SETTINGS: Settings = {
  format: 'png', quality: 0.9, width: 0, height: 0,
  background: '#ffffff', transparent: true,
  paper: 'a4', landscape: false, margin: 12,
  pages: '', dpi: 144, split: false,
};
