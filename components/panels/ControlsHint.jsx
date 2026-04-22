export function ControlsHint({ selectedId, inRoot }) {
  return (
    <div className="absolute top-6 right-6 pointer-events-none text-right">
      <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-2">controls</div>
      <div className="text-[11px] text-white/60 space-y-0.5">
        <div>drag · rotate</div>
        <div>scroll · zoom</div>
        <div>click · inspect</div>
        <div>esc · {selectedId !== null ? "clear selection" : inRoot ? "—" : "back to root"}</div>
      </div>
    </div>
  );
}
