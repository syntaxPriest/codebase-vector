import type { Edge as DataEdge, File } from '@/lib/api/types'
import { nodeSize, topLevelFolder } from './encoding'

// Folder-aware, layered layout. Never pure force-directed. (CLAUDE.md §9)
//   1. Group files by their top-level folder.
//   2. Within each group, layer files by import depth (top = entry points).
//   3. Place groups left-to-right.

export interface FilePosition {
  fileId: number
  parentFolder: string
  x: number // relative to parent folder
  y: number
  width: number
  height: number
}

export interface FolderPosition {
  folder: string
  x: number
  y: number
  width: number
  height: number
  fileCount: number
}

export interface LayoutResult {
  folders: FolderPosition[]
  files: FilePosition[]
}

const FOLDER_PAD_X = 24
const FOLDER_PAD_TOP = 44
const FOLDER_PAD_BOTTOM = 24
const FOLDER_GAP_X = 64
const ROW_GAP_X = 24
const ROW_GAP_Y = 28

export function computeLayout(files: File[], edges: DataEdge[]): LayoutResult {
  if (files.length === 0) return { folders: [], files: [] }

  // 1. Group by top-level folder.
  const groups = new Map<string, File[]>()
  for (const f of files) {
    const top = topLevelFolder(f.path)
    const arr = groups.get(top)
    if (arr) arr.push(f)
    else groups.set(top, [f])
  }

  // 2. Compute import-graph layers (across the whole repo, then apply per
  //    group). BFS from inDeg=0 nodes along import edges.
  const layer = computeLayers(files, edges)

  // 3. Place files within each folder.
  const folderLayouts: Array<{ folder: string; files: FilePosition[]; size: { width: number; height: number } }> = []

  // Stable ordering: alphabetical, but '/' (root) last so the meaty folders read first.
  const orderedGroups = [...groups.entries()].sort(([a], [b]) => {
    if (a === '/') return 1
    if (b === '/') return -1
    return a.localeCompare(b)
  })

  for (const [folder, folderFiles] of orderedGroups) {
    // Normalize layers within this folder so they start at 0 — keeps each
    // folder compact even if its "absolute" layers are deep.
    const localLayer = new Map<number, number>()
    const minL = Math.min(...folderFiles.map((f) => layer.get(f.id) ?? 0))
    for (const f of folderFiles) {
      localLayer.set(f.id, (layer.get(f.id) ?? 0) - minL)
    }

    const byLayer = new Map<number, File[]>()
    for (const f of folderFiles) {
      const l = localLayer.get(f.id) ?? 0
      const arr = byLayer.get(l)
      if (arr) arr.push(f)
      else byLayer.set(l, [f])
    }

    const sortedLayers = [...byLayer.keys()].sort((a, b) => a - b)
    const fileLayouts: FilePosition[] = []
    let y = FOLDER_PAD_TOP
    let widestRow = 0

    for (const l of sortedLayers) {
      const row = (byLayer.get(l) ?? []).slice().sort((a, b) => a.path.localeCompare(b.path))
      const rowHeights: number[] = []
      let x = FOLDER_PAD_X
      for (const f of row) {
        const { width, height } = nodeSize(f.loc)
        fileLayouts.push({
          fileId: f.id,
          parentFolder: folder,
          x,
          y,
          width,
          height,
        })
        rowHeights.push(height)
        x += width + ROW_GAP_X
      }
      const rowWidth = x - ROW_GAP_X + FOLDER_PAD_X
      widestRow = Math.max(widestRow, rowWidth)
      y += Math.max(...rowHeights, NODE_FALLBACK_H) + ROW_GAP_Y
    }

    const height = y - ROW_GAP_Y + FOLDER_PAD_BOTTOM
    folderLayouts.push({
      folder,
      files: fileLayouts,
      size: { width: Math.max(widestRow, 220), height },
    })
  }

  // 4. Place folders left-to-right.
  let xCursor = 0
  const folders: FolderPosition[] = []
  const filesOut: FilePosition[] = []
  for (const fl of folderLayouts) {
    folders.push({
      folder: fl.folder,
      x: xCursor,
      y: 0,
      width: fl.size.width,
      height: fl.size.height,
      fileCount: fl.files.length,
    })
    filesOut.push(...fl.files)
    xCursor += fl.size.width + FOLDER_GAP_X
  }

  return { folders, files: filesOut }
}

const NODE_FALLBACK_H = 48

function computeLayers(files: File[], edges: DataEdge[]): Map<number, number> {
  const adj = new Map<number, number[]>()
  const inDeg = new Map<number, number>()
  for (const f of files) {
    adj.set(f.id, [])
    inDeg.set(f.id, 0)
  }
  const fileIds = new Set(files.map((f) => f.id))
  for (const e of edges) {
    if (e.edge_kind !== 'import' || e.source_kind !== 'file' || e.target_kind !== 'file') continue
    if (!fileIds.has(e.source_id) || !fileIds.has(e.target_id)) continue
    adj.get(e.source_id)?.push(e.target_id)
    inDeg.set(e.target_id, (inDeg.get(e.target_id) ?? 0) + 1)
  }

  const layer = new Map<number, number>()
  const queue: number[] = []
  for (const [id, d] of inDeg) {
    if (d === 0) {
      layer.set(id, 0)
      queue.push(id)
    }
  }

  while (queue.length > 0) {
    const cur = queue.shift()
    if (cur === undefined) break
    const curL = layer.get(cur) ?? 0
    for (const next of adj.get(cur) ?? []) {
      const nextL = layer.get(next) ?? -1
      if (nextL < curL + 1) {
        layer.set(next, curL + 1)
        queue.push(next)
      }
    }
  }

  for (const f of files) if (!layer.has(f.id)) layer.set(f.id, 0)
  return layer
}
