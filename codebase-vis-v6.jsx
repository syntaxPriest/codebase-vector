import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// ---------------- Synthetic codebase ----------------
const MODULES = [
  { name: "components/ui",     color: 0xff4d7e, count: 16 },
  { name: "components/layout", color: 0xff8c42, count: 7  },
  { name: "hooks",             color: 0x4ecdc4, count: 11 },
  { name: "utils",             color: 0xffd93d, count: 13 },
  { name: "api",               color: 0x6bd968, count: 9  },
  { name: "pages",             color: 0x7fb3ff, count: 8  },
  { name: "store",             color: 0xc77dff, count: 7  },
  { name: "lib",               color: 0xff6bc7, count: 10 },
];

const FILENAMES = [
  "index","config","helpers","client","types","constants","parser","loader",
  "renderer","provider","context","hook","store","reducer","action","model",
  "schema","validator","formatter","adapter","router","guard","middleware",
  "service","repo","query","mutation","event","stream","queue",
];

const FILE_DESCRIPTIONS = {
  index: "Barrel export aggregating the module's public surface. Re-exports types and utilities from sibling files.",
  config: "Environment-aware configuration object. Resolves values from process.env with sensible defaults.",
  helpers: "Small pure utility functions shared across the module. No external runtime dependencies.",
  client: "Configured SDK or HTTP client instance. Singleton with retry, auth, and base-URL resolution.",
  types: "Type definitions, interfaces, and discriminated unions. Pure type-land with zero runtime output.",
  constants: "Immutable constants and enum-like objects referenced throughout the module.",
  parser: "Input parsing and normalization. Converts external shapes into internal representation.",
  loader: "Lazy resource loading from disk, network, or CDN with caching and fallback.",
  renderer: "Output rendering layer. Takes structured input and produces markup or display state.",
  provider: "Context provider wrapping children with shared state and lifecycle hooks.",
  context: "React Context definition with default value and typed consumer hooks.",
  hook: "Custom React hook encapsulating stateful logic for components.",
  store: "State container with reducers, selectors, and action creators.",
  reducer: "Pure state-transition function — (state, action) → newState.",
  action: "Action creators and action-type constants for state mutations.",
  model: "Domain entity with validation, serialization, and business rules.",
  schema: "Runtime shape validation with static type inference.",
  validator: "Input validation logic. Returns typed errors for malformed data.",
  formatter: "Display-layer formatters for dates, currency, numbers, and text.",
  adapter: "Adapter translating between two otherwise incompatible interfaces.",
  router: "Route definitions and navigation handlers.",
  guard: "Authorization and permission checks before sensitive operations.",
  middleware: "Request/response middleware sitting in the pipeline.",
  service: "Business-logic layer orchestrating repositories and external APIs.",
  repo: "Data-access layer encapsulating persistence behind a clean interface.",
  query: "Read-side data fetching with caching and invalidation.",
  mutation: "Write-side operations with optimistic updates and rollback.",
  event: "Event emitters and subscription handlers.",
  stream: "Streaming data — observables, async iterators, or WebSocket pipes.",
  queue: "Job queue with priority, retry, and exponential backoff.",
};

const FOLDER_DESCRIPTIONS = {
  "components/ui": "Stateless presentational primitives — buttons, inputs, cards, dialogs. Pure components driven by props.",
  "components/layout": "Page-level layout components. Headers, sidebars, grids, and responsive containers.",
  hooks: "Custom React hooks. Each encapsulates a single concern — data fetching, timers, media queries.",
  utils: "Pure utility functions. Formatting, parsing, math, and small type helpers with no runtime dependencies.",
  api: "HTTP client layer. Typed endpoints, request/response adapters, and error normalization.",
  pages: "Route-level components composed from UI primitives, orchestrating data and navigation.",
  store: "Global state management. Reducers, selectors, and action creators for cross-cutting concerns.",
  lib: "Third-party integration wrappers and framework-agnostic libraries.",
};

function getFileDescription(file) {
  const base = file.name.replace(".ts", "");
  return FILE_DESCRIPTIONS[base] || "Module-specific implementation file.";
}

function getFolderDescription(folder) {
  return FOLDER_DESCRIPTIONS[folder.name] || "Folder in the codebase.";
}

// Deterministic pseudo-LOC based on file id
function pseudoLOC(id) {
  const h = ((id * 2654435761) >>> 0);
  return 42 + (h % 380);
}

function generateCodebase() {
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
        imports: [],       // outgoing: this file imports these
        importedBy: [],    // incoming: these files import this
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
    allFiles[s].imports.push(t);       // s imports t
    allFiles[t].importedBy.push(s);    // t is imported by s
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

  // Aggregate folder-level edges (undirected, count distinct cross-folder file links)
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

// Build the graph for a given view
function getGraph(codebase, view) {
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
    // slight lightness variation per file
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

// ---------------- Label sprites ----------------
function shortName(name) {
  return name.includes("/") ? name.split("/").pop() : name;
}

function createLabelSprite(text, { color = "#ffffff", accent = "#ffffff" } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const fontSize = 58;
  ctx.font = `500 ${fontSize}px 'JetBrains Mono', ui-monospace, monospace`;

  const padX = 22, padY = 14;
  const textW = ctx.measureText(text).width;
  const boxW = Math.min(canvas.width - 4, textW + padX * 2);
  const boxH = fontSize + padY * 2;
  const x = (canvas.width - boxW) / 2;
  const y = (canvas.height - boxH) / 2;

  // pill background
  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  ctx.fillRect(x, y, boxW, boxH);

  // top border accent
  ctx.fillStyle = accent;
  ctx.fillRect(x, y, boxW, 3);

  // faint frame
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, boxW - 1, boxH - 1);

  // text
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
  const sprite = new THREE.Sprite(material);

  const aspect = canvas.width / canvas.height;
  const baseH = 1.6;
  sprite.scale.set(baseH * aspect, baseH, 1);
  sprite.userData.baseScale = sprite.scale.clone();
  sprite.userData.texture = texture;
  sprite.userData.material = material;
  return sprite;
}

// ---------------- Force-directed layout ----------------
function runForceLayout(nodes, edges, iterations = 350) {
  const N = nodes.length;
  if (N === 0) return;
  const sizeScale = N < 20 ? 2.0 : 1.0;
  const REPULSION = 140 * sizeScale;
  const SPRING_K = 0.05;
  const REST = 5.5 * Math.sqrt(sizeScale);
  const CENTER_K = 0.006;
  const DAMP = 0.82, DT = 0.12;

  for (let it = 0; it < iterations; it++) {
    const fx = new Float32Array(N), fy = new Float32Array(N), fz = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dz = nodes[i].z - nodes[j].z;
        const d2 = dx*dx + dy*dy + dz*dz + 0.01, d = Math.sqrt(d2), f = REPULSION / d2;
        const ux = dx/d, uy = dy/d, uz = dz/d;
        fx[i] += f*ux; fy[i] += f*uy; fz[i] += f*uz;
        fx[j] -= f*ux; fy[j] -= f*uy; fz[j] -= f*uz;
      }
    }
    for (const e of edges) {
      const a = nodes[e.source], b = nodes[e.target];
      const dx = b.x-a.x, dy = b.y-a.y, dz = b.z-a.z;
      const d = Math.sqrt(dx*dx + dy*dy + dz*dz) + 0.01;
      const f = SPRING_K * (d - REST);
      const ux = dx/d, uy = dy/d, uz = dz/d;
      fx[e.source] += f*ux; fy[e.source] += f*uy; fz[e.source] += f*uz;
      fx[e.target] -= f*ux; fy[e.target] -= f*uy; fz[e.target] -= f*uz;
    }
    for (let i = 0; i < N; i++) {
      fx[i] -= CENTER_K * nodes[i].x;
      fy[i] -= CENTER_K * nodes[i].y;
      fz[i] -= CENTER_K * nodes[i].z;
    }
    for (let i = 0; i < N; i++) {
      nodes[i].vx = (nodes[i].vx + fx[i]) * DAMP;
      nodes[i].vy = (nodes[i].vy + fy[i]) * DAMP;
      nodes[i].vz = (nodes[i].vz + fz[i]) * DAMP;
      nodes[i].x += nodes[i].vx * DT;
      nodes[i].y += nodes[i].vy * DT;
      nodes[i].z += nodes[i].vz * DT;
    }
  }
}

