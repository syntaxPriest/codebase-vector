'use client'

import { memo, useMemo } from 'react'
import { BaseEdge, type EdgeProps } from '@xyflow/react'
import { sketchyCurve } from './sketchy'

export interface RoughEdgeData extends Record<string, unknown> {
  highlighted?: boolean
  dimmed?: boolean
  weight?: number
}

function RoughEdgeBase({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  markerEnd,
}: EdgeProps) {
  const d = (data as RoughEdgeData | undefined) ?? {}
  const stroke = d.highlighted ? 'var(--color-ink-8)' : 'var(--color-ink-5)'
  const baseWidth = Math.max(1, d.weight ?? 1)
  const strokeWidth = d.highlighted ? baseWidth + 0.8 : baseWidth

  const strokes = useMemo(
    () =>
      sketchyCurve(id, sourceX, sourceY, targetX, targetY, {
        stroke,
        strokeWidth,
        roughness: 1.1,
      }),
    [id, sourceX, sourceY, targetX, targetY, stroke, strokeWidth],
  )

  return (
    <g style={{ opacity: d.dimmed ? 0.18 : 0.9 }}>
      {strokes.map((s, i) => (
        <BaseEdge
          key={i}
          path={s.d}
          markerEnd={i === strokes.length - 1 ? markerEnd : undefined}
          style={{
            stroke: s.stroke,
            strokeWidth: s.strokeWidth,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            fill: 'none',
          }}
        />
      ))}
    </g>
  )
}

export const RoughEdge = memo(RoughEdgeBase)
