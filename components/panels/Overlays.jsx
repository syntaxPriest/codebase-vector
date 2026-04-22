import { Toggle } from "@/components/ui/Toggle";

export function Overlays({
  inRoot,
  showHull, setShowHull,
  showAxes, setShowAxes,
  showCentroid, setShowCentroid,
  showEdges, setShowEdges,
  showLabels, setShowLabels,
}) {
  return (
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
  );
}
