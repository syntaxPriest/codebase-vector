export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export type Vec3 = [number, number, number];
export type Matrix3 = [Vec3, Vec3, Vec3];

export interface Covariance {
  mean: Vec3;
  cov: Matrix3;
}

export interface Eigen3 {
  values: [number, number, number];
  vectors: [Vec3, Vec3, Vec3];
}

export function computeCovariance(pts: Point3[]): Covariance {
  const n = pts.length;
  if (n === 0) {
    return { mean: [0, 0, 0], cov: [[0,0,0],[0,0,0],[0,0,0]] };
  }
  let mx = 0, my = 0, mz = 0;
  for (const p of pts) { mx += p.x; my += p.y; mz += p.z; }
  mx /= n; my /= n; mz /= n;
  let cxx = 0, cyy = 0, czz = 0, cxy = 0, cxz = 0, cyz = 0;
  for (const p of pts) {
    const dx = p.x - mx, dy = p.y - my, dz = p.z - mz;
    cxx += dx*dx; cyy += dy*dy; czz += dz*dz;
    cxy += dx*dy; cxz += dx*dz; cyz += dy*dz;
  }
  const inv = 1 / Math.max(1, n - 1);
  return {
    mean: [mx, my, mz],
    cov: [
      [cxx*inv, cxy*inv, cxz*inv],
      [cxy*inv, cyy*inv, cyz*inv],
      [cxz*inv, cyz*inv, czz*inv],
    ],
  };
}

// Symmetric 3×3 eigendecomposition via Jacobi rotations.
export function eigen3x3(A: Matrix3): Eigen3 {
  const M: number[][] = A.map((r) => [...r]);
  const V: number[][] = [[1,0,0],[0,1,0],[0,0,1]];
  for (let iter = 0; iter < 50; iter++) {
    let p = 0, q = 1, max = Math.abs(M[0][1]);
    if (Math.abs(M[0][2]) > max) { p = 0; q = 2; max = Math.abs(M[0][2]); }
    if (Math.abs(M[1][2]) > max) { p = 1; q = 2; max = Math.abs(M[1][2]); }
    if (max < 1e-10) break;
    const theta = (M[q][q] - M[p][p]) / (2 * M[p][q]);
    const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(1 + theta*theta));
    const c = 1 / Math.sqrt(1 + t*t);
    const s = t * c;
    const Mpp = M[p][p], Mqq = M[q][q], Mpq = M[p][q];
    M[p][p] = c*c*Mpp - 2*s*c*Mpq + s*s*Mqq;
    M[q][q] = s*s*Mpp + 2*s*c*Mpq + c*c*Mqq;
    M[p][q] = 0; M[q][p] = 0;
    for (let i = 0; i < 3; i++) {
      if (i !== p && i !== q) {
        const Mip = M[i][p], Miq = M[i][q];
        M[i][p] = c*Mip - s*Miq; M[p][i] = M[i][p];
        M[i][q] = s*Mip + c*Miq; M[q][i] = M[i][q];
      }
    }
    for (let i = 0; i < 3; i++) {
      const Vip = V[i][p], Viq = V[i][q];
      V[i][p] = c*Vip - s*Viq;
      V[i][q] = s*Vip + c*Viq;
    }
  }
  const values: [number, number, number] = [M[0][0], M[1][1], M[2][2]];
  const vectors: [Vec3, Vec3, Vec3] = [
    [V[0][0], V[1][0], V[2][0]],
    [V[0][1], V[1][1], V[2][1]],
    [V[0][2], V[1][2], V[2][2]],
  ];
  const order = [0, 1, 2].sort((a, b) => values[b] - values[a]) as [number, number, number];
  return {
    values: [values[order[0]], values[order[1]], values[order[2]]],
    vectors: [vectors[order[0]], vectors[order[1]], vectors[order[2]]],
  };
}
