import * as THREE from "three";

export function shortName(name: string): string {
  return name.includes("/") ? (name.split("/").pop() as string) : name;
}

export interface LabelSprite extends THREE.Sprite {
  userData: {
    baseScale: THREE.Vector3;
    texture: THREE.CanvasTexture;
    material: THREE.SpriteMaterial;
    lodVisible?: boolean;
  };
}

export function createLabelSprite(
  text: string,
  { color = "#1a1a1a", accent = "#1a1a1a" }: { color?: string; accent?: string } = {},
): LabelSprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const fontSize = 56;
  ctx.font = `500 ${fontSize}px 'JetBrains Mono', ui-monospace, monospace`;

  const padX = 22, padY = 14;
  const textW = ctx.measureText(text).width;
  const boxW = Math.min(canvas.width - 4, textW + padX * 2);
  const boxH = fontSize + padY * 2;
  const x = (canvas.width - boxW) / 2;
  const y = (canvas.height - boxH) / 2;

  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.fillRect(x, y, boxW, boxH);

  ctx.strokeStyle = "rgba(10, 10, 10, 0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, boxW - 1, boxH - 1);

  ctx.fillStyle = accent;
  ctx.fillRect(x, y, boxW, 2);

  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 ${fontSize}px 'JetBrains Mono', ui-monospace, monospace`;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  const sprite = new THREE.Sprite(material) as LabelSprite;

  const aspect = canvas.width / canvas.height;
  const baseH = 1.6;
  sprite.scale.set(baseH * aspect, baseH, 1);
  sprite.userData = {
    baseScale: sprite.scale.clone(),
    texture,
    material,
  };
  return sprite;
}
