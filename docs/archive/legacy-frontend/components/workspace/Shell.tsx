"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getFileDescription, getFolderDescription, getLoc } from "@/lib/codebase/constants";
import { useVisualizer, type SceneRefs } from "@/hooks/useVisualizer";
import { useCodebase } from "@/hooks/useCodebase";
import { useLayoutAsync } from "@/hooks/useLayoutAsync";
import { useRecentRepos } from "@/hooks/useRecentRepos";
import { useSessionBridge } from "@/hooks/useSessionBridge";
import { useFileActions } from "@/hooks/useFileActions";
import { applyFilter, hasTestFolders } from "@/lib/codebase/filter";
import { PairChip } from "./PairChip";
import { PROTOCOL_VERSION } from "@/lib/session/protocol";
import { RepoHeader } from "./RepoHeader";
import { TopBar } from "@/components/panels/TopBar";
import { ControlsHint } from "@/components/panels/ControlsHint";
import { Overlays } from "@/components/panels/Overlays";
import { FoldersList } from "@/components/panels/FoldersList";
import { InfoPanel, type SelectedInfo } from "@/components/panels/InfoPanel";
import { StatsPanel } from "@/components/panels/StatsPanel";
import { TreeStats } from "@/components/panels/TreeStats";
import { Tooltip } from "@/components/panels/Tooltip";
import { TruncationNotice } from "@/components/panels/TruncationNotice";
import { TreeView } from "@/components/tree/TreeView";
import { MatrixView } from "@/components/views/MatrixView";
import { TreemapView } from "@/components/views/TreemapView";
import { ReadmeView } from "@/components/views/ReadmeView";
import { CommandPalette } from "./CommandPalette";
import { AskPanel } from "./AskPanel";
import { ContextTray } from "./ContextTray";
import { ContextMenuProvider } from "@/components/ui/ContextMenu";
import type {
  Codebase,
  HoveredItem,
  IngestProgress,
  Repo,
  Selection,
  Stats,
  ViewMode,
} from "@/lib/codebase/types";

const VALID_MODES = new Set<ViewMode>(["vector", "tree", "matrix", "treemap", "readme"]);

interface ShellProps {
  repo: Repo;
}

export function Shell({ repo }: ShellProps) {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-white" />}>
      <ShellInner repo={repo} />
    </Suspense>
  );
}

function ShellInner({ repo }: ShellProps) {
  const { codebase, loading, error, progress } = useCodebase(repo);
  if (loading) return <LoadingState repo={repo} progress={progress} />;
  if (error)   return <ErrorState repo={repo} error={error} />;
  if (!codebase) return null;
  if (codebase.allFiles.length === 0) return <EmptyCodebaseState repo={repo} />;
  // ContextMenuProvider must wrap Workspace so useFileActions inside
  // Workspace can read the provider's api via useContextMenu.
  return (
    <ContextMenuProvider>
      <Workspace repo={repo} codebase={codebase} />
    </ContextMenuProvider>
  );
}

function stageLabel(progress: IngestProgress | null): string {
  if (!progress) return "fetching";
  switch (progress.stage) {
    case "connecting":  return "connecting";
    case "resolving":   return "resolving default branch";
    case "resolved":    return progress.sha ? `resolved · ${String(progress.sha).slice(0, 7)}` : "resolved";
    case "cached":      return "cached · ready";
    case "downloading": return "downloading tarball";
    case "extracting":  return "extracting archive";
    case "parsing":     return progress.total
      ? `parsing · ${progress.current}/${progress.total}`
      : "parsing";
    case "building":    return "building graph";
    case "done":        return "done";
    default:            return progress.stage;
  }
}

