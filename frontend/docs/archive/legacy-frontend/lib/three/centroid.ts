import * as THREE from "three";
import type { Vec3 } from "@/lib/math/statistics";

export function createCentroid(mean: Vec3): THREE.Group {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x0a0a0a, toneMapped: false })
  );
  core.position.set(mean[0], mean[1], mean[2]);
  group.add(core);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.3, 1.42, 48),
    new THREE.MeshBasicMaterial({
      color: 0x0a0a0a, transparent: true, opacity: 0.45,
      side: THREE.DoubleSide, depthWrite: false,
    })
  );
  ring.position.set(mean[0], mean[1], mean[2]);
  ring.userData.isCentroidRing = true;
  group.add(ring);

  return group;
}
