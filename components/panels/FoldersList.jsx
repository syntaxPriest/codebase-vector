export function FoldersList({ inRoot, folders, onSelect, onBack }) {
  return (
    <div className="absolute bottom-6 left-6">
      {inRoot ? (
        <div className="pointer-events-none">
          <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">folders</div>
          <div className="space-y-1.5">
            {folders.map((m) => (
              <button
                key={m.name}
                onClick={() => onSelect(m.name)}
                className="flex items-center gap-2.5 text-[11px] pointer-events-auto hover:bg-white/5 px-1.5 py-0.5 -mx-1.5 transition-colors w-full text-left"
              >
                <span className="inline-block w-2 h-2 rounded-full" style={{
                  background: `#${m.color.toString(16).padStart(6, "0")}`,
                  boxShadow: `0 0 8px #${m.color.toString(16).padStart(6, "0")}`,
                }} />
                <span className="text-white/80">{m.name}</span>
                <span className="text-white/30 ml-1">{m.fileCount}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[11px] px-3 py-2 border border-white/20 hover:border-white/40 hover:bg-white/5 transition-colors"
        >
          <span className="text-white/60">←</span>
          <span>back to principal tree</span>
        </button>
      )}
    </div>
  );
}
