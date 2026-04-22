import { Row } from "@/components/ui/Row";

export function StatsPanel({ inRoot, stats }) {
  const varianceTotal = stats.eigen.reduce((a, b) => a + b, 0) || 1;
  return (
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
  );
}
