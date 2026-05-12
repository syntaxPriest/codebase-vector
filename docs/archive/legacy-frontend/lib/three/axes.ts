import * as THREE from "three";
import type { Vec3 } from "@/lib/math/statistics";

export const AXIS_COLORS: [number, number, number] = [0x171717, 0x6b6b6b, 0xa3a3a3];

export interface AxesBuild {
  group: THREE.Group;
  geom: THREE.BufferGeometry;
}

export function createAxes(
  mean: Vec3,
  eigenvalues: readonly number[],
  eigenvectors: readonly Vec3[],
): AxesBuild {
  const group = new THREE.Group();
  const verts: number[] = [];
  const cols: number[] = [];

  for (let k = 0; k < 3; k++) {
    const len = 2 * Math.sqrt(Math.max(eigenvalues[k], 0));
    const v = eigenvectors[k];
    const p1: Vec3 = [mean[0] - v[0]*len, mean[1] - v[1]*len, mean[2] - v[2]*len];
    const p2: Vec3 = [mean[0] + v[0]*len, mean[1] + v[1]*len, mean[2] + v[2]*len];
    verts.push(...p1, ...p2);
    const c = new THREE.Color(AXIS_COLORS[k]);
    cols.push(c.r, c.g, c.b, c.r, c.g, c.b);
    [p1, p2].forEach((pp) => {
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 12, 12),
        new THREE.MeshBasicMaterial({ color: AXIS_COLORS[k], toneMapped: false })
      );
      tip.position.set(pp[0], pp[1], pp[2]);
      group.add(tip);
    });
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  const lines = new THREE.LineSegments(geom, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.95,
  }));
  group.add(lines);

  return { group, geom };
}
