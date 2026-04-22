import * as THREE from "three";
import { createLabelSprite, shortName } from "./labelSprite";

export function createLabelsGroup(nodes, baseSizes) {
  const group = new THREE.Group();
  const sprites = [];

  nodes.forEach((n, i) => {
    const txt = n.isFolder ? shortName(n.name) : n.name;
    const hex = "#" + n.color.toString(16).padStart(6, "0");
    const sprite = createLabelSprite(txt, { color: "#ffffff", accent: hex });
    const offsetY = baseSizes[i] + (n.isFolder ? 1.8 : 1.0);
    sprite.position.set(n.x, n.y + offsetY, n.z);
    if (n.isFolder) {
      sprite.scale.multiplyScalar(1.25);
      sprite.userData.baseScale = sprite.scale.clone();
    }
    group.add(sprite);
    sprites.push(sprite);
  });

  return { group, sprites };
}
