// Hand-drawn stroke helpers using roughjs. Output is plain SVG <path> data
// so we can render inside React without touching a canvas. Seeds derive
// from a stable string (file path, edge id) so the wobble is deterministic
// across re-renders.
//
// Spec override: this file exists to make the map look comical / hand-drawn.
// See CLAUDE.md "Overrides ledger" for the §9 deviation.

import { RoughGenerator } from 'roughjs/bin/generator'
import type { Drawable, Op, Options, OpSet } from 'roughjs/bin/core'

const gen = new RoughGenerator()

export function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h) || 1
}

export interface SketchyStroke {
  d: string
  type: 'stroke' | 'fill'
  stroke?: string
  strokeWidth?: number
  fill?: string
  opacity?: number
}

function opsToPath(set: OpSet): string {
  let path = ''
  for (const op of set.ops as Op[]) {
    if (op.op === 'move') {
      path += `M${op.data[0]} ${op.data[1]} `
    } else if (op.op === 'lineTo') {
      path += `L${op.data[0]} ${op.data[1]} `
    } else if (op.op === 'bcurveTo') {
      path += `C${op.data[0]} ${op.data[1]} ${op.data[2]} ${op.data[3]} ${op.data[4]} ${op.data[5]} `
    }
  }
  return path.trim()
}

function drawableToStrokes(d: Drawable): SketchyStroke[] {
  const strokes: SketchyStroke[] = []
  const o = d.options
  for (const set of d.sets) {
    const path = opsToPath(set)
    if (!path) continue
    if (set.type === 'path') {
      strokes.push({
        d: path,
        type: 'stroke',
        stroke: o.stroke,
        strokeWidth: o.strokeWidth,
      })
    } else if (set.type === 'fillPath') {
      strokes.push({ d: path, type: 'fill', fill: o.fill })
    } else if (set.type === 'fillSketch') {
      strokes.push({
        d: path,
        type: 'stroke',
        stroke: o.fill,
        strokeWidth: o.fillWeight ?? 1,
      })
    }
  }
  return strokes
}

export function sketchyRect(
  seed: string | number,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: Options = {},
): SketchyStroke[] {
  const drawable = gen.rectangle(x, y, w, h, {
    seed: typeof seed === 'string' ? hashSeed(seed) : seed,
    roughness: 1.4,
    bowing: 1,
    strokeWidth: 1.5,
    ...opts,
  })
  return drawableToStrokes(drawable)
}

export function sketchyCurve(
  seed: string | number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  opts: Options = {},
): SketchyStroke[] {
  // Hand-drawn-ish vertical-biased curve between two points. We pass four
  // points through gen.curve so the result has a natural drop-and-rise
  // shape rather than a straight line.
  const dx = x2 - x1
  const dy = y2 - y1
  const c1: [number, number] = [x1 + dx * 0.25, y1 + dy * 0.65]
  const c2: [number, number] = [x1 + dx * 0.75, y1 + dy * 0.35]
  const drawable = gen.curve([[x1, y1], c1, c2, [x2, y2]], {
    seed: typeof seed === 'string' ? hashSeed(seed) : seed,
    roughness: 1.1,
    bowing: 1.4,
    strokeWidth: 1.3,
    ...opts,
  })
  return drawableToStrokes(drawable)
}

/** Stable, restrained tilt for a node, in degrees. */
export function nodeTilt(seed: string | number): number {
  const n = typeof seed === 'string' ? hashSeed(seed) : seed
  // -0.6° .. +0.6° — readable, not jokey.
  return ((n % 13) / 10 - 0.6)
}
