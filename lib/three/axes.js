import * as THREE from "three";

export const AXIS_COLORS = [0xffe066, 0x4ecdc4, 0xff6bc7];

export function createAxes(mean, eigenvalues, eigenvectors) {
  const group = new THREE.Group();
  const verts = [], cols = [];

  for (let k = 0; k < 3; k++) {
    const len = 2 * Math.sqrt(Math.max(eigenvalues[k], 0));
    const v = eigenvectors[k];
    const p1 = [mean[0] - v[0]*len, mean[1] - v[1]*len, mean[2] - v[2]*len];
    const p2 = [mean[0] + v[0]*len, mean[1] + v[1]*len, mean[2] + v[2]*len];
    verts.push(...p1, ...p2);
    const c = new THREE.Color(AXIS_COLORS[k]);
    cols.push(c.r, c.g, c.b, c.r, c.g, c.b);
    [p1, p2].forEach((pp) => {
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 12, 12),
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
