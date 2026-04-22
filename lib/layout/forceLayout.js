export function runForceLayout(nodes, edges, iterations = 350) {
  const N = nodes.length;
  if (N === 0) return;
  const sizeScale = N < 20 ? 2.0 : 1.0;
  const REPULSION = 140 * sizeScale;
  const SPRING_K = 0.05;
  const REST = 5.5 * Math.sqrt(sizeScale);
  const CENTER_K = 0.006;
  const DAMP = 0.82, DT = 0.12;

  for (let it = 0; it < iterations; it++) {
    const fx = new Float32Array(N), fy = new Float32Array(N), fz = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dz = nodes[i].z - nodes[j].z;
        const d2 = dx*dx + dy*dy + dz*dz + 0.01, d = Math.sqrt(d2), f = REPULSION / d2;
        const ux = dx/d, uy = dy/d, uz = dz/d;
        fx[i] += f*ux; fy[i] += f*uy; fz[i] += f*uz;
        fx[j] -= f*ux; fy[j] -= f*uy; fz[j] -= f*uz;
      }
    }
    for (const e of edges) {
      const a = nodes[e.source], b = nodes[e.target];
      const dx = b.x-a.x, dy = b.y-a.y, dz = b.z-a.z;
      const d = Math.sqrt(dx*dx + dy*dy + dz*dz) + 0.01;
      const f = SPRING_K * (d - REST);
      const ux = dx/d, uy = dy/d, uz = dz/d;
      fx[e.source] += f*ux; fy[e.source] += f*uy; fz[e.source] += f*uz;
      fx[e.target] -= f*ux; fy[e.target] -= f*uy; fz[e.target] -= f*uz;
    }
    for (let i = 0; i < N; i++) {
      fx[i] -= CENTER_K * nodes[i].x;
      fy[i] -= CENTER_K * nodes[i].y;
      fz[i] -= CENTER_K * nodes[i].z;
    }
    for (let i = 0; i < N; i++) {
      nodes[i].vx = (nodes[i].vx + fx[i]) * DAMP;
      nodes[i].vy = (nodes[i].vy + fy[i]) * DAMP;
      nodes[i].vz = (nodes[i].vz + fz[i]) * DAMP;
      nodes[i].x += nodes[i].vx * DT;
      nodes[i].y += nodes[i].vy * DT;
      nodes[i].z += nodes[i].vz * DT;
    }
  }
}
