"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { generateCodebase, getGraph } from "@/lib/codebase/generator";
import { getFileDescription, getFolderDescription, pseudoLOC } from "@/lib/codebase/constants";
import { runForceLayout } from "@/lib/layout/forceLayout";
import { useVisualizer } from "@/hooks/useVisualizer";
import { Tick } from "@/components/ui/Tick";
import { Title } from "@/components/panels/Title";
import { Breadcrumb } from "@/components/panels/Breadcrumb";
import { ControlsHint } from "@/components/panels/ControlsHint";
import { Overlays } from "@/components/panels/Overlays";
import { FoldersList } from "@/components/panels/FoldersList";
import { InfoPanel } from "@/components/panels/InfoPanel";
import { StatsPanel } from "@/components/panels/StatsPanel";
import { Tooltip } from "@/components/panels/Tooltip";

const mono = {
  fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

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

  const graph = useMemo(() => {
    const key = view;
    if (graphCache.current.has(key)) return graphCache.current.get(key);
    const g = getGraph(codebase, view);
    runForceLayout(g.nodes, g.edges);
    graphCache.current.set(key, g);
    return g;
  }, [codebase, view]);

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

  useEffect(() => { setSelectedId(null); }, [view]);

  useVisualizer({
    mountRef,
    tooltipRef,
    graph,
    viewRef,
    selectedIdRef,
    sceneRef,
    setHovered,
    setSelectedId,
    setStats,
  });

  useEffect(() => { if (sceneRef.current.hullGroup) sceneRef.current.hullGroup.visible = showHull; }, [showHull, graph]);
  useEffect(() => { if (sceneRef.current.axesGroup) sceneRef.current.axesGroup.visible = showAxes; }, [showAxes, graph]);
  useEffect(() => { if (sceneRef.current.centroidGroup) sceneRef.current.centroidGroup.visible = showCentroid; }, [showCentroid, graph]);
  useEffect(() => { if (sceneRef.current.edgeLines) sceneRef.current.edgeLines.visible = showEdges; }, [showEdges, graph]);
  useEffect(() => { if (sceneRef.current.labelsGroup) sceneRef.current.labelsGroup.visible = showLabels; }, [showLabels, graph]);

  const inRoot = view === "root";

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

      <div className="pointer-events-none absolute inset-0" style={{
        background: "radial-gradient(ellipse 60% 50% at 15% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 85% 80%, rgba(236, 72, 153, 0.06) 0%, transparent 60%)",
      }} />

      <div className="pointer-events-none absolute inset-0" style={{
        background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.78) 100%)",
      }} />

      <div className="noise-overlay pointer-events-none absolute inset-0" />

      <Title view={view} inRoot={inRoot} />
      <Breadcrumb view={view} inRoot={inRoot} onRoot={() => setView("root")} />
      <ControlsHint selectedId={selectedId} inRoot={inRoot} />

      <Overlays
        inRoot={inRoot}
        showHull={showHull} setShowHull={setShowHull}
        showAxes={showAxes} setShowAxes={setShowAxes}
        showCentroid={showCentroid} setShowCentroid={setShowCentroid}
        showEdges={showEdges} setShowEdges={setShowEdges}
        showLabels={showLabels} setShowLabels={setShowLabels}
      />

      <FoldersList
        inRoot={inRoot}
        folders={codebase.folders}
        onSelect={setView}
        onBack={() => setView("root")}
      />

      {selectedInfo ? (
        <InfoPanel
          selectedNode={selectedNode}
          selectedInfo={selectedInfo}
          inRoot={inRoot}
          mono={mono}
          onClose={() => setSelectedId(null)}
          onSelectLocal={setSelectedId}
          findLocalIdx={findLocalIdx}
          findFolderLocalIdx={findFolderLocalIdx}
          onEnterFolder={setView}
        />
      ) : (
        <StatsPanel inRoot={inRoot} stats={stats} />
      )}

      <Tick className="top-3 left-3" />
      <Tick className="top-3 right-3 rotate-90" />
      <Tick className="bottom-3 left-3 -rotate-90" />
      <Tick className="bottom-3 right-3 rotate-180" />

      <Tooltip ref={tooltipRef} hovered={hovered} mono={mono} />
    </div>
  );
}