// ---------------- Linear algebra ----------------
function computeCovariance(pts) {
  const n = pts.length;
  if (n === 0) return { mean: [0,0,0], cov: [[0,0,0],[0,0,0],[0,0,0]] };
  let mx = 0, my = 0, mz = 0;
  for (const p of pts) { mx += p.x; my += p.y; mz += p.z; }
  mx /= n; my /= n; mz /= n;
  let cxx = 0, cyy = 0, czz = 0, cxy = 0, cxz = 0, cyz = 0;
  for (const p of pts) {
    const dx = p.x - mx, dy = p.y - my, dz = p.z - mz;
    cxx += dx*dx; cyy += dy*dy; czz += dz*dz;
    cxy += dx*dy; cxz += dx*dz; cyz += dy*dz;
  }
  const inv = 1 / Math.max(1, n - 1);
  return {
    mean: [mx, my, mz],
    cov: [
      [cxx*inv, cxy*inv, cxz*inv],
      [cxy*inv, cyy*inv, cyz*inv],
      [cxz*inv, cyz*inv, czz*inv],
    ],
  };
}

function eigen3x3(A) {
  const M = A.map((r) => [...r]);
  let V = [[1,0,0],[0,1,0],[0,0,1]];
  for (let iter = 0; iter < 50; iter++) {
    let p = 0, q = 1, max = Math.abs(M[0][1]);
    if (Math.abs(M[0][2]) > max) { p = 0; q = 2; max = Math.abs(M[0][2]); }
    if (Math.abs(M[1][2]) > max) { p = 1; q = 2; max = Math.abs(M[1][2]); }
    if (max < 1e-10) break;
    const theta = (M[q][q] - M[p][p]) / (2 * M[p][q]);
    const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(1 + theta*theta));
    const c = 1 / Math.sqrt(1 + t*t);
    const s = t * c;
    const Mpp = M[p][p], Mqq = M[q][q], Mpq = M[p][q];
    M[p][p] = c*c*Mpp - 2*s*c*Mpq + s*s*Mqq;
    M[q][q] = s*s*Mpp + 2*s*c*Mpq + c*c*Mqq;
    M[p][q] = 0; M[q][p] = 0;
    for (let i = 0; i < 3; i++) {
      if (i !== p && i !== q) {
        const Mip = M[i][p], Miq = M[i][q];
        M[i][p] = c*Mip - s*Miq; M[p][i] = M[i][p];
        M[i][q] = s*Mip + c*Miq; M[q][i] = M[i][q];
      }
    }
    for (let i = 0; i < 3; i++) {
      const Vip = V[i][p], Viq = V[i][q];
      V[i][p] = c*Vip - s*Viq;
      V[i][q] = s*Vip + c*Viq;
    }
  }
  const values = [M[0][0], M[1][1], M[2][2]];
  const vectors = [
    [V[0][0], V[1][0], V[2][0]],
    [V[0][1], V[1][1], V[2][1]],
    [V[0][2], V[1][2], V[2][2]],
  ];
  const order = [0,1,2].sort((a,b) => values[b] - values[a]);
  return { values: order.map(i => values[i]), vectors: order.map(i => vectors[i]) };
}

