import * as THREE from "three";

export function createCentroid(mean) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
  );
  core.position.set(mean[0], mean[1], mean[2]);
  group.add(core);

  [
    { s: 1.4, o: 0.45 },
    { s: 2.8, o: 0.18 },
    { s: 5.0, o: 0.07 },
  ].forEach(({ s, o }) => {
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(s, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: o,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      })
    );
    halo.position.set(mean[0], mean[1], mean[2]);
    group.add(halo);
  });

  return group;
}
