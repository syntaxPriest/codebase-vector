import type { Point3, Vec3 } from "./statistics";

export interface HullFace {
  /** Indices into the input points array. */
  v: [number, number, number];
  /** Outward unit normal. */
  n: Vec3;
}

const EPS = 1e-6;

const sub   = (a: Point3, b: Point3): Vec3 => [a.x - b.x, a.y - b.y, a.z - b.z];
const cross = (a: Vec3,   b: Vec3):   Vec3 => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
const dot   = (a: Vec3,   b: Vec3):  number => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];

function norm(v: Vec3): Vec3 | null {
  const l = Math.hypot(v[0], v[1], v[2]);
  return l < EPS ? null : [v[0] / l, v[1] / l, v[2] / l];
}

export function convexHull3D(pts: Point3[]): HullFace[] {
  const n = pts.length;
  if (n < 4) return [];

  const ex = [0, 0, 0, 0, 0, 0];
  for (let i = 1; i < n; i++) {
    if (pts[i].x < pts[ex[0]].x) ex[0] = i;
    if (pts[i].x > pts[ex[1]].x) ex[1] = i;
    if (pts[i].y < pts[ex[2]].y) ex[2] = i;
    if (pts[i].y > pts[ex[3]].y) ex[3] = i;
    if (pts[i].z < pts[ex[4]].z) ex[4] = i;
    if (pts[i].z > pts[ex[5]].z) ex[5] = i;
  }

  let p0 = ex[0], p1 = ex[1], best = -1;
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
    const d = sub(pts[ex[i]], pts[ex[j]]);
    const sq = d[0]*d[0] + d[1]*d[1] + d[2]*d[2];
    if (sq > best) { best = sq; p0 = ex[i]; p1 = ex[j]; }
  }

  const line = sub(pts[p1], pts[p0]);
  const lSq = dot(line, line);
  if (lSq < EPS) return [];

  let p2 = -1, bestD = -1;
  for (let i = 0; i < n; i++) {
    if (i === p0 || i === p1) continue;
    const v = sub(pts[i], pts[p0]);
    const c = cross(v, line);
    const d = (c[0]*c[0] + c[1]*c[1] + c[2]*c[2]) / lSq;
    if (d > bestD) { bestD = d; p2 = i; }
  }
  if (p2 === -1) return [];

  const nTri = norm(cross(sub(pts[p1], pts[p0]), sub(pts[p2], pts[p0])));
  if (!nTri) return [];

  let p3 = -1; bestD = -1;
  for (let i = 0; i < n; i++) {
    if (i === p0 || i === p1 || i === p2) continue;
    const v = sub(pts[i], pts[p0]);
    const d = Math.abs(dot(nTri, v));
    if (d > bestD) { bestD = d; p3 = i; }
  }
  if (p3 === -1) return [];

  const cx = (pts[p0].x + pts[p1].x + pts[p2].x + pts[p3].x) / 4;
  const cy = (pts[p0].y + pts[p1].y + pts[p2].y + pts[p3].y) / 4;
  const cz = (pts[p0].z + pts[p1].z + pts[p2].z + pts[p3].z) / 4;

  const makeFace = (i1: number, i2: number, i3: number): HullFace | null => {
    const nrm = norm(cross(sub(pts[i2], pts[i1]), sub(pts[i3], pts[i1])));
    if (!nrm) return null;
    const toV: Vec3 = [pts[i1].x - cx, pts[i1].y - cy, pts[i1].z - cz];
    if (dot(nrm, toV) < 0) {
      return { v: [i1, i3, i2], n: [-nrm[0], -nrm[1], -nrm[2]] };
    }
    return { v: [i1, i2, i3], n: nrm };
  };

  let faces: HullFace[] = [
    makeFace(p0, p1, p2), makeFace(p0, p1, p3),
    makeFace(p0, p2, p3), makeFace(p1, p2, p3),
  ].filter((f): f is HullFace => f !== null);

  const above = (f: HullFace, i: number): boolean => {
    const a = pts[f.v[0]], p = pts[i];
    return f.n[0]*(p.x - a.x) + f.n[1]*(p.y - a.y) + f.n[2]*(p.z - a.z) > EPS;
  };

  const onHull = new Set([p0, p1, p2, p3]);
  for (let i = 0; i < n; i++) {
    if (onHull.has(i)) continue;
    const visible: number[] = [];
    for (let f = 0; f < faces.length; f++) {
      if (above(faces[f], i)) visible.push(f);
    }
    if (visible.length === 0) continue;

    const edgeMap = new Map<string, { count: number; pair: [number, number] }>();
    for (const fIdx of visible) {
      const [a, b, c] = faces[fIdx].v;
      for (const [x, y] of [[a, b], [b, c], [c, a]] as Array<[number, number]>) {
        const key = x < y ? `${x},${y}` : `${y},${x}`;
        if (!edgeMap.has(key)) edgeMap.set(key, { count: 0, pair: [x, y] });
        edgeMap.get(key)!.count++;
      }
    }
    const horizon: Array<[number, number]> = [];
    for (const e of edgeMap.values()) if (e.count === 1) horizon.push(e.pair);

    const vSet = new Set(visible);
    faces = faces.filter((_, idx) => !vSet.has(idx));
    for (const [a, b] of horizon) {
      const f = makeFace(a, b, i);
      if (f) faces.push(f);
    }
    onHull.add(i);
  }
  return faces;
}

export function hullVolume(faces: HullFace[], pts: Point3[], center: Vec3): number {
  let v = 0;
  for (const f of faces) {
    const a = pts[f.v[0]], b = pts[f.v[1]], c = pts[f.v[2]];
    const ax = a.x - center[0], ay = a.y - center[1], az = a.z - center[2];
    const bx = b.x - center[0], by = b.y - center[1], bz = b.z - center[2];
    const cx = c.x - center[0], cy = c.y - center[1], cz = c.z - center[2];
    v += ax*(by*cz - bz*cy) - ay*(bx*cz - bz*cx) + az*(bx*cy - by*cx);
  }
  return Math.abs(v) / 6;
}
