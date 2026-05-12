// Monochrome ramp.
// All colors are returned as numeric hex (0xRRGGBB) so the rest of the
// pipeline (three.js materials, SVG gradients via toHex) stays unchanged.
//
// On a white background, useful range is roughly #1a1a1a (very dark) →
// #c4c4c4 (light grey). Folders take the darker half; files take the
// lighter half so a folder always reads stronger than its children.

import type { Folder } from "./types";

const FOLDER_MIN = 0x1a;
const FOLDER_MAX = 0x66;
const FILE_MIN   = 0x6b;
const FILE_MAX   = 0xc4;

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function grey(value: number): number {
  const v = Math.round(value) & 0xff;
  return (v << 16) | (v << 8) | v;
}

export function getFolderColor(folderIdx: number, totalFolders: number): number {
  if (totalFolders <= 1) return grey((FOLDER_MIN + FOLDER_MAX) / 2);
  const t = clamp01(folderIdx / (totalFolders - 1));
  return grey(FOLDER_MIN + t * (FOLDER_MAX - FOLDER_MIN));
}

export function getFileColor(folder: Pick<Folder, "fileCount">, fileIdx: number): number {
  const count = folder.fileCount ?? 1;
  if (count <= 1) return grey((FILE_MIN + FILE_MAX) / 2);
  const t = clamp01(fileIdx / (count - 1));
  return grey(FILE_MIN + t * (FILE_MAX - FILE_MIN));
}

export function toHex(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}
