export function RelList({ title, items, emptyMsg, onItemClick, findLocal }) {
  return (
    <div className="px-4 py-3 border-t border-white/10">
      <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mb-2">{title}</div>
      <div className="space-y-1">
        {items.length === 0 && (
          <div className="text-[10px] text-white/30 italic">{emptyMsg}</div>
        )}
        {items.map((item, i) => {
          const clickable = findLocal(item) !== null;
          const hex = `#${item.folder.color.toString(16).padStart(6, "0")}`;
          return (
            <button
              key={i}
              disabled={!clickable}
              onClick={() => onItemClick(item)}
              className={`w-full flex items-center gap-2 text-[11px] px-2 py-1 border ${
                clickable
                  ? "border-white/10 hover:border-white/30 hover:bg-white/5 cursor-pointer"
                  : "border-white/5 opacity-60 cursor-default"
              } transition-colors text-left`}
              title={clickable ? "click to select" : `in ${item.folder.name} — not in current view`}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                background: hex, boxShadow: `0 0 6px ${hex}`,
              }} />
              <span className="text-white/85 flex-1 truncate">{item.file.name}</span>
              <span className="text-[9px] text-white/40 tracking-wide">{item.folder.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
