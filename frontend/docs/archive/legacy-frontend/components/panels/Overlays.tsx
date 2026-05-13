import { Toggle } from "@/components/ui/Toggle";
import type { ViewMode } from "@/lib/codebase/types";

interface OverlaysProps {
  mode: ViewMode;
  inRoot: boolean;
  showHull: boolean;     setShowHull: (v: boolean) => void;
  showAxes: boolean;     setShowAxes: (v: boolean) => void;
  showCentroid: boolean; setShowCentroid: (v: boolean) => void;
  showEdges: boolean;    setShowEdges: (v: boolean) => void;
  showLabels: boolean;   setShowLabels: (v: boolean) => void;
  hasTests: boolean;
  hideTests: boolean;
  setHideTests: (v: boolean) => void;
}

export function Overlays({
  mode,
  inRoot,
  showHull, setShowHull,
  showAxes, setShowAxes,
  showCentroid, setShowCentroid,
  showEdges, setShowEdges,
  showLabels, setShowLabels,
  hasTests, hideTests, setHideTests,
}: OverlaysProps) {
  const inTree = mode === "tree";
  const edgeLabel = inTree
    ? "hierarchy edges"
    : inRoot
      ? "aggregated imports"
      : "import edges";

  return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2">
      <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-3 font-mono">overlays</div>
      <div className="space-y-1.5">
        {!inTree && (
          <>
            <Toggle active={showHull} onClick={() => setShowHull(!showHull)} label="convex hull" />
            <Toggle active={showAxes} onClick={() => setShowAxes(!showAxes)} label="principal axes" />
            <Toggle active={showCentroid} onClick={() => setShowCentroid(!showCentroid)} label="centroid (μ)" />
          </>
        )}
        <Toggle active={showEdges} onClick={() => setShowEdges(!showEdges)} label={edgeLabel} />
        <Toggle active={showLabels} onClick={() => setShowLabels(!showLabels)} label="node labels" />
        {hasTests && (
          <Toggle
            active={!hideTests}
            onClick={() => setHideTests(!hideTests)}
            label="include tests"
          />
        )}
      </div>
    </div>
  );
}
