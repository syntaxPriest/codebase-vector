'use client'

import { memo, useMemo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { folderLabel, folderTint } from './encoding'
import { sketchyRect } from './sketchy'
import { SketchySvg } from './SketchySvg'

export interface FolderGroupData extends Record<string, unknown> {
  folder: string
  fileCount: number
}

function FolderGroupBase({ data }: NodeProps) {
  const { folder, fileCount } = data as FolderGroupData
  const tint = folderTint(folder)

  // Sketchy "cloud" — a rounded rectangle with a pastel hachure fill +
  // a soft hand-drawn outline. We render at a fixed sample size and let
  // the surrounding 100%/100% sizing scale it via the viewBox.
  const { width, height, strokes } = useMemo(() => {
    const w = 360
    const h = 200
    return {
      width: w,
      height: h,
      strokes: sketchyRect(`folder:${folder}`, 0, 0, w, h, {
        stroke: 'var(--color-ink-4)',
        strokeWidth: 1.2,
        fill: tint,
        fillStyle: 'hachure',
        hachureGap: 12,
        hachureAngle: -41,
        fillWeight: 1.2,
        roughness: 1.8,
        bowing: 2.2,
      }),
    }
  }, [folder, tint])

  return (
    <div className="relative size-full">
      <SketchySvg
        width={width}
        height={height}
        strokes={strokes}
        pad={10}
        className="absolute inset-0 !w-full !h-full"
      />
      <div className="relative flex items-center gap-2 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-6)]">
        <span>{folderLabel(folder)}</span>
        <span className="border border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-0)] px-1.5 py-0.5 text-[10px] text-[color:var(--color-ink-5)]">
          {fileCount}
        </span>
      </div>
    </div>
  )
}

export const FolderGroup = memo(FolderGroupBase)
