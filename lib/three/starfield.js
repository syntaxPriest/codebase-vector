import * as THREE from "three";

export function createStarfield(count = 2500) {
  const verts = new Float32Array(count * 3);
  const cols = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random(), v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = 140 + Math.random() * 90;
    verts[i*3    ] = r * Math.sin(phi) * Math.cos(theta);
    verts[i*3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    verts[i*3 + 2] = r * Math.cos(phi);
    const brightness = 0.15 + Math.random() * 0.85;
    const isWarm = Math.random() < 0.12;
    const hue = isWarm ? 0.02 + Math.random() * 0.08 : 0.55 + (Math.random() - 0.5) * 0.18;
    const sat = isWarm ? 0.5 : 0.35;
    const c = new THREE.Color().setHSL(hue, sat, brightness * 0.6);
    cols[i*3    ] = c.r;
    cols[i*3 + 1] = c.g;
    cols[i*3 + 2] = c.b;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(verts, 3));
  geom.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  const mat = new THREE.PointsMaterial({
    vertexColors: true, size: 0.9, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  return { points: new THREE.Points(geom, mat), geom, mat };
}
