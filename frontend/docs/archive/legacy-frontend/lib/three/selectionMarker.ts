import * as THREE from "three";

const MARKER_COLOR = 0x0a0a0a;

export interface SelectionMarker {
  marker: THREE.Mesh;
  marker2: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  mat2: THREE.MeshBasicMaterial;
  geom: THREE.TorusGeometry;
  geom2: THREE.TorusGeometry;
}

export function createSelectionMarker(): SelectionMarker {
  const mat = new THREE.MeshBasicMaterial({
    color: MARKER_COLOR, transparent: true, opacity: 0.95,
    depthTest: false, depthWrite: false,
  });
  const mat2 = new THREE.MeshBasicMaterial({
    color: MARKER_COLOR, transparent: true, opacity: 0.32,
    depthTest: false, depthWrite: false,
  });
  const geom = new THREE.TorusGeometry(1, 0.045, 8, 56);
  const geom2 = new THREE.TorusGeometry(1.35, 0.02, 6, 64);
  const marker = new THREE.Mesh(geom, mat);
  const marker2 = new THREE.Mesh(geom2, mat2);
  marker.renderOrder = 999;
  marker2.renderOrder = 999;
  marker.visible = false;
  marker2.visible = false;
  return { marker, marker2, mat, mat2, geom, geom2 };
}
