import * as THREE from "three";
import { MODULES, FILENAMES } from "./constants";

export function generateCodebase() {
  const folders = MODULES.map((mod, idx) => ({
    id: idx,
    name: mod.name,
    color: mod.color,
    fileCount: mod.count,
    files: [],
  }));

  let fileId = 0;
  const allFiles = [];
  folders.forEach((folder, fIdx) => {
    for (let i = 0; i < folder.fileCount; i++) {
      const base = FILENAMES[(i * 7 + fIdx * 3) % FILENAMES.length];
      const file = {
        id: fileId++,
        name: `${base}.ts`,
        folderId: fIdx,
        folderName: folder.name,
        color: folder.color,
        imports: [],
        importedBy: [],
      };
      folder.files.push(file);
      allFiles.push(file);
    }
  });

  const importSet = new Set();
  const addImport = (s, t) => {
    if (s === t) return;
    const key = `${s}->${t}`;
    const rev = `${t}->${s}`;
    if (importSet.has(key) || importSet.has(rev)) return;
    importSet.add(key);
    allFiles[s].imports.push(t);
    allFiles[t].importedBy.push(s);
  };

  allFiles.forEach((file) => {
    const peers = folders[file.folderId].files;
    const intra = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < intra; i++) {
      const t = peers[Math.floor(Math.random() * peers.length)];
      if (t) addImport(file.id, t.id);
    }
    if (Math.random() < 0.35) {
      const other = allFiles[Math.floor(Math.random() * allFiles.length)];
      addImport(file.id, other.id);
    }
  });

  const folderEdgeMap = new Map();
  allFiles.forEach((file) => {
    file.imports.forEach((tid) => {
      const t = allFiles[tid];
      if (t.folderId !== file.folderId) {
        const key = file.folderId < t.folderId
          ? `${file.folderId}-${t.folderId}`
          : `${t.folderId}-${file.folderId}`;
        folderEdgeMap.set(key, (folderEdgeMap.get(key) || 0) + 1);
      }
    });
  });
  const folderEdges = [...folderEdgeMap.entries()].map(([k, w]) => {
    const [s, t] = k.split("-").map(Number);
    return { source: s, target: t, weight: w };
  });

  return { folders, allFiles, folderEdges };
}

export function getGraph(codebase, view) {
  if (view === "root") {
    const nodes = codebase.folders.map((f) => ({
      id: f.id,
      name: f.name,
      folderName: f.name,
      color: f.color,
      fileCount: f.fileCount,
      isFolder: true,
      x: (Math.random() - 0.5) * 25,
      y: (Math.random() - 0.5) * 25,
      z: (Math.random() - 0.5) * 25,
      vx: 0, vy: 0, vz: 0,
      degree: 0,
      weightSum: 0,
    }));
    const edges = codebase.folderEdges.map((e) => ({ ...e }));
    edges.forEach((e) => {
      nodes[e.source].degree += 1;
      nodes[e.target].degree += 1;
      nodes[e.source].weightSum += e.weight;
      nodes[e.target].weightSum += e.weight;
    });
    return { nodes, edges };
  }

  const folder = codebase.folders.find((f) => f.name === view);
  if (!folder) return { nodes: [], edges: [] };

  const idMap = new Map();
  const nodes = folder.files.map((file, idx) => {
    idMap.set(file.id, idx);
    const c = new THREE.Color(folder.color);
    const hsl = {};
    c.getHSL(hsl);
    c.setHSL(hsl.h, hsl.s, Math.max(0.3, Math.min(0.8, hsl.l + ((idx % 5) - 2) * 0.06)));
    return {
      id: file.id,
      localIdx: idx,
      name: file.name,
      folderName: folder.name,
      color: c.getHex(),
      isFolder: false,
      x: (Math.random() - 0.5) * 20,
      y: (Math.random() - 0.5) * 20,
      z: (Math.random() - 0.5) * 20,
      vx: 0, vy: 0, vz: 0,
      degree: 0,
    };
  });

  const edges = [];
  const eSet = new Set();
  folder.files.forEach((file) => {
    const neighbors = [...file.imports, ...file.importedBy];
    neighbors.forEach((tid) => {
      if (idMap.has(tid)) {
        const s = idMap.get(file.id), t = idMap.get(tid);
        if (s === t) return;
        const key = s < t ? `${s}-${t}` : `${t}-${s}`;
        if (!eSet.has(key)) {
          eSet.add(key);
          edges.push({ source: s, target: t, weight: 1 });
        }
      }
    });
  });
  edges.forEach((e) => { nodes[e.source].degree++; nodes[e.target].degree++; });
  return { nodes, edges };
}
