"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { computeCovariance, eigen3x3 } from "@/lib/math/statistics";
import { convexHull3D, hullVolume } from "@/lib/math/convexHull";
import { createStarfield } from "@/lib/three/starfield";
import { createNodes, createHaloLayers } from "@/lib/three/nodes";
import { createLabelsGroup } from "@/lib/three/labelsGroup";
import { createEdges } from "@/lib/three/edges";
import { createHull } from "@/lib/three/hull";
import { createCentroid } from "@/lib/three/centroid";
import { createAxes } from "@/lib/three/axes";
import { createSelectionMarker } from "@/lib/three/selectionMarker";

export function useVisualizer({
  mountRef,
  tooltipRef,
  graph,
  viewRef,
  selectedIdRef,
  sceneRef,
  setHovered,
  setSelectedId,
  setStats,
}) {
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const { nodes, edges } = graph;

    const fontLink = document.createElement("link");
    fontLink.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Fraunces:opsz,wght@9..144,300;9..144,500&display=swap";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);

    const width = mount.clientWidth, height = mount.clientHeight;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040610, 0.011);
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.animation = "canvasFadeIn 900ms ease-out";

    const starfield = createStarfield();
    scene.add(starfield.points);

    const { mean, cov } = computeCovariance(nodes);
    const { values: eigenvalues, vectors: eigenvectors } = eigen3x3(cov);
    const faces = convexHull3D(nodes);
    const volume = hullVolume(faces, nodes, mean);

    const { instanced, geom: nodeGeom, mat: nodeMat, baseSizes } = createNodes(nodes);
    scene.add(instanced);

    const halos = createHaloLayers(nodes, nodeGeom, baseSizes);
    scene.add(halos.inner.mesh);
    scene.add(halos.mid.mesh);
    scene.add(halos.outer.mesh);

    const { group: labelsGroup, sprites: labelSprites } = createLabelsGroup(nodes, baseSizes);
    scene.add(labelsGroup);

    const { lines: edgeLines, geom: edgeGeom } = createEdges(nodes, edges, {
      isRoot: viewRef.current === "root",
    });
    if (edges.length > 0) scene.add(edgeLines);

    const { group: hullGroup, hullGeom, wireGeom } = createHull(nodes, faces);
    if (faces.length > 0) scene.add(hullGroup);

    const centroidGroup = nodes.length > 0 ? createCentroid(mean) : null;
    if (centroidGroup) scene.add(centroidGroup);

    let axesGroup = null, axisGeom = null;
    if (nodes.length > 1) {
      const built = createAxes(mean, eigenvalues, eigenvectors);
      axesGroup = built.group;
      axisGeom = built.geom;
      scene.add(axesGroup);
    }

    sceneRef.current = { hullGroup, axesGroup, centroidGroup, edgeLines, labelsGroup, labelSprites };

    const sel = createSelectionMarker();
    scene.add(sel.marker);
    scene.add(sel.marker2);

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

    const onDown = (e) => {
      isDragging = true; autoRotate = false;
      px = e.clientX; py = e.clientY;
      downX = e.clientX; downY = e.clientY;
    };
    const onUp = (e) => {
      isDragging = false;
      const dx = e.clientX - downX, dy = e.clientY - downY;
      if (Math.hypot(dx, dy) < 5) {
        raycaster.setFromCamera(mouseNDC, camera);
        const hits = raycaster.intersectObject(instanced);
        if (hits.length > 0) setSelectedId(hits[0].instanceId);
        else setSelectedId(null);
      }
    };
    const onMove = (e) => {
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
    const onWheel = (e) => {
      e.preventDefault();
      radius = Math.max(20, Math.min(160, radius + e.deltaY * 0.06));
      updateCamera();
    };

    renderer.domElement.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    let rafId;
    const tmpMat = new THREE.Matrix4();
    const tmpPos = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const tmpScale = new THREE.Vector3();

    const animate = () => {
      if (autoRotate && !isDragging) { theta += 0.0012; updateCamera(); }

      starfield.points.rotation.y += 0.00015;
      starfield.points.rotation.x += 0.00007;

      const selIdx = selectedIdRef.current;
      if (selIdx !== null && selIdx >= 0 && selIdx < nodes.length) {
        const n = nodes[selIdx];
        const s = baseSizes[selIdx] * 2.0;
        const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.08;
        const now = Date.now() * 0.001;
        sel.marker.visible = true;
        sel.marker2.visible = true;
        sel.marker.position.set(n.x, n.y, n.z);
        sel.marker2.position.set(n.x, n.y, n.z);
        sel.marker.scale.setScalar(s * pulse);
        sel.marker2.scale.setScalar(s * pulse * 1.1);
        sel.marker.lookAt(camera.position);
        sel.marker2.lookAt(camera.position);
        sel.marker.rotateZ(now * 0.5);
        sel.marker2.rotateZ(-now * 0.3);
        sel.mat.color.setHex(n.color);
        sel.mat2.color.setHex(n.color);
      } else {
        sel.marker.visible = false;
        sel.marker2.visible = false;
      }

      raycaster.setFromCamera(mouseNDC, camera);
      const hits = raycaster.intersectObject(instanced);
      const newId = hits.length > 0 ? hits[0].instanceId : -1;
      if (newId !== hoverId) {
        if (hoverId >= 0 && hoverId < nodes.length) {
          instanced.getMatrixAt(hoverId, tmpMat);
          tmpMat.decompose(tmpPos, tmpQuat, tmpScale);
          tmpScale.setScalar(baseSizes[hoverId]);
          tmpMat.compose(tmpPos, tmpQuat, tmpScale);
          instanced.setMatrixAt(hoverId, tmpMat);
          const prev = labelSprites[hoverId];
          if (prev) prev.scale.copy(prev.userData.baseScale);
        }
        if (newId >= 0 && newId < nodes.length) {
          instanced.getMatrixAt(newId, tmpMat);
          tmpMat.decompose(tmpPos, tmpQuat, tmpScale);
          tmpScale.setScalar(baseSizes[newId] * 1.6);
          tmpMat.compose(tmpPos, tmpQuat, tmpScale);
          instanced.setMatrixAt(newId, tmpMat);
          const cur = labelSprites[newId];
          if (cur) cur.scale.copy(cur.userData.baseScale).multiplyScalar(1.3);
          setHovered({ ...nodes[newId], x: lastClientX, y: lastClientY });
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
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    const totalDeg = nodes.reduce((s, n) => s + n.degree, 0);
    setStats({
      nodes: nodes.length, edges: edges.length,
      avgDeg: nodes.length ? (totalDeg / nodes.length).toFixed(2) : "0.00",
      faces: faces.length, volume: Math.round(volume),
      cov, eigen: eigenvalues, center: mean,
    });

    return () => {
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener("mousedown", onDown);
      renderer.domElement.removeEventListener("wheel", onWheel);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      nodeGeom.dispose(); nodeMat.dispose();
      halos.inner.mat.dispose(); halos.mid.mat.dispose(); halos.outer.mat.dispose();
      starfield.geom.dispose(); starfield.mat.dispose();
      edgeGeom.dispose();
      labelSprites.forEach((s) => {
        if (s.userData.texture) s.userData.texture.dispose();
        if (s.userData.material) s.userData.material.dispose();
      });
      if (hullGeom) hullGeom.dispose();
      if (wireGeom) wireGeom.dispose();
      if (axisGeom) axisGeom.dispose();
      sel.geom.dispose(); sel.mat.dispose();
      sel.geom2.dispose(); sel.mat2.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (document.head.contains(fontLink)) document.head.removeChild(fontLink);
    };
  }, [graph]);
}
