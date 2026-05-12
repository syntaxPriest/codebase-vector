import { Row } from "@/components/ui/Row";
import type { Stats } from "@/lib/codebase/types";

const AXIS_LABELS = ["text-neutral-900", "text-neutral-700", "text-neutral-500"] as const;

interface StatsPanelProps {
  inRoot: boolean;
  stats: Stats;
}

export function StatsPanel({ inRoot, stats }: StatsPanelProps) {
  const varianceTotal = stats.eigen.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="absolute bottom-6 right-6 pointer-events-none text-right">
      <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-3 font-mono">
        {inRoot ? "folder graph" : "file graph"}
      </div>
      <div className="space-y-1 text-[11px] mb-4 font-mono">
        <Row label="nodes" value={stats.nodes.toString().padStart(4, "0")} />
        <Row label="edges" value={stats.edges.toString().padStart(4, "0")} />
        <Row label="avg_deg" value={stats.avgDeg} />
      </div>

      <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-3 font-mono">convex hull</div>
      <div className="space-y-1 text-[11px] mb-4 font-mono">
        <Row label="faces" value={stats.faces.toString().padStart(4, "0")} />
        <Row label="volume" value={stats.volume.toLocaleString()} />
      </div>

      <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-3 font-mono">eigenvalues</div>
      <div className="space-y-1 text-[11px] mb-4 font-mono">
        {stats.eigen.map((v, i) => (
          <div key={i} className="flex items-center justify-end gap-2">
            <span className="text-neutral-400">λ{i+1}</span>
            <span className={`tabular-nums ${AXIS_LABELS[i] ?? "text-neutral-500"}`}>{v.toFixed(2)}</span>
            <span className="text-neutral-400 tabular-nums text-[10px]">({((v / varianceTotal) * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>

      <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-2 font-mono">cov(X) ∈ ℝ³ˣ³</div>
      <div className="inline-block border border-neutral-200 bg-white p-2">
        <table className="text-[10px] tabular-nums font-mono">
          <tbody>
            {stats.cov.map((row, i) => (
              <tr key={i}>
                {row.map((v, j) => (
                  <td
                    key={j}
                    className={`px-1.5 py-0.5 ${i === j ? "text-neutral-900 font-medium" : "text-neutral-500"}`}
                  >
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