function convexHull3D(pts) {
  const n = pts.length;
  if (n < 4) return [];
  const eps = 1e-6;
  const sub = (a, b) => [a.x-b.x, a.y-b.y, a.z-b.z];
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  const norm = (v) => { const l = Math.hypot(v[0],v[1],v[2]); return l < eps ? null : [v[0]/l, v[1]/l, v[2]/l]; };

  let ex = [0,0,0,0,0,0];
  for (let i = 1; i < n; i++) {
    if (pts[i].x < pts[ex[0]].x) ex[0] = i;
    if (pts[i].x > pts[ex[1]].x) ex[1] = i;
    if (pts[i].y < pts[ex[2]].y) ex[2] = i;
    if (pts[i].y > pts[ex[3]].y) ex[3] = i;
    if (pts[i].z < pts[ex[4]].z) ex[4] = i;
    if (pts[i].z > pts[ex[5]].z) ex[5] = i;
  }
  let p0 = ex[0], p1 = ex[1], best = -1;
  for (let i = 0; i < 6; i++) for (let j = i+1; j < 6; j++) {
    const d = sub(pts[ex[i]], pts[ex[j]]);
    const sq = d[0]*d[0] + d[1]*d[1] + d[2]*d[2];
    if (sq > best) { best = sq; p0 = ex[i]; p1 = ex[j]; }
  }
  const line = sub(pts[p1], pts[p0]);
  const lSq = dot(line, line);
  if (lSq < eps) return [];
  let p2 = -1, bestD = -1;
  for (let i = 0; i < n; i++) {
    if (i === p0 || i === p1) continue;
    const v = sub(pts[i], pts[p0]);
    const c = cross(v, line);
    const d = (c[0]*c[0] + c[1]*c[1] + c[2]*c[2]) / lSq;
    if (d > bestD) { bestD = d; p2 = i; }
  }
  if (p2 === -1) return [];
  const nTri = norm(cross(sub(pts[p1], pts[p0]), sub(pts[p2], pts[p0])));
  if (!nTri) return [];
  let p3 = -1; bestD = -1;
  for (let i = 0; i < n; i++) {
    if (i === p0 || i === p1 || i === p2) continue;
    const v = sub(pts[i], pts[p0]);
    const d = Math.abs(dot(nTri, v));
    if (d > bestD) { bestD = d; p3 = i; }
  }
  if (p3 === -1) return [];

  const cx = (pts[p0].x + pts[p1].x + pts[p2].x + pts[p3].x) / 4;
  const cy = (pts[p0].y + pts[p1].y + pts[p2].y + pts[p3].y) / 4;
  const cz = (pts[p0].z + pts[p1].z + pts[p2].z + pts[p3].z) / 4;

  const makeFace = (i1, i2, i3) => {
    const nrm = norm(cross(sub(pts[i2], pts[i1]), sub(pts[i3], pts[i1])));
    if (!nrm) return null;
    const toV = [pts[i1].x - cx, pts[i1].y - cy, pts[i1].z - cz];
    if (dot(nrm, toV) < 0) return { v: [i1, i3, i2], n: [-nrm[0], -nrm[1], -nrm[2]] };
    return { v: [i1, i2, i3], n: nrm };
  };

  let faces = [makeFace(p0,p1,p2), makeFace(p0,p1,p3), makeFace(p0,p2,p3), makeFace(p1,p2,p3)].filter(Boolean);
  const above = (f, i) => {
    const a = pts[f.v[0]], p = pts[i];
    return f.n[0]*(p.x-a.x) + f.n[1]*(p.y-a.y) + f.n[2]*(p.z-a.z) > eps;
  };

  const onHull = new Set([p0, p1, p2, p3]);
  for (let i = 0; i < n; i++) {
    if (onHull.has(i)) continue;
    const visible = [];
    for (let f = 0; f < faces.length; f++) if (above(faces[f], i)) visible.push(f);
    if (visible.length === 0) continue;
    const edgeMap = new Map();
    for (const fIdx of visible) {
      const [a, b, c] = faces[fIdx].v;
      for (const [x, y] of [[a,b],[b,c],[c,a]]) {
        const key = x < y ? `${x},${y}` : `${y},${x}`;
        if (!edgeMap.has(key)) edgeMap.set(key, { count: 0, pair: [x, y] });
        edgeMap.get(key).count++;
      }
    }
    const horizon = [];
    for (const e of edgeMap.values()) if (e.count === 1) horizon.push(e.pair);
    const vSet = new Set(visible);
    faces = faces.filter((_, idx) => !vSet.has(idx));
    for (const [a, b] of horizon) {
      const f = makeFace(a, b, i);
      if (f) faces.push(f);
    }
    onHull.add(i);
  }
  return faces;
}

function hullVolume(faces, pts, center) {
  let v = 0;
  for (const f of faces) {
    const a = pts[f.v[0]], b = pts[f.v[1]], c = pts[f.v[2]];
    const ax = a.x - center[0], ay = a.y - center[1], az = a.z - center[2];
    const bx = b.x - center[0], by = b.y - center[1], bz = b.z - center[2];
    const cx = c.x - center[0], cy = c.y - center[1], cz = c.z - center[2];
    v += ax*(by*cz - bz*cy) - ay*(bx*cz - bz*cx) + az*(bx*cy - by*cx);
  }
  return Math.abs(v) / 6;
}

