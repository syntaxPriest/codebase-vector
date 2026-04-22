export function Toggle({ active, onClick, label, swatch }) {
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
