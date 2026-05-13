"use client";

import { useEffect, type RefObject, type MutableRefObject } from "react";
import * as THREE from "three";
import { computeCovariance, eigen3x3 } from "@/lib/math/statistics";
import { convexHull3D, hullVolume } from "@/lib/math/convexHull";
import { createNodes } from "@/lib/three/nodes";
import { createLabelsGroup } from "@/lib/three/labelsGroup";
import { createEdges } from "@/lib/three/edges";
import { createHull } from "@/lib/three/hull";
import { createCentroid } from "@/lib/three/centroid";
import { createAxes } from "@/lib/three/axes";
import { createSelectionMarker } from "@/lib/three/selectionMarker";
import type {
  Graph,
  HoveredItem,
  Selection,
  Stats,
} from "@/lib/codebase/types";

export interface SceneRefs {
  hullGroup?: THREE.Group | null;
  axesGroup?: THREE.Group | null;
  centroidGroup?: THREE.Group | null;
  edgeLines?: THREE.LineSegments;
  labelsGroup?: THREE.Group;
  labelSprites?: THREE.Sprite[];
}

export interface UseVisualizerArgs {
  mountRef: RefObject<HTMLDivElement | null>;
  tooltipRef: RefObject<HTMLDivElement | null>;
  graph: Graph | null;
  viewRef: MutableRefObject<string>;
  selectedRef: MutableRefObject<Selection | null>;
  pausedRef: MutableRefObject<boolean>;
  sceneRef: MutableRefObject<SceneRefs>;
  setHovered: (h: HoveredItem | null) => void;
  setSelected: (s: Selection | null) => void;
  setStats: (s: Stats) => void;
}

