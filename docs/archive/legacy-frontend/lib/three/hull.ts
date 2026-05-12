import * as THREE from "three";
import type { HullFace } from "@/lib/math/convexHull";
import type { GraphNode } from "@/lib/codebase/types";

const HULL_FILL = 0x0a0a0a;
const HULL_WIRE = 0x0a0a0a;

export interface HullBuild {
  group: THREE.Group;
  hullGeom: THREE.BufferGeometry | null;
  wireGeom: THREE.BufferGeometry | null;
}

export function createHull(nodes: GraphNode[], faces: HullFace[]): HullBuild {
  const group = new THREE.Group();
  if (faces.length === 0) return { group, hullGeom: null, wireGeom: null };

  const hullPositions = new Float32Array(faces.length * 9);
  faces.forEach((f, i) => {
    const a = nodes[f.v[0]], b = nodes[f.v[1]], c = nodes[f.v[2]];
    hullPositions.set([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z], i * 9);
  });

  const hullGeom = new THREE.BufferGeometry();
  hullGeom.setAttribute("position", new THREE.BufferAttribute(hullPositions, 3));
  hullGeom.computeVertexNormals();
  const fill = new THREE.Mesh(hullGeom, new THREE.MeshBasicMaterial({
    color: HULL_FILL, transparent: true, opacity: 0.04,
    side: THREE.DoubleSide, depthWrite: false,
  }));
  group.add(fill);

  const wireSet = new Set<string>();
  const wireVerts: number[] = [];
  for (const f of faces) {
    const [a, b, c] = f.v;
    for (const [x, y] of [[a, b], [b, c], [c, a]] as Array<[number, number]>) {
      const key = x < y ? `${x},${y}` : `${y},${x}`;
      if (wireSet.has(key)) continue;
      wireSet.add(key);
      const p1 = nodes[x], p2 = nodes[y];
      wireVerts.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
  }
  const wireGeom = new THREE.BufferGeometry();
  wireGeom.setAttribute("position", new THREE.Float32BufferAttribute(wireVerts, 3));
  const wire = new THREE.LineSegments(wireGeom, new THREE.LineBasicMaterial({
    color: HULL_WIRE, transparent: true, opacity: 0.18, depthWrite: false,
  }));
  group.add(wire);

  return { group, hullGeom, wireGeom };
}
