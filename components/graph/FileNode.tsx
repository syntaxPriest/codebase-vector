'use client'

import { memo, useMemo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { hotspotBorder, languageColor, shortName } from './encoding'
import { sketchyRect, nodeTilt } from './sketchy'
import { SketchySvg } from './SketchySvg'
import type { File, FileHistory } from '@/lib/api/types'
import { cn } from '@/lib/utils'

export interface FileNodeData extends Record<string, unknown> {
  file: File
  history: FileHistory | undefined
  isFocused: boolean
  isSelected: boolean
  citationIndex: number | null
}

function FileNodeBase({ data }: NodeProps) {
  const { file, history, isFocused, isSelected, citationIndex } = data as FileNodeData
  const border = hotspotBorder(history)
  const color = languageColor(file.language)

  const stroke = isFocused
    ? 'var(--color-ink-8)'
    : isSelected
      ? 'var(--color-ink-8)'
      : border.color
  const strokeWidth = isFocused || isSelected
    ? Math.max(border.width, 2.4)
    : Math.max(border.width, 1.4)

  // Compute the sketchy rectangle every render — cheap (a single roughjs
  // call) and we want it stable per file (seeded on path).
  const { width, height, strokes, tilt } = useMemo(() => {
    // React Flow sets the node size via the wrapper; we re-render the
    // sketchy outline at the same dimensions, less a 2px padding so the
    // wobble shows.
    return computeSketchy(file.path, stroke, strokeWidth)
  }, [file.path, stroke, strokeWidth])

  return (
    <div
      className={cn('group relative bg-[color:var(--color-ink-0)]')}
      style={{
        width: '100%',
        height: '100%',
        transform: `rotate(${tilt}deg)`,
        transformOrigin: 'center center',
      }}
    >
      <SketchySvg
        width={width}
        height={height}
        strokes={strokes}
        pad={6}
      />

      <Handle type="target" position={Position.Top} className="!h-1 !w-1 !border-0 !bg-transparent" />

      <div className="relative flex h-full flex-col justify-between px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block size-2 rounded-full"
            style={{ background: color }}
          />
          <span className="truncate font-mono text-[12px] font-medium leading-tight text-[color:var(--color-ink-8)]">
            {shortName(file.path)}
          </span>
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-[color:var(--color-ink-5)]">
          <span>{file.loc} loc</span>
          {history && history.commits_30d > 0 ? (
            <span title="commits in last 30d">{history.commits_30d}△ 30d</span>
          ) : null}
        </div>
      </div>

      {citationIndex !== null ? (
        <span
          aria-label={`Citation ${citationIndex}`}
          className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-[color:var(--color-ink-8)] text-[10px] font-semibold text-white"
        >
          {citationIndex}
        </span>
      ) : null}

      <Handle type="source" position={Position.Bottom} className="!h-1 !w-1 !border-0 !bg-transparent" />
    </div>
  )
}

function computeSketchy(seed: string, stroke: string, strokeWidth: number) {
  // We use the React Flow node's measured size via 100%, but the SVG
  // needs concrete pixel dimensions. Sample a typical box size that the
  // layout produces (the wobble is identical at any near-size since we
  // render at 100% with viewBox stretch); 200x60 reads well.
  const width = 200
  const height = 60
  const strokes = sketchyRect(seed, 0, 0, width, height, {
    stroke,
    strokeWidth,
    roughness: 1.6,
    bowing: 1.4,
    fill: 'var(--color-ink-0)',
    fillStyle: 'solid',
  })
  return { width, height, strokes, tilt: nodeTilt(seed) }
}

export const FileNode = memo(FileNodeBase)