// ---------------- Component ----------------
export default function CodebaseVectorSpace() {
  const [codebase] = useState(() => generateCodebase());
  const [view, setView] = useState("root");
  const [hovered, setHovered] = useState(null);
  const [stats, setStats] = useState({
    nodes: 0, edges: 0, avgDeg: 0, faces: 0, volume: 0,
    cov: [[0,0,0],[0,0,0],[0,0,0]], eigen: [0,0,0], center: [0,0,0],
  });
  const [showHull, setShowHull] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [showCentroid, setShowCentroid] = useState(true);
  const [showEdges, setShowEdges] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedId;

  const mountRef = useRef(null);
  const tooltipRef = useRef(null);
  const sceneRef = useRef({});
  const graphCache = useRef(new Map());
  const viewRef = useRef(view);
  viewRef.current = view;

  // Compute / cache graph per view
  const graph = useMemo(() => {
    const key = view;
    if (graphCache.current.has(key)) return graphCache.current.get(key);
    const g = getGraph(codebase, view);
    runForceLayout(g.nodes, g.edges);
    graphCache.current.set(key, g);
    return g;
  }, [codebase, view]);

  // ESC: clear selection first, then back to root
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (selectedIdRef.current !== null) setSelectedId(null);
        else if (viewRef.current !== "root") setView("root");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Clear selection on view change
  useEffect(() => { setSelectedId(null); }, [view]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const { nodes, edges } = graph;

    const fontLink = document.createElement("link");
    fontLink.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Fraunces:opsz,wght@9..144,300;9..144,500&display=swap";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @keyframes canvasFadeIn {
        from { opacity: 0; transform: scale(0.98); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes titleShimmer {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      @keyframes ringPulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.8; }
      }
      .viz-title {
        background: linear-gradient(110deg, #ffffff 0%, #d8b4fe 25%, #a5b4fc 50%, #67e8f9 75%, #ffffff 100%);
        background-size: 200% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: titleShimmer 8s ease-in-out infinite;
      }
      .noise-overlay {
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
        opacity: 0.035;
        mix-blend-mode: overlay;
      }
      .corner-mark {
        position: absolute; width: 14px; height: 14px; pointer-events: none;
      }
      .corner-mark::before, .corner-mark::after {
        content: ''; position: absolute; background: rgba(255,255,255,0.35);
      }
      .corner-mark::before { top: 0; left: 0; width: 100%; height: 1px; }
      .corner-mark::after  { top: 0; left: 0; width: 1px; height: 100%; }
    `;
    document.head.appendChild(styleEl);

    const width = mount.clientWidth, height = mount.clientHeight;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040610, 0.011);
    const camera = new THREE.PerspectiveCamera(55, width/height, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.animation = "canvasFadeIn 900ms ease-out";

    // Starfield — 2500 points on a large sphere shell
    const STAR_COUNT = 2500;
    const starVerts = new Float32Array(STAR_COUNT * 3);
    const starCols = new Float32Array(STAR_COUNT * 3);
    const starBaseBrightness = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 140 + Math.random() * 90;
      starVerts[i*3    ] = r * Math.sin(phi) * Math.cos(theta);
      starVerts[i*3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starVerts[i*3 + 2] = r * Math.cos(phi);
      const brightness = 0.15 + Math.random() * 0.85;
      starBaseBrightness[i] = brightness;
      // Slight hue variation — mostly cool blues/purples with occasional warm
      const isWarm = Math.random() < 0.12;
      const hue = isWarm ? 0.02 + Math.random() * 0.08 : 0.55 + (Math.random() - 0.5) * 0.18;
      const sat = isWarm ? 0.5 : 0.35;
      const c = new THREE.Color().setHSL(hue, sat, brightness * 0.6);
      starCols[i*3    ] = c.r;
      starCols[i*3 + 1] = c.g;
      starCols[i*3 + 2] = c.b;
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute("position", new THREE.BufferAttribute(starVerts, 3));
    starGeom.setAttribute("color", new THREE.BufferAttribute(starCols, 3));
    const starMat = new THREE.PointsMaterial({
      vertexColors: true, size: 0.9, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeom, starMat);
    scene.add(stars);

    // Linear algebra
    const { mean, cov } = computeCovariance(nodes);
    const { values: eigenvalues, vectors: eigenvectors } = eigen3x3(cov);
    const faces = convexHull3D(nodes);
    const volume = hullVolume(faces, nodes, mean);

    // Nodes
    const nodeGeom = new THREE.SphereGeometry(0.5, 20, 20);
    const nodeMat = new THREE.MeshBasicMaterial({ toneMapped: false });
    const instanced = new THREE.InstancedMesh(nodeGeom, nodeMat, Math.max(1, nodes.length));
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
    scene.add(instanced);

    // Multi-layer glow — fake bloom via stacked additive halos
    const makeHaloLayer = (scaleMul, opacity) => {
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

    const haloInner = makeHaloLayer(2.2, 0.35);
    const haloMid   = makeHaloLayer(4.0, 0.14);
    const haloOuter = makeHaloLayer(7.5, 0.05);
    scene.add(haloInner.mesh);
    scene.add(haloMid.mesh);
    scene.add(haloOuter.mesh);

    // Labels — one sprite per node
    const labelsGroup = new THREE.Group();
    const labelSprites = [];
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
      labelsGroup.add(sprite);
      labelSprites.push(sprite);
    });
    scene.add(labelsGroup);

    // Edges — curved bezier with gradient + weighted intensity
    let maxW = 1;
    edges.forEach((e) => { if (e.weight > maxW) maxW = e.weight; });
    const SEG = 18;
    const totalEdgeFloats = edges.length * SEG * 2 * 3;
    const edgeVerts = new Float32Array(totalEdgeFloats);
    const edgeCols = new Float32Array(totalEdgeFloats);

    edges.forEach((e, ei) => {
      const a = nodes[e.source], b = nodes[e.target];
      // Midpoint pushed outward from the scene origin — creates a gentle arc
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;
      const mz = (a.z + b.z) * 0.5;
      const len = Math.hypot(mx, my, mz) || 1;
      const dist = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      const bow = dist * 0.18;
      const cx = mx + (mx / len) * bow;
      const cy = my + (my / len) * bow;
      const cz = mz + (mz / len) * bow;

      // Pre-compute all SEG+1 points on the bezier
      const pts = new Float32Array((SEG + 1) * 3);
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        const omt = 1 - t;
        pts[i * 3    ] = omt*omt*a.x + 2*omt*t*cx + t*t*b.x;
        pts[i * 3 + 1] = omt*omt*a.y + 2*omt*t*cy + t*t*b.y;
        pts[i * 3 + 2] = omt*omt*a.z + 2*omt*t*cz + t*t*b.z;
      }

      const ca = new THREE.Color(a.color), cb = new THREE.Color(b.color);
      const intensity = viewRef.current === "root" ? 0.6 + (e.weight / maxW) * 0.6 : 0.85;

      for (let i = 0; i < SEG; i++) {
        const base = (ei * SEG + i) * 6;
        edgeVerts[base    ] = pts[i * 3    ];
        edgeVerts[base + 1] = pts[i * 3 + 1];
        edgeVerts[base + 2] = pts[i * 3 + 2];
        edgeVerts[base + 3] = pts[(i + 1) * 3    ];
        edgeVerts[base + 4] = pts[(i + 1) * 3 + 1];
        edgeVerts[base + 5] = pts[(i + 1) * 3 + 2];

        // Ease color from a → b, dim near midpoint for a "flowing" feel
        const t1 = i / SEG, t2 = (i + 1) / SEG;
        const mid1 = 1 - Math.abs(t1 - 0.5) * 0.6;
        const mid2 = 1 - Math.abs(t2 - 0.5) * 0.6;
        const i1 = intensity * mid1;
        const i2 = intensity * mid2;
        edgeCols[base    ] = (ca.r * (1 - t1) + cb.r * t1) * i1;
        edgeCols[base + 1] = (ca.g * (1 - t1) + cb.g * t1) * i1;
        edgeCols[base + 2] = (ca.b * (1 - t1) + cb.b * t1) * i1;
        edgeCols[base + 3] = (ca.r * (1 - t2) + cb.r * t2) * i2;
        edgeCols[base + 4] = (ca.g * (1 - t2) + cb.g * t2) * i2;
        edgeCols[base + 5] = (ca.b * (1 - t2) + cb.b * t2) * i2;
      }
    });
    const edgeGeom = new THREE.BufferGeometry();
    edgeGeom.setAttribute("position", new THREE.BufferAttribute(edgeVerts, 3));
    edgeGeom.setAttribute("color", new THREE.BufferAttribute(edgeCols, 3));
    const edgeLines = new THREE.LineSegments(edgeGeom, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    if (edges.length > 0) scene.add(edgeLines);

    // Convex hull
    const hullGroup = new THREE.Group();
    let hullGeom = null, wireGeom = null;
    if (faces.length > 0) {
      const hullPositions = new Float32Array(faces.length * 9);
      faces.forEach((f, i) => {
        const a = nodes[f.v[0]], b = nodes[f.v[1]], c = nodes[f.v[2]];
        hullPositions.set([a.x,a.y,a.z, b.x,b.y,b.z, c.x,c.y,c.z], i * 9);
      });
      hullGeom = new THREE.BufferGeometry();
      hullGeom.setAttribute("position", new THREE.BufferAttribute(hullPositions, 3));
      hullGeom.computeVertexNormals();
      const hullFill = new THREE.Mesh(hullGeom, new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.025,
        side: THREE.DoubleSide, depthWrite: false,
      }));
      hullGroup.add(hullFill);
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
      wireGeom = new THREE.BufferGeometry();
      wireGeom.setAttribute("position", new THREE.Float32BufferAttribute(wireVerts, 3));
      const hullWire = new THREE.LineSegments(wireGeom, new THREE.LineBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false,
      }));
      hullGroup.add(hullWire);
      scene.add(hullGroup);
    }

    // Centroid — multi-layer glow
    const centroidGroup = new THREE.Group();
    if (nodes.length > 0) {
      const centCore = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
      centCore.position.set(mean[0], mean[1], mean[2]);
      centroidGroup.add(centCore);
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
        centroidGroup.add(halo);
      });
      scene.add(centroidGroup);
    }

    // Principal axes
    const axisColors = [0xffe066, 0x4ecdc4, 0xff6bc7];
    const axesGroup = new THREE.Group();
    let axisGeom = null;
    if (nodes.length > 1) {
      const axisLineVerts = [], axisLineCols = [];
      for (let k = 0; k < 3; k++) {
        const len = 2 * Math.sqrt(Math.max(eigenvalues[k], 0));
        const v = eigenvectors[k];
        const p1 = [mean[0] - v[0]*len, mean[1] - v[1]*len, mean[2] - v[2]*len];
        const p2 = [mean[0] + v[0]*len, mean[1] + v[1]*len, mean[2] + v[2]*len];
        axisLineVerts.push(...p1, ...p2);
        const c = new THREE.Color(axisColors[k]);
        axisLineCols.push(c.r, c.g, c.b, c.r, c.g, c.b);
        [p1, p2].forEach((pp) => {
          const tip = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), new THREE.MeshBasicMaterial({ color: axisColors[k], toneMapped: false }));
          tip.position.set(pp[0], pp[1], pp[2]);
          axesGroup.add(tip);
        });
      }
      axisGeom = new THREE.BufferGeometry();
      axisGeom.setAttribute("position", new THREE.Float32BufferAttribute(axisLineVerts, 3));
      axisGeom.setAttribute("color", new THREE.Float32BufferAttribute(axisLineCols, 3));
      const axisLines = new THREE.LineSegments(axisGeom, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 }));
      axesGroup.add(axisLines);
      scene.add(axesGroup);
    }

    sceneRef.current = { hullGroup, axesGroup, centroidGroup, edgeLines, labelsGroup, labelSprites };

    // Selection marker — dual billboarded torus rings with counter-rotation
    const selMarkerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.95,
      depthTest: false, depthWrite: false,
    });
    const selMarkerMat2 = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.35,
      depthTest: false, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const selMarkerGeom = new THREE.TorusGeometry(1, 0.045, 8, 56);
    const selMarkerGeom2 = new THREE.TorusGeometry(1.35, 0.02, 6, 64);
    const selMarker = new THREE.Mesh(selMarkerGeom, selMarkerMat);
    const selMarker2 = new THREE.Mesh(selMarkerGeom2, selMarkerMat2);
    selMarker.renderOrder = 999;
    selMarker2.renderOrder = 999;
    selMarker.visible = false;
    selMarker2.visible = false;
    scene.add(selMarker);
    scene.add(selMarker2);

    // Orbit + interaction
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
        if (hits.length > 0) {
          setSelectedId(hits[0].instanceId);
        } else {
          setSelectedId(null);
        }
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

    // Animate
    let rafId;
    const tmpMat = new THREE.Matrix4();
    const tmpPos = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const tmpScale = new THREE.Vector3();
    const animate = () => {
      if (autoRotate && !isDragging) { theta += 0.0012; updateCamera(); }

      // Slow starfield drift + subtle twinkle on material size
      stars.rotation.y += 0.00015;
      stars.rotation.x += 0.00007;

      // Selection marker
      const selIdx = selectedIdRef.current;
      if (selIdx !== null && selIdx >= 0 && selIdx < nodes.length) {
        const n = nodes[selIdx];
        const s = baseSizes[selIdx] * 2.0;
        const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.08;
        const now = Date.now() * 0.001;
        selMarker.visible = true;
        selMarker2.visible = true;
        selMarker.position.set(n.x, n.y, n.z);
        selMarker2.position.set(n.x, n.y, n.z);
        selMarker.scale.setScalar(s * pulse);
        selMarker2.scale.setScalar(s * pulse * 1.1);
        selMarker.lookAt(camera.position);
        selMarker2.lookAt(camera.position);
        // Spin rings in opposite directions around their view-facing axis
        selMarker.rotateZ(now * 0.5);
        selMarker2.rotateZ(-now * 0.3);
        selMarkerMat.color.setHex(n.color);
        selMarkerMat2.color.setHex(n.color);
      } else {
        selMarker.visible = false;
        selMarker2.visible = false;
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
      camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
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
      haloInner.mat.dispose(); haloMid.mat.dispose(); haloOuter.mat.dispose();
      starGeom.dispose(); starMat.dispose();
      edgeGeom.dispose();
      labelSprites.forEach((s) => {
        if (s.userData.texture) s.userData.texture.dispose();
        if (s.userData.material) s.userData.material.dispose();
      });
      if (hullGeom) hullGeom.dispose();
      if (wireGeom) wireGeom.dispose();
      if (axisGeom) axisGeom.dispose();
      selMarkerGeom.dispose();
      selMarkerMat.dispose();
      selMarkerGeom2.dispose();
      selMarkerMat2.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (document.head.contains(fontLink)) document.head.removeChild(fontLink);
      if (document.head.contains(styleEl)) document.head.removeChild(styleEl);
    };
  }, [graph]);

  useEffect(() => { if (sceneRef.current.hullGroup) sceneRef.current.hullGroup.visible = showHull; }, [showHull, graph]);
  useEffect(() => { if (sceneRef.current.axesGroup) sceneRef.current.axesGroup.visible = showAxes; }, [showAxes, graph]);
  useEffect(() => { if (sceneRef.current.centroidGroup) sceneRef.current.centroidGroup.visible = showCentroid; }, [showCentroid, graph]);
  useEffect(() => { if (sceneRef.current.edgeLines) sceneRef.current.edgeLines.visible = showEdges; }, [showEdges, graph]);
  useEffect(() => { if (sceneRef.current.labelsGroup) sceneRef.current.labelsGroup.visible = showLabels; }, [showLabels, graph]);

  const mono = { fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" };
  const varianceTotal = stats.eigen.reduce((a, b) => a + b, 0) || 1;
  const inRoot = view === "root";

  // Resolve selected node into rich info from the codebase
  const selectedNode = selectedId !== null ? graph.nodes[selectedId] : null;
  const selectedInfo = useMemo(() => {
    if (!selectedNode) return null;

    if (selectedNode.isFolder) {
      const folder = codebase.folders[selectedNode.id];
      const neighbors = codebase.folderEdges
        .filter((e) => e.source === folder.id || e.target === folder.id)
        .map((e) => {
          const otherId = e.source === folder.id ? e.target : e.source;
          return { folder: codebase.folders[otherId], weight: e.weight };
        })
        .sort((a, b) => b.weight - a.weight);
      const totalImports = neighbors.reduce((s, n) => s + n.weight, 0);
      return {
        kind: "folder",
        folder,
        description: getFolderDescription(folder),
        neighbors,
        totalImports,
      };
    }

    const file = codebase.allFiles[selectedNode.id];
    const toInfo = (id) => {
      const f = codebase.allFiles[id];
      return {
        file: f,
        folder: codebase.folders[f.folderId],
        sameFolder: f.folderId === file.folderId,
      };
    };
    return {
      kind: "file",
      file,
      description: getFileDescription(file),
      imports: file.imports.map(toInfo),
      importedBy: file.importedBy.map(toInfo),
      loc: pseudoLOC(file.id),
    };
  }, [selectedNode, codebase]);

  // For file-in-subtree, find local idx of a related file (to allow clicking to select)
  const findLocalIdx = (fileId) => {
    const idx = graph.nodes.findIndex((n) => n.id === fileId && !n.isFolder);
    return idx >= 0 ? idx : null;
  };
  const findFolderLocalIdx = (folderId) => {
    const idx = graph.nodes.findIndex((n) => n.isFolder && n.id === folderId);
    return idx >= 0 ? idx : null;
  };

  return (
    <div className="relative w-full h-screen overflow-hidden text-white" style={{
      ...mono,
      background: "radial-gradient(ellipse at 50% 40%, #0a0d1f 0%, #060818 40%, #020309 100%)",
    }}>
      <div ref={mountRef} className="absolute inset-0" style={{ cursor: "grab" }} />

      {/* Atmospheric gradient glow — faint colored light bleeding in from corners */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: "radial-gradient(ellipse 60% 50% at 15% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 85% 80%, rgba(236, 72, 153, 0.06) 0%, transparent 60%)",
      }} />

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.78) 100%)",
      }} />

      {/* Film grain */}
      <div className="noise-overlay pointer-events-none absolute inset-0" />

      {/* Top-left title */}
      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-2">
          session 0x4A7F · ℝ³ · {inRoot ? "principal tree" : "sub-tree"}
        </div>
        <div className="viz-title text-2xl font-bold leading-none">
          {inRoot ? (
            <>CODEBASE<span className="text-white/40"> / </span><br />PRINCIPAL TREE</>
          ) : (
            <>{view.toUpperCase()}<br /><span className="text-base font-light">/ sub-tree</span></>
          )}
        </div>
        <div className="text-[11px] text-white/45 mt-3 max-w-[340px] leading-relaxed">
          {inRoot
            ? "each node is a folder · each edge aggregates cross-folder imports · click a folder to descend into its sub-tree"
            : `each node is a file inside ${view} · each edge is an intra-folder import · press esc or click root to ascend`}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-2 text-[11px] px-4 py-2 border border-white/15 bg-white/[0.03] backdrop-blur-md" style={{
          boxShadow: "0 0 24px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}>
          <button
            onClick={() => setView("root")}
            className={`transition-colors tracking-wider uppercase ${inRoot ? "text-white" : "text-white/50 hover:text-white cursor-pointer"}`}
          >root</button>
          {!inRoot && (
            <>
              <span className="text-white/30">›</span>
              <span className="text-white tracking-wider">{view}</span>
            </>
          )}
        </div>
      </div>

      {/* Top-right controls */}
      <div className="absolute top-6 right-6 pointer-events-none text-right">
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-2">controls</div>
        <div className="text-[11px] text-white/60 space-y-0.5">
          <div>drag · rotate</div>
          <div>scroll · zoom</div>
          <div>click · inspect</div>
          <div>esc · {selectedId !== null ? "clear selection" : inRoot ? "—" : "back to root"}</div>
        </div>
      </div>

      {/* Middle-left toggles */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2">
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">overlays</div>
        <div className="space-y-1.5">
          <Toggle active={showHull} onClick={() => setShowHull(!showHull)} label="convex hull" swatch="#ffffff" />
          <Toggle active={showAxes} onClick={() => setShowAxes(!showAxes)} label="principal axes" swatch="#ffe066" />
          <Toggle active={showCentroid} onClick={() => setShowCentroid(!showCentroid)} label="centroid (μ)" swatch="#ffffff" />
          <Toggle active={showEdges} onClick={() => setShowEdges(!showEdges)} label={inRoot ? "aggregated imports" : "import edges"} swatch="#7fb3ff" />
          <Toggle active={showLabels} onClick={() => setShowLabels(!showLabels)} label="node labels" swatch="#ffd93d" />
        </div>
      </div>

      {/* Bottom-left: modules (root) / back (folder) */}
      <div className="absolute bottom-6 left-6">
        {inRoot ? (
          <div className="pointer-events-none">
            <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">folders</div>
            <div className="space-y-1.5">
              {codebase.folders.map((m) => (
                <button
                  key={m.name}
                  onClick={() => setView(m.name)}
                  className="flex items-center gap-2.5 text-[11px] pointer-events-auto hover:bg-white/5 px-1.5 py-0.5 -mx-1.5 transition-colors w-full text-left"
                >
                  <span className="inline-block w-2 h-2 rounded-full" style={{
                    background: `#${m.color.toString(16).padStart(6, "0")}`,
                    boxShadow: `0 0 8px #${m.color.toString(16).padStart(6, "0")}`,
                  }} />
                  <span className="text-white/80">{m.name}</span>
                  <span className="text-white/30 ml-1">{m.fileCount}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setView("root")}
            className="flex items-center gap-2 text-[11px] px-3 py-2 border border-white/20 hover:border-white/40 hover:bg-white/5 transition-colors"
          >
            <span className="text-white/60">←</span>
            <span>back to principal tree</span>
          </button>
        )}
      </div>

      {/* Bottom-right: metrics OR info panel */}
      {selectedInfo ? (
        <div
          className="absolute bottom-6 right-6 w-[360px] max-h-[calc(100vh-140px)] overflow-y-auto border border-white/15 bg-black/75 backdrop-blur-xl"
          style={{
            ...mono,
            boxShadow: `0 0 40px #${selectedNode.color.toString(16).padStart(6, "0")}22, 0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)`,
          }}
        >
          {/* Top accent bar */}
          <div className="h-[2px]" style={{
            background: `linear-gradient(90deg, transparent, #${selectedNode.color.toString(16).padStart(6, "0")}, transparent)`,
            boxShadow: `0 0 12px #${selectedNode.color.toString(16).padStart(6, "0")}`,
          }} />
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-[9px] tracking-[0.3em] text-white/50 uppercase px-1.5 py-0.5 border border-white/20">
                {selectedInfo.kind}
              </span>
              <span className="w-1.5 h-1.5 rounded-full" style={{
                background: `#${selectedNode.color.toString(16).padStart(6, "0")}`,
                boxShadow: `0 0 6px #${selectedNode.color.toString(16).padStart(6, "0")}`,
              }} />
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="text-white/50 hover:text-white text-lg leading-none w-6 h-6 flex items-center justify-center"
              aria-label="close"
            >×</button>
          </div>

          {/* Identity */}
          <div className="px-4 pt-3 pb-2">
            <div className="text-base font-bold leading-tight break-all">
              {selectedInfo.kind === "folder" ? selectedInfo.folder.name : selectedInfo.file.name}
            </div>
            {selectedInfo.kind === "file" && (
              <div className="text-[10px] text-white/50 mt-1 flex items-center gap-1.5">
                <span>▸</span>
                <span>{selectedInfo.file.folderName}</span>
              </div>
            )}
            {selectedInfo.kind === "folder" && (
              <div className="text-[10px] text-white/50 mt-1">
                {selectedInfo.folder.fileCount} files · {selectedInfo.totalImports} cross-folder imports
              </div>
            )}
          </div>

          {/* Description */}
          <div className="px-4 py-3 border-t border-white/10">
            <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mb-2">description</div>
            <div className="text-[11px] text-white/80 leading-relaxed">
              {selectedInfo.description}
            </div>
          </div>

          {/* Metrics */}
          <div className="px-4 py-3 border-t border-white/10">
            <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mb-2">metrics</div>
            <div className="space-y-1 text-[11px]">
              {selectedInfo.kind === "file" ? (
                <>
                  <Row label="lines_of_code" value={selectedInfo.loc} />
                  <Row label="degree" value={selectedInfo.imports.length + selectedInfo.importedBy.length} />
                  <Row label="imports_out" value={selectedInfo.imports.length} />
                  <Row label="imports_in" value={selectedInfo.importedBy.length} />
                </>
              ) : (
                <>
                  <Row label="files" value={selectedInfo.folder.fileCount} />
                  <Row label="neighbor_folders" value={selectedInfo.neighbors.length} />
                  <Row label="cross_folder_imports" value={selectedInfo.totalImports} />
                </>
              )}
            </div>
          </div>

          {/* Relationships */}
          {selectedInfo.kind === "file" && (
            <>
              <RelList
                title={`imports · ${selectedInfo.imports.length}`}
                items={selectedInfo.imports}
                emptyMsg="no outgoing imports"
                onItemClick={(item) => {
                  const local = findLocalIdx(item.file.id);
                  if (local !== null) setSelectedId(local);
                }}
                findLocal={(item) => findLocalIdx(item.file.id)}
              />
              <RelList
                title={`imported by · ${selectedInfo.importedBy.length}`}
                items={selectedInfo.importedBy}
                emptyMsg="no incoming imports"
                onItemClick={(item) => {
                  const local = findLocalIdx(item.file.id);
                  if (local !== null) setSelectedId(local);
                }}
                findLocal={(item) => findLocalIdx(item.file.id)}
              />
            </>
          )}

          {selectedInfo.kind === "folder" && (
            <>
              <div className="px-4 py-3 border-t border-white/10">
                <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mb-2">
                  connected folders · {selectedInfo.neighbors.length}
                </div>
                <div className="space-y-1">
                  {selectedInfo.neighbors.length === 0 && (
                    <div className="text-[10px] text-white/30 italic">no cross-folder imports</div>
                  )}
                  {selectedInfo.neighbors.map((n, i) => {
                    const local = findFolderLocalIdx(n.folder.id);
                    const clickable = local !== null && inRoot;
                    return (
                      <button
                        key={i}
                        disabled={!clickable}
                        onClick={() => clickable && setSelectedId(local)}
                        className={`w-full flex items-center gap-2 text-[11px] px-2 py-1 border ${
                          clickable ? "border-white/10 hover:border-white/30 hover:bg-white/5 cursor-pointer" : "border-white/5 opacity-60 cursor-default"
                        } transition-colors text-left`}
                      >
                        <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                          background: `#${n.folder.color.toString(16).padStart(6, "0")}`,
                          boxShadow: `0 0 6px #${n.folder.color.toString(16).padStart(6, "0")}`,
                        }} />
                        <span className="text-white/80 flex-1">{n.folder.name}</span>
                        <span className="text-white/40 tabular-nums">{n.weight}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-4 py-3 border-t border-white/10">
                <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mb-2">
                  files · {selectedInfo.folder.files.length}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {selectedInfo.folder.files.map((f) => (
                    <div key={f.id} className="text-[10px] text-white/70 truncate px-1">
                      {f.name}
                    </div>
                  ))}
                </div>
              </div>

              {inRoot && (
                <div className="px-4 py-3 border-t border-white/10">
                  <button
                    onClick={() => setView(selectedInfo.folder.name)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-white/30 hover:border-white hover:bg-white/10 transition-colors text-[11px] font-medium tracking-wider uppercase"
                  >
                    <span>enter folder</span>
                    <span className="text-white/60">→</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="absolute bottom-6 right-6 pointer-events-none text-right">
          <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">
            {inRoot ? "folder graph" : "file graph"}
          </div>
          <div className="space-y-1 text-[11px] mb-4">
            <Row label="nodes" value={stats.nodes.toString().padStart(4, "0")} />
            <Row label="edges" value={stats.edges.toString().padStart(4, "0")} />
            <Row label="avg_deg" value={stats.avgDeg} />
          </div>

          <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">convex hull</div>
          <div className="space-y-1 text-[11px] mb-4">
            <Row label="faces" value={stats.faces.toString().padStart(4, "0")} />
            <Row label="volume" value={stats.volume.toLocaleString()} />
          </div>

          <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">eigenvalues</div>
          <div className="space-y-1 text-[11px] mb-4">
            {stats.eigen.map((v, i) => (
              <div key={i} className="flex items-center justify-end gap-2">
                <span className="text-white/40">λ{i+1}</span>
                <span className="tabular-nums" style={{ color: ["#ffe066","#4ecdc4","#ff6bc7"][i] }}>{v.toFixed(2)}</span>
                <span className="text-white/30 tabular-nums text-[10px]">({((v / varianceTotal) * 100).toFixed(1)}%)</span>
              </div>
            ))}
          </div>

          <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-2">cov(X) ∈ ℝ³ˣ³</div>
          <div className="inline-block border border-white/15 bg-black/30 p-2">
            <table className="text-[10px] tabular-nums">
              <tbody>
                {stats.cov.map((row, i) => (
                  <tr key={i}>
                    {row.map((v, j) => (
                      <td key={j} className="px-1.5 py-0.5" style={{ color: i === j ? "#ffe066" : "rgba(255,255,255,0.7)" }}>
                        {v.toFixed(1).padStart(6, " ")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Tick className="top-3 left-3" />
      <Tick className="top-3 right-3 rotate-90" />
      <Tick className="bottom-3 left-3 -rotate-90" />
      <Tick className="bottom-3 right-3 rotate-180" />

      {hovered && (
        <div ref={tooltipRef} className="pointer-events-none fixed z-20 px-3 py-2 border border-white/20 bg-black/85 backdrop-blur-md"
          style={{
            left: hovered.x + 14,
            top: hovered.y + 14,
            boxShadow: `0 0 24px #${hovered.color.toString(16).padStart(6, "0")}33, 0 8px 32px rgba(0,0,0,0.6)`,
            ...mono,
          }}>
          {hovered.isFolder ? (
            <>
              <div className="text-[11px] font-medium tracking-wide">{hovered.name}</div>
              <div className="text-[10px] text-white/50 mt-0.5">folder · {hovered.fileCount} files</div>
              <div className="text-[10px] text-white/40 mt-1">imports · {hovered.weightSum || 0}</div>
              <div className="text-[10px] text-white/60 mt-1.5">↵ click to inspect</div>
            </>
          ) : (
            <>
              <div className="text-[11px] font-medium tracking-wide">{hovered.name}</div>
              <div className="text-[10px] text-white/50 mt-0.5">{hovered.folderName}</div>
              <div className="text-[10px] text-white/40 mt-1">degree · {hovered.degree}</div>
            </>
          )}
          <div className="h-[2px] mt-1.5" style={{
            background: `linear-gradient(90deg, transparent, #${hovered.color.toString(16).padStart(6, "0")}, transparent)`,
            boxShadow: `0 0 8px #${hovered.color.toString(16).padStart(6, "0")}`,
          }} />
        </div>
      )}
    </div>
  );
}

function Tick({ className = "" }) {
  return <div className={`corner-mark ${className}`} />;
}

function Row({ label, value }) {
  return (
    <div>
      <span className="text-white/40">{label} </span>
      <span className="text-white font-medium tabular-nums">{value}</span>
    </div>
  );
}

function Toggle({ active, onClick, label, swatch }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-2.5 py-1.5 border text-[11px] transition-all backdrop-blur-sm ${
        active
          ? "border-white/35 bg-white/[0.05] text-white"
          : "border-white/10 bg-black/20 text-white/40 hover:text-white/60 hover:border-white/20"
      }`}
      style={active ? { boxShadow: `0 0 12px ${swatch}22, inset 0 0 20px ${swatch}08` } : undefined}
    >
      <span className="w-1.5 h-1.5 rounded-full transition-all" style={{
        background: active ? swatch : "transparent",
        border: active ? "none" : "1px solid rgba(255,255,255,0.3)",
        boxShadow: active ? `0 0 8px ${swatch}` : "none",
      }} />
      <span>{label}</span>
    </button>
  );
}

function RelList({ title, items, emptyMsg, onItemClick, findLocal }) {
  return (
    <div className="px-4 py-3 border-t border-white/10">
      <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mb-2">{title}</div>
      <div className="space-y-1">
        {items.length === 0 && (
          <div className="text-[10px] text-white/30 italic">{emptyMsg}</div>
        )}
        {items.map((item, i) => {
          const clickable = findLocal(item) !== null;
          const hex = `#${item.folder.color.toString(16).padStart(6, "0")}`;
          return (
            <button
              key={i}
              disabled={!clickable}
              onClick={() => onItemClick(item)}
              className={`w-full flex items-center gap-2 text-[11px] px-2 py-1 border ${
                clickable
                  ? "border-white/10 hover:border-white/30 hover:bg-white/5 cursor-pointer"
                  : "border-white/5 opacity-60 cursor-default"
              } transition-colors text-left`}
              title={clickable ? "click to select" : `in ${item.folder.name} — not in current view`}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                background: hex, boxShadow: `0 0 6px ${hex}`,
              }} />
              <span className="text-white/85 flex-1 truncate">{item.file.name}</span>
              <span className="text-[9px] text-white/40 tracking-wide">{item.folder.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