function LoadingState({ repo, progress }: { repo: Repo; progress: IngestProgress | null }) {
  const headline = repo.kind === "demo"
    ? "preparing demo"
    : `${repo.owner}/${repo.repo}`;
  const stage = repo.kind === "github" ? stageLabel(progress) : null;

  return (
    <div className="w-full h-screen flex items-center justify-center bg-white">
      <div className="text-center min-w-[280px]">
        <Loader2 className="animate-spin mx-auto mb-3 text-neutral-400" size={18} strokeWidth={1.5} />
        <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase font-mono mb-1">
          {headline}
        </div>
        {stage && (
          <div className="text-[11px] text-neutral-500 font-mono">
            {stage}
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorState({ repo, error }: { repo: Repo; error: string }) {
  const slug = repo.kind === "github" ? `${repo.owner}/${repo.repo}` : "this codebase";
  return (
    <div className="w-full h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-md text-center">
        <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-2 font-mono">
          could not load · {slug}
        </div>
        <p className="text-sm text-neutral-700 mb-6 font-mono break-all">{error}</p>
        <Link href="/" className="text-[12px] text-neutral-900 underline-offset-4 underline hover:text-black">
          ← back to start
        </Link>
      </div>
    </div>
  );
}

function EmptyCodebaseState({ repo }: { repo: Repo }) {
  const slug = repo.kind === "github" ? `${repo.owner}/${repo.repo}` : "this codebase";
  return (
    <div className="w-full h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-md text-center">
        <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-2 font-mono">
          nothing to render · {slug}
        </div>
        <p className="text-sm text-neutral-700 mb-1">
          We couldn&apos;t find any text files in this repository.
        </p>
        <p className="text-[12px] text-neutral-500 mb-6">
          Binary archives, lock files, and ignored directories are skipped. Everything else should appear.
        </p>
        <Link href="/" className="text-[12px] text-neutral-900 underline-offset-4 underline hover:text-black">
          ← back to start
        </Link>
      </div>
    </div>
  );
}

// Mode is mirrored to ?mode=…  (vector is the default and not encoded).
function useUrlMode(): [ViewMode, (next: ViewMode) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("mode") as ViewMode | null;
  const mode: ViewMode = raw && VALID_MODES.has(raw) ? raw : "vector";

  const setMode = (next: ViewMode) => {
    const sp = new URLSearchParams(params.toString());
    if (next === "vector") sp.delete("mode");
    else sp.set("mode", next);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return [mode, setMode];
}

function codebaseFiles(c: Codebase) { return c.allFiles; }

function Workspace({ repo, codebase: rawCodebase }: { repo: Repo; codebase: Codebase }) {
  const { add: rememberRepo } = useRecentRepos();
  useEffect(() => {
    if (repo.kind === "github") rememberRepo(repo);
  }, [repo, rememberRepo]);

  const bridge = useSessionBridge();

  // Path → file id index for translating between bridge messages and
  // the workspace's selection model. Recomputed only when the codebase
  // changes (filter toggles etc).
  const pathIndex = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of codebaseFiles(rawCodebase)) {
      if (f.path) map.set(f.path, f.id);
    }
    return map;
  }, [rawCodebase]);

  const [mode, setMode] = useUrlMode();
  const [view, setView] = useState("root");
  const [hideTests, setHideTests] = useState(false);
  const hasTests = useMemo(() => hasTestFolders(rawCodebase), [rawCodebase]);
  const codebase = useMemo(
    () => applyFilter(rawCodebase, { hideTests }),
    [rawCodebase, hideTests],
  );

  const [hovered, setHovered] = useState<HoveredItem | null>(null);
  const [stats, setStats] = useState<Stats>({
    nodes: 0, edges: 0, avgDeg: "0.00", faces: 0, volume: 0,
    cov: [[0,0,0],[0,0,0],[0,0,0]], eigen: [0,0,0], center: [0,0,0],
  });
  const [showHull, setShowHull] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [showCentroid, setShowCentroid] = useState(true);
  const [showEdges, setShowEdges] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const [selected, setSelected] = useState<Selection | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [askPrefill, setAskPrefill] = useState<string | null>(null);
  const [contextPaths, setContextPaths] = useState<Set<string>>(new Set());

  const openAskWith = useCallback((query?: string) => {
    setAskPrefill(query ?? null);
    setAskOpen(true);
  }, []);

  const consumeAskPrefill = useCallback(() => {
    setAskPrefill(null);
  }, []);

  const addPathsToContext = useCallback((paths: string[]) => {
    setContextPaths((prev) => {
      const next = new Set(prev);
      for (const p of paths) next.add(p);
      return next;
    });
  }, []);

  const addContextPath = useCallback((path: string) => {
    setContextPaths((prev) => {
      if (prev.has(path)) return prev;
      const next = new Set(prev);
      next.add(path);
      return next;
    });
  }, []);

  const removeContextPath = useCallback((path: string) => {
    setContextPaths((prev) => {
      if (!prev.has(path)) return prev;
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  }, []);

  const clearContext = useCallback(() => setContextPaths(new Set()), []);

  // Stable membership check — re-fires only when the underlying set
  // mutates, not on every parent render. This keeps the file-actions
  // menu items stable across renders (which in turn keeps the view
  // components' onContextMenu prop stable).
  const isInContext = useCallback(
    (path: string) => contextPaths.has(path),
    [contextPaths],
  );

  // Wrap bridge scalars in a stable object so useFileActions's option
  // deps don't churn — bridge.send is already memoised in the hook.
  const fileActionBridge = useMemo(
    () => ({ paired: bridge.paired, send: bridge.send }),
    [bridge.paired, bridge.send],
  );

  const fileActions = useFileActions({
    repo,
    bridge: fileActionBridge,
    isInContext,
    addToContext: addPathsToContext,
    removeFromContext: removeContextPath,
    onAsk: openAskWith,
  });

  const selectedRef = useRef<Selection | null>(null);
  selectedRef.current = selected;
  const paletteOpenRef = useRef<boolean>(false);
  paletteOpenRef.current = paletteOpen;
  const askOpenRef = useRef<boolean>(false);
  askOpenRef.current = askOpen;

  const mountRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const sceneRef: MutableRefObject<SceneRefs> = useRef<SceneRefs>({});

  const viewRef = useRef(view);
  viewRef.current = view;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const isVector  = mode === "vector";
  const isTree    = mode === "tree";
  const isMatrix  = mode === "matrix";
  const isTreemap = mode === "treemap";
  const isReadme  = mode === "readme";
  const hasReadme = !!codebase.readme;

  const pausedRef = useRef(false);
  pausedRef.current = !isVector;

  const { graph, progress } = useLayoutAsync(codebase, view);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        setAskOpen(true);
        return;
      }
      if (e.key === "Escape") {
        if (paletteOpenRef.current || askOpenRef.current) return;
        if (selectedRef.current !== null) setSelected(null);
        else if (modeRef.current === "vector" && viewRef.current !== "root") setView("root");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { setSelected(null); }, [view, mode]);

  // Inbound mirror: when the editor announces an active file or
  // selection, light up the matching node in the workspace.
  // Messages arrive via subscription (not React state), so the
  // editor's high-frequency selection events don't re-render us —
  // the handler reads/writes refs and only calls setSelected when the
  // selected file actually changes.
  const inboundOriginRef = useRef(false);
  useEffect(() => {
    return bridge.subscribe((msg) => {
      if (msg.type !== "open-file" && msg.type !== "selection") return;
      const id = pathIndex.get(msg.path);
      if (id === undefined) return;
      const cur = selectedRef.current;
      if (cur?.kind === "file" && cur.id === id) return;
      inboundOriginRef.current = true;
      setSelected({ kind: "file", id });
    });
  }, [bridge.subscribe, pathIndex]);

  // Outbound: announce repo identity once we're paired so the editor
  // knows the context this workspace tab is anchored to. Deps are the
  // *scalar* bridge fields, not the bridge object — otherwise a ping
  // (or any unrelated re-render) would re-send this message.
  useEffect(() => {
    if (!bridge.paired) return;
    if (repo.kind !== "github") return;
    bridge.send({
      v: PROTOCOL_VERSION,
      type: "repo",
      owner: repo.owner,
      repo: repo.repo,
      sha: repo.sha,
    });
  }, [bridge.paired, bridge.send, repo]);

  // Outbound mirror: when the workspace user picks a file, ask the
  // editor to focus it. Skip if the selection itself originated from
  // an inbound bridge message (otherwise we ping-pong forever).
  useEffect(() => {
    if (!bridge.paired) return;
    if (!selected || selected.kind !== "file") return;
    if (inboundOriginRef.current) {
      inboundOriginRef.current = false;
      return;
    }
    const file = rawCodebase.allFiles[selected.id];
    if (!file?.path) return;
    bridge.send({
      v: PROTOCOL_VERSION,
      type: "open-file",
      path: file.path,
    });
  }, [bridge.paired, bridge.send, selected, rawCodebase]);

  useEffect(() => {
    if (!selected) return;
    const list = selected.kind === "folder" ? codebase.folders : codebase.allFiles;
    if (!list[selected.id]) setSelected(null);
  }, [codebase, selected]);

  useVisualizer({
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
  });

  useEffect(() => { if (sceneRef.current.hullGroup) sceneRef.current.hullGroup.visible = showHull; }, [showHull, graph]);
  useEffect(() => { if (sceneRef.current.axesGroup) sceneRef.current.axesGroup.visible = showAxes; }, [showAxes, graph]);
  useEffect(() => { if (sceneRef.current.centroidGroup) sceneRef.current.centroidGroup.visible = showCentroid; }, [showCentroid, graph]);
  useEffect(() => { if (sceneRef.current.edgeLines) sceneRef.current.edgeLines.visible = showEdges; }, [showEdges, graph]);
  useEffect(() => { if (sceneRef.current.labelsGroup) sceneRef.current.labelsGroup.visible = showLabels; }, [showLabels, graph]);

  const inRoot = view === "root";

  const selectedInfo: SelectedInfo | null = useMemo(() => {
    if (!selected) return null;

    if (selected.kind === "folder") {
      const folder = codebase.folders[selected.id];
      if (!folder) return null;
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

    const file = codebase.allFiles[selected.id];
    if (!file) return null;
    const toInfo = (id: number) => {
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
      loc: getLoc(file),
    };
  }, [selected, codebase]);

  const selectedColor = selectedInfo
    ? (selectedInfo.kind === "folder" ? selectedInfo.folder.color : selectedInfo.file.color)
    : null;

  const handleFoldersListSelect = (name: string) => {
    if (mode === "vector") {
      setView(name);
    } else {
      const folder = codebase.folders.find((f) => f.name === name);
      if (folder) setSelected({ kind: "folder", id: folder.id });
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-white text-neutral-900">
      <div
        ref={mountRef}
        className="absolute inset-0"
        style={{
          cursor: "grab",
          display: isVector ? "block" : "none",
        }}
        onContextMenu={(e) => {
          if (!hovered) return;
          if (hovered.isFolder) {
            const folder = codebase.folders.find((f) => f.name === hovered.folderName);
            if (folder) fileActions.openFolderMenu(e, folder);
          } else {
            const file = codebase.allFiles.find(
              (f) => f.name === hovered.name && f.folderName === hovered.folderName,
            );
            if (file) fileActions.openFileMenu(e, file);
          }
        }}
      />

      {isTree && (
        <TreeView
          codebase={codebase}
          selected={selected}
          onSelect={setSelected}
          onHover={setHovered}
          showEdges={showEdges}
          showLabels={showLabels}
          onFileContextMenu={fileActions.openFileMenu}
          onFolderContextMenu={fileActions.openFolderMenu}
        />
      )}

      {isMatrix && (
        <MatrixView
          codebase={codebase}
          selected={selected}
          onSelect={setSelected}
          onHover={setHovered}
          onFolderContextMenu={fileActions.openFolderMenu}
        />
      )}

      {isTreemap && (
        <TreemapView
          codebase={codebase}
          selected={selected}
          onSelect={setSelected}
          onHover={setHovered}
          onFileContextMenu={fileActions.openFileMenu}
          onFolderContextMenu={fileActions.openFolderMenu}
        />
      )}

      {isReadme && (
        <ReadmeView
          codebase={codebase}
          repo={repo}
          onAsk={openAskWith}
          bridgeSend={bridge.connected ? bridge.send : null}
        />
      )}

      <RepoHeader repo={repo} codebase={codebase} view={view} inRoot={inRoot} mode={mode} />
      <TruncationNotice truncated={codebase.truncated} />
      <div className="absolute top-6 right-[200px] z-10">
        <PairChip
          configured={bridge.configured}
          connected={bridge.connected}
          paired={bridge.paired}
          editorName={bridge.editorName}
          sessionId={bridge.sessionId}
          port={bridge.port}
          mode={bridge.mode}
          onPair={bridge.pair}
          onUnpair={bridge.unpair}
        />
      </div>
      <TopBar
        view={view}
        inRoot={inRoot}
        onRoot={() => setView("root")}
        mode={mode}
        setMode={setMode}
        hasReadme={hasReadme}
        onOpenAsk={() => openAskWith()}
        askDisabled={false}
      />
      <ControlsHint selectedId={selected} inRoot={inRoot} mode={mode} />

      {(isVector || isTree) && (
        <Overlays
          mode={mode}
          inRoot={inRoot}
          showHull={showHull} setShowHull={setShowHull}
          showAxes={showAxes} setShowAxes={setShowAxes}
          showCentroid={showCentroid} setShowCentroid={setShowCentroid}
          showEdges={showEdges} setShowEdges={setShowEdges}
          showLabels={showLabels} setShowLabels={setShowLabels}
          hasTests={hasTests}
          hideTests={hideTests}
          setHideTests={setHideTests}
        />
      )}

      {(isVector || isTree) && (
        <FoldersList
          inRoot={inRoot}
          mode={mode}
          folders={codebase.folders}
          onSelect={handleFoldersListSelect}
          onBack={() => setView("root")}
        />
      )}

      {!isReadme && (selectedInfo && selectedColor !== null ? (
        <InfoPanel
          selectedInfo={selectedInfo}
          selectedColor={selectedColor}
          inRoot={inRoot}
          mode={mode}
          onClose={() => setSelected(null)}
          onSelect={setSelected}
          onEnterFolder={(name) => setView(name)}
          inContext={selectedInfo.kind === "file"
            ? contextPaths.has(selectedInfo.file.path ?? selectedInfo.file.name)
            : false}
          onToggleContext={selectedInfo.kind === "file" ? () => {
            const path = selectedInfo.file.path ?? selectedInfo.file.name;
            if (contextPaths.has(path)) removeContextPath(path);
            else addContextPath(path);
          } : undefined}
          fileActions={{
            bridgePaired: bridge.paired,
            openInEditor: fileActions.openInEditor,
            sendToAgent: fileActions.sendToAgent,
          }}
        />
      ) : isVector ? (
        <StatsPanel inRoot={inRoot} stats={stats} />
      ) : (
        <TreeStats codebase={codebase} />
      ))}

      {fileActions.toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-3 py-2 bg-neutral-900 text-white text-[11px] font-mono"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}
          role="status"
          aria-live="polite"
        >
          {fileActions.toast}
        </div>
      )}

      <Tooltip ref={tooltipRef} hovered={hovered} />

      {isVector && progress < 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none text-[10px] tracking-[0.2em] text-neutral-400 uppercase font-mono">
          computing layout · {Math.round(progress * 100)}%
        </div>
      )}

      <CommandPalette
        codebase={codebase}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={setSelected}
      />

      <AskPanel
        codebase={codebase}
        repo={repo}
        open={askOpen}
        onClose={() => setAskOpen(false)}
        onSelect={setSelected}
        prefill={askPrefill}
        onPrefillConsumed={consumeAskPrefill}
        onAddPathsToContext={addPathsToContext}
      />

      <ContextTray
        paths={[...contextPaths]}
        onRemove={removeContextPath}
        onClear={clearContext}
      />
    </div>
  );
}
