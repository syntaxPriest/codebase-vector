import type { GraphEdge, GraphNode } from "@/lib/codebase/types";

interface LayoutParams {
  REPULSION: number;
  SPRING_K: number;
  REST: number;
  CENTER_K: number;
  DAMP: number;
  DT: number;
}

function paramsFor(nodes: GraphNode[]): LayoutParams {
  const N = nodes.length;
  const sizeScale = N < 20 ? 2.0 : 1.0;
  return {
    REPULSION: 140 * sizeScale,
    SPRING_K:  0.05,
    REST:      5.5 * Math.sqrt(sizeScale),
    CENTER_K:  0.006,
    DAMP:      0.82,
    DT:        0.12,
  };
}

export function forceLayoutStep(
  nodes: GraphNode[],
  edges: GraphEdge[],
  params?: LayoutParams,
): void {
  const N = nodes.length;
  if (N === 0) return;
  const p = params ?? paramsFor(nodes);
  const fx = new Float32Array(N);
  const fy = new Float32Array(N);
  const fz = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dz = nodes[i].z - nodes[j].z;
      const d2 = dx*dx + dy*dy + dz*dz + 0.01;
      const d  = Math.sqrt(d2);
      const f  = p.REPULSION / d2;
      const ux = dx/d, uy = dy/d, uz = dz/d;
      fx[i] += f*ux; fy[i] += f*uy; fz[i] += f*uz;
      fx[j] -= f*ux; fy[j] -= f*uy; fz[j] -= f*uz;
    }
  }

  for (const e of edges) {
    const a = nodes[e.source], b = nodes[e.target];
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const d  = Math.sqrt(dx*dx + dy*dy + dz*dz) + 0.01;
    const f  = p.SPRING_K * (d - p.REST);
    const ux = dx/d, uy = dy/d, uz = dz/d;
    fx[e.source] += f*ux; fy[e.source] += f*uy; fz[e.source] += f*uz;
    fx[e.target] -= f*ux; fy[e.target] -= f*uy; fz[e.target] -= f*uz;
  }

  for (let i = 0; i < N; i++) {
    fx[i] -= p.CENTER_K * nodes[i].x;
    fy[i] -= p.CENTER_K * nodes[i].y;
    fz[i] -= p.CENTER_K * nodes[i].z;
  }

  for (let i = 0; i < N; i++) {
    nodes[i].vx = (nodes[i].vx + fx[i]) * p.DAMP;
    nodes[i].vy = (nodes[i].vy + fy[i]) * p.DAMP;
    nodes[i].vz = (nodes[i].vz + fz[i]) * p.DAMP;
    nodes[i].x += nodes[i].vx * p.DT;
    nodes[i].y += nodes[i].vy * p.DT;
    nodes[i].z += nodes[i].vz * p.DT;
  }
}

export function runForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  iterations = 350,
): void {
  if (nodes.length === 0) return;
  const p = paramsFor(nodes);
  for (let i = 0; i < iterations; i++) forceLayoutStep(nodes, edges, p);
}

// How many iterations a graph of N nodes should converge in.
export function recommendedIterations(N: number): number {
  if (N <= 30)  return 350;
  if (N <= 100) return 280;
  if (N <= 300) return 220;
  return 180;
}
