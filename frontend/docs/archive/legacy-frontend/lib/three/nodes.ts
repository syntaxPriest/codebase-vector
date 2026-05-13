import * as THREE from "three";
import type { GraphNode } from "@/lib/codebase/types";

export interface NodesBuild {
  instanced: THREE.InstancedMesh;
  geom: THREE.SphereGeometry;
  mat: THREE.MeshBasicMaterial;
  baseSizes: Float32Array;
}

export function createNodes(nodes: GraphNode[]): NodesBuild {
  const geom = new THREE.SphereGeometry(0.5, 20, 20);
  const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const instanced = new THREE.InstancedMesh(geom, mat, Math.max(1, nodes.length));
  instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const baseSizes = new Float32Array(nodes.length);

  nodes.forEach((n, i) => {
    const s = n.isFolder
      ? 1.2 + Math.log(1 + (n.fileCount ?? 0)) * 0.55
      : 0.45 + Math.log(1 + n.degree) * 0.32;
    baseSizes[i] = s;
    dummy.position.set(n.x, n.y, n.z);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);
    col.setHex(n.color);
    instanced.setColorAt(i, col);
  });

  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;

  return { instanced, geom, mat, baseSizes };
}
