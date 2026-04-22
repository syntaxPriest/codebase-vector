export function Breadcrumb({ view, inRoot, onRoot }) {
  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-2 text-[11px] px-4 py-2 border border-white/15 bg-white/[0.03] backdrop-blur-md" style={{
        boxShadow: "0 0 24px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}>
        <button
          onClick={onRoot}
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
  );
}
