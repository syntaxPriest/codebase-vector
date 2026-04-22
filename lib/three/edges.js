import * as THREE from "three";

export function createEdges(nodes, edges, { isRoot }) {
  let maxW = 1;
  edges.forEach((e) => { if (e.weight > maxW) maxW = e.weight; });
  const SEG = 18;
  const totalFloats = edges.length * SEG * 2 * 3;
  const verts = new Float32Array(totalFloats);
  const cols = new Float32Array(totalFloats);

  edges.forEach((e, ei) => {
    const a = nodes[e.source], b = nodes[e.target];
    const mx = (a.x + b.x) * 0.5;
    const my = (a.y + b.y) * 0.5;
    const mz = (a.z + b.z) * 0.5;
    const len = Math.hypot(mx, my, mz) || 1;
    const dist = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    const bow = dist * 0.18;
    const cx = mx + (mx / len) * bow;
    const cy = my + (my / len) * bow;
    const cz = mz + (mz / len) * bow;

    const pts = new Float32Array((SEG + 1) * 3);
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      const omt = 1 - t;
      pts[i * 3    ] = omt*omt*a.x + 2*omt*t*cx + t*t*b.x;
      pts[i * 3 + 1] = omt*omt*a.y + 2*omt*t*cy + t*t*b.y;
      pts[i * 3 + 2] = omt*omt*a.z + 2*omt*t*cz + t*t*b.z;
    }

    const ca = new THREE.Color(a.color), cb = new THREE.Color(b.color);
    const intensity = isRoot ? 0.6 + (e.weight / maxW) * 0.6 : 0.85;

    for (let i = 0; i < SEG; i++) {
      const base = (ei * SEG + i) * 6;
      verts[base    ] = pts[i * 3    ];
      verts[base + 1] = pts[i * 3 + 1];
      verts[base + 2] = pts[i * 3 + 2];
      verts[base + 3] = pts[(i + 1) * 3    ];
      verts[base + 4] = pts[(i + 1) * 3 + 1];
      verts[base + 5] = pts[(i + 1) * 3 + 2];

      const t1 = i / SEG, t2 = (i + 1) / SEG;
      const mid1 = 1 - Math.abs(t1 - 0.5) * 0.6;
      const mid2 = 1 - Math.abs(t2 - 0.5) * 0.6;
      const i1 = intensity * mid1;
      const i2 = intensity * mid2;
      cols[base    ] = (ca.r * (1 - t1) + cb.r * t1) * i1;
      cols[base + 1] = (ca.g * (1 - t1) + cb.g * t1) * i1;
      cols[base + 2] = (ca.b * (1 - t1) + cb.b * t1) * i1;
      cols[base + 3] = (ca.r * (1 - t2) + cb.r * t2) * i2;
      cols[base + 4] = (ca.g * (1 - t2) + cb.g * t2) * i2;
      cols[base + 5] = (ca.b * (1 - t2) + cb.b * t2) * i2;
    }
  });

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(verts, 3));
  geom.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  const lines = new THREE.LineSegments(geom, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  return { lines, geom };
}
