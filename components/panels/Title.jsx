export function Title({ view, inRoot }) {
  return (
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
  );
}
