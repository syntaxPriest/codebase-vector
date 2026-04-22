import * as THREE from "three";

export function createNodes(nodes) {
  const geom = new THREE.SphereGeometry(0.5, 20, 20);
  const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const instanced = new THREE.InstancedMesh(geom, mat, Math.max(1, nodes.length));
  instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const baseSizes = new Float32Array(nodes.length);

  nodes.forEach((n, i) => {
    const s = n.isFolder
      ? 1.2 + Math.log(1 + n.fileCount) * 0.55
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

export function createHaloLayers(nodes, nodeGeom, baseSizes) {
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  const make = (scaleMul, opacity) => {
    const mat = new THREE.MeshBasicMaterial({
      transparent: true, opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false,
    });
    const mesh = new THREE.InstancedMesh(nodeGeom, mat, Math.max(1, nodes.length));
    nodes.forEach((n, i) => {
      dummy.position.set(n.x, n.y, n.z);
      dummy.scale.setScalar(baseSizes[i] * scaleMul);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      col.setHex(n.color);
      mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return { mesh, mat };
  };

  return {
    inner: make(2.2, 0.35),
    mid:   make(4.0, 0.14),
    outer: make(7.5, 0.05),
  };
}