export function useVisualizer({
  mountRef,
  tooltipRef,
  graph,
  viewRef,
  selectedRef,
  pausedRef,
  sceneRef,
  setHovered,
  setSelected,
  setStats,
}: UseVisualizerArgs): void {
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !graph) return;
    const { nodes, edges } = graph;

    // The canvas-rendered label sprites need JetBrains Mono available
    // synchronously; next/font registers a hashed family name that
    // canvas can't resolve. The Google Fonts stylesheet keeps the
    // canonical name working for canvas labels.
    const fontLink = document.createElement("link");
    fontLink.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);

    const width = mount.clientWidth, height = mount.clientHeight;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffffff, 0.012);
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 500);
    // WebGL can fail to initialise (driver glitch, blocked context,
    // headless browsers without GL). The renderer constructor throws
    // synchronously in that case; if we let it propagate it tears
    // down the entire workspace tree even when the user is in a
    // non-3D view (readme / tree / matrix / treemap). Catch and bail.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch (err) {
      console.warn("[codebase-vector] WebGL unavailable, skipping 3D scene:", err);
      document.head.removeChild(fontLink);
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xffffff, 1);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.animation = "canvasFadeIn 600ms ease-out";

    const { mean, cov } = computeCovariance(nodes);
    const { values: eigenvalues, vectors: eigenvectors } = eigen3x3(cov);
    const faces = convexHull3D(nodes);
    const volume = hullVolume(faces, nodes, mean);

    const { instanced, geom: nodeGeom, mat: nodeMat, baseSizes } = createNodes(nodes);
    scene.add(instanced);

    const { group: labelsGroup, sprites: labelSprites } = createLabelsGroup(nodes, baseSizes);
    scene.add(labelsGroup);

    // Label LOD — on big graphs hide low-degree leaf labels by default.
    // They reappear on hover via the lodVisible flag below.
    const LOD_THRESHOLD = 200;
    if (nodes.length > LOD_THRESHOLD) {
      labelSprites.forEach((sprite, i) => {
        const n = nodes[i];
        const lodVisible = n.isFolder || n.degree >= 3;
        sprite.userData.lodVisible = lodVisible;
        sprite.visible = lodVisible;
      });
    } else {
      labelSprites.forEach((sprite) => {
        sprite.userData.lodVisible = true;
      });
    }

    const { lines: edgeLines, geom: edgeGeom } = createEdges(nodes, edges, {
      isRoot: viewRef.current === "root",
    });
    if (edges.length > 0) scene.add(edgeLines);

    const { group: hullGroup, hullGeom, wireGeom } = createHull(nodes, faces);
    if (faces.length > 0) scene.add(hullGroup);

    const centroidGroup = nodes.length > 0 ? createCentroid(mean) : null;
    if (centroidGroup) scene.add(centroidGroup);

    let axesGroup: THREE.Group | null = null;
    let axisGeom: THREE.BufferGeometry | null = null;
    if (nodes.length > 1) {
      const built = createAxes(mean, eigenvalues, eigenvectors);
      axesGroup = built.group;
      axisGeom = built.geom;
      scene.add(axesGroup);
    }

    sceneRef.current = { hullGroup, axesGroup, centroidGroup, edgeLines, labelsGroup, labelSprites };

    const marker = createSelectionMarker();
    scene.add(marker.marker);
    scene.add(marker.marker2);

    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2(-10, -10);
    let lastClientX = 0, lastClientY = 0, hoverId = -1;
    let theta = Math.PI / 4, phi = Math.PI / 2.5;
    let radius = nodes.length < 20 ? 55 : 65;
    let isDragging = false, px = 0, py = 0, autoRotate = true;
    let downX = 0, downY = 0;

    const updateCamera = () => {
      camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    const onDown = (e: MouseEvent) => {
      isDragging = true; autoRotate = false;
      px = e.clientX; py = e.clientY;
      downX = e.clientX; downY = e.clientY;
    };
    const onUp = (e: MouseEvent) => {
      isDragging = false;
      const dx = e.clientX - downX, dy = e.clientY - downY;
      if (Math.hypot(dx, dy) < 5) {
        raycaster.setFromCamera(mouseNDC, camera);
        const hits = raycaster.intersectObject(instanced);
        if (hits.length > 0 && hits[0].instanceId !== undefined) {
          const n = nodes[hits[0].instanceId];
          setSelected({ kind: n.isFolder ? "folder" : "file", id: n.id });
        } else {
          setSelected(null);
        }
      }
    };
    const onMove = (e: MouseEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      lastClientX = e.clientX; lastClientY = e.clientY;
      if (!isDragging) return;
      theta -= (e.clientX - px) * 0.005;
      phi = Math.max(0.12, Math.min(Math.PI - 0.12, phi - (e.clientY - py) * 0.005));
      px = e.clientX; py = e.clientY;
      updateCamera();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      radius = Math.max(20, Math.min(160, radius + e.deltaY * 0.06));
      updateCamera();
    };

    renderer.domElement.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    let rafId: number;
    const tmpMat = new THREE.Matrix4();
    const tmpPos = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const tmpScale = new THREE.Vector3();

    const animate = () => {
      if (pausedRef && pausedRef.current) {
        rafId = requestAnimationFrame(animate);
        return;
      }
      if (autoRotate && !isDragging) { theta += 0.0012; updateCamera(); }

      const sel = selectedRef.current;
      let selIdx = -1;
      if (sel) {
        const isFolderKind = sel.kind === "folder";
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === sel.id && nodes[i].isFolder === isFolderKind) {
            selIdx = i;
            break;
          }
        }
      }
      if (selIdx >= 0) {
        const n = nodes[selIdx];
        const s = baseSizes[selIdx] * 2.0;
        const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.08;
        const now = Date.now() * 0.001;
        marker.marker.visible = true;
        marker.marker2.visible = true;
        marker.marker.position.set(n.x, n.y, n.z);
        marker.marker2.position.set(n.x, n.y, n.z);
        marker.marker.scale.setScalar(s * pulse);
        marker.marker2.scale.setScalar(s * pulse * 1.1);
        marker.marker.lookAt(camera.position);
        marker.marker2.lookAt(camera.position);
        marker.marker.rotateZ(now * 0.5);
        marker.marker2.rotateZ(-now * 0.3);
      } else {
        marker.marker.visible = false;
        marker.marker2.visible = false;
      }

      raycaster.setFromCamera(mouseNDC, camera);
      const hits = raycaster.intersectObject(instanced);
      const newId = hits.length > 0 && hits[0].instanceId !== undefined ? hits[0].instanceId : -1;
      if (newId !== hoverId) {
        if (hoverId >= 0 && hoverId < nodes.length) {
          instanced.getMatrixAt(hoverId, tmpMat);
          tmpMat.decompose(tmpPos, tmpQuat, tmpScale);
          tmpScale.setScalar(baseSizes[hoverId]);
          tmpMat.compose(tmpPos, tmpQuat, tmpScale);
          instanced.setMatrixAt(hoverId, tmpMat);
          const prev = labelSprites[hoverId];
          if (prev) {
            prev.scale.copy(prev.userData.baseScale);
            prev.visible = prev.userData.lodVisible !== false;
          }
        }
        if (newId >= 0 && newId < nodes.length) {
          instanced.getMatrixAt(newId, tmpMat);
          tmpMat.decompose(tmpPos, tmpQuat, tmpScale);
          tmpScale.setScalar(baseSizes[newId] * 1.6);
          tmpMat.compose(tmpPos, tmpQuat, tmpScale);
          instanced.setMatrixAt(newId, tmpMat);
          const cur = labelSprites[newId];
          if (cur) {
            cur.visible = true;
            cur.scale.copy(cur.userData.baseScale).multiplyScalar(1.3);
          }
          const n = nodes[newId];
          setHovered({
            name: n.name,
            folderName: n.folderName,
            color: n.color,
            isFolder: n.isFolder,
            fileCount: n.fileCount,
            weightSum: n.weightSum,
            degree: n.degree,
            x: lastClientX,
            y: lastClientY,
          });
          renderer.domElement.style.cursor = nodes[newId].isFolder ? "pointer" : "default";
        } else {
          setHovered(null);
          renderer.domElement.style.cursor = "grab";
        }
        instanced.instanceMatrix.needsUpdate = true;
        hoverId = newId;
      } else if (newId >= 0 && tooltipRef.current) {
        tooltipRef.current.style.left = lastClientX + 14 + "px";
        tooltipRef.current.style.top = lastClientY + 14 + "px";
      }
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    const totalDeg = nodes.reduce((s, n) => s + n.degree, 0);
    setStats({
      nodes: nodes.length,
      edges: edges.length,
      avgDeg: nodes.length ? (totalDeg / nodes.length).toFixed(2) : "0.00",
      faces: faces.length,
      volume: Math.round(volume),
      cov,
      eigen: [...eigenvalues],
      center: [...mean],
    });

    return () => {
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener("mousedown", onDown);
      renderer.domElement.removeEventListener("wheel", onWheel);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      nodeGeom.dispose();
      nodeMat.dispose();
      edgeGeom.dispose();
      labelSprites.forEach((s) => {
        const ud = (s as any).userData;
        if (ud?.texture) ud.texture.dispose();
        if (ud?.material) ud.material.dispose();
      });
      if (hullGeom) hullGeom.dispose();
      if (wireGeom) wireGeom.dispose();
      if (axisGeom) axisGeom.dispose();
      marker.geom.dispose(); marker.mat.dispose();
      marker.geom2.dispose(); marker.mat2.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (document.head.contains(fontLink)) document.head.removeChild(fontLink);
    };
  }, [graph]);
}
