import * as THREE from "three";

export function createHull(nodes, faces) {
  const group = new THREE.Group();
  if (faces.length === 0) return { group, hullGeom: null, wireGeom: null };

  const hullPositions = new Float32Array(faces.length * 9);
  faces.forEach((f, i) => {
    const a = nodes[f.v[0]], b = nodes[f.v[1]], c = nodes[f.v[2]];
    hullPositions.set([a.x,a.y,a.z, b.x,b.y,b.z, c.x,c.y,c.z], i * 9);
  });

  const hullGeom = new THREE.BufferGeometry();
  hullGeom.setAttribute("position", new THREE.BufferAttribute(hullPositions, 3));
  hullGeom.computeVertexNormals();
  const fill = new THREE.Mesh(hullGeom, new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.025,
    side: THREE.DoubleSide, depthWrite: false,
  }));
  group.add(fill);

  const wireSet = new Set();
  const wireVerts = [];
  for (const f of faces) {
    const [a, b, c] = f.v;
    for (const [x, y] of [[a,b],[b,c],[c,a]]) {
      const key = x < y ? `${x},${y}` : `${y},${x}`;
      if (wireSet.has(key)) continue;
      wireSet.add(key);
      const p1 = nodes[x], p2 = nodes[y];
      wireVerts.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
  }
  const wireGeom = new THREE.BufferGeometry();
  wireGeom.setAttribute("position", new THREE.Float32BufferAttribute(wireVerts, 3));
  const wire = new THREE.LineSegments(wireGeom, new THREE.LineBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false,
  }));
  group.add(wire);

  return { group, hullGeom, wireGeom };
}
