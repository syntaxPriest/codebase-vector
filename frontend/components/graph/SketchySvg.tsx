'use client'

import type { SketchyStroke } from './sketchy'

export interface SketchySvgProps {
  width: number
  height: number
  strokes: SketchyStroke[]
  /** Padding around the wobble so the strokes don't get clipped at edges. */
  pad?: number
  className?: string
}

export function SketchySvg({ width, height, strokes, pad = 4, className }: SketchySvgProps) {
  return (
    <svg
      width={width + pad * 2}
      height={height + pad * 2}
      viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`}
      className={className}
      style={{ position: 'absolute', inset: -pad, pointerEvents: 'none' }}
    >
      {strokes.map((s, i) =>
        s.type === 'stroke' ? (
          <path
            key={i}
            d={s.d}
            fill="none"
            stroke={s.stroke ?? 'currentColor'}
            strokeWidth={s.strokeWidth ?? 1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={s.opacity ?? 1}
          />
        ) : (
          <path
            key={i}
            d={s.d}
            fill={s.fill ?? 'none'}
            stroke="none"
            opacity={s.opacity ?? 1}
          />
        ),
      )}
    </svg>
  )
}
