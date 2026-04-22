import { Row } from "@/components/ui/Row";
import { RelList } from "@/components/ui/RelList";

export function InfoPanel({
  selectedNode,
  selectedInfo,
  inRoot,
  mono,
  onClose,
  onSelectLocal,
  findLocalIdx,
  findFolderLocalIdx,
  onEnterFolder,
}) {
  const hex = selectedNode.color.toString(16).padStart(6, "0");
  return (
    <div
      className="absolute bottom-6 right-6 w-[360px] max-h-[calc(100vh-140px)] overflow-y-auto border border-white/15 bg-black/75 backdrop-blur-xl"
      style={{
        ...mono,
        boxShadow: `0 0 40px #${hex}22, 0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
    >
      <div className="h-[2px]" style={{
        background: `linear-gradient(90deg, transparent, #${hex}, transparent)`,
        boxShadow: `0 0 12px #${hex}`,
      }} />

      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-[9px] tracking-[0.3em] text-white/50 uppercase px-1.5 py-0.5 border border-white/20">
            {selectedInfo.kind}
          </span>
          <span className="w-1.5 h-1.5 rounded-full" style={{
            background: `#${hex}`,
            boxShadow: `0 0 6px #${hex}`,
          }} />
        </div>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white text-lg leading-none w-6 h-6 flex items-center justify-center"
          aria-label="close"
        >×</button>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="text-base font-bold leading-tight break-all">
          {selectedInfo.kind === "folder" ? selectedInfo.folder.name : selectedInfo.file.name}
        </div>
        {selectedInfo.kind === "file" && (
          <div className="text-[10px] text-white/50 mt-1 flex items-center gap-1.5">
            <span>▸</span>
            <span>{selectedInfo.file.folderName}</span>
          </div>
        )}
        {selectedInfo.kind === "folder" && (
          <div className="text-[10px] text-white/50 mt-1">
            {selectedInfo.folder.fileCount} files · {selectedInfo.totalImports} cross-folder imports
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-white/10">
        <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mb-2">description</div>
        <div className="text-[11px] text-white/80 leading-relaxed">
          {selectedInfo.description}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-white/10">
        <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mb-2">metrics</div>
        <div className="space-y-1 text-[11px]">
          {selectedInfo.kind === "file" ? (
            <>
              <Row label="lines_of_code" value={selectedInfo.loc} />
              <Row label="degree" value={selectedInfo.imports.length + selectedInfo.importedBy.length} />
              <Row label="imports_out" value={selectedInfo.imports.length} />
              <Row label="imports_in" value={selectedInfo.importedBy.length} />
            </>
          ) : (
            <>
              <Row label="files" value={selectedInfo.folder.fileCount} />
              <Row label="neighbor_folders" value={selectedInfo.neighbors.length} />
              <Row label="cross_folder_imports" value={selectedInfo.totalImports} />
            </>
          )}
        </div>
      </div>

      {selectedInfo.kind === "file" && (
        <>
          <RelList
            title={`imports · ${selectedInfo.imports.length}`}
            items={selectedInfo.imports}
            emptyMsg="no outgoing imports"
            onItemClick={(item) => {
              const local = findLocalIdx(item.file.id);
              if (local !== null) onSelectLocal(local);
            }}
            findLocal={(item) => findLocalIdx(item.file.id)}
          />
          <RelList
            title={`imported by · ${selectedInfo.importedBy.length}`}
            items={selectedInfo.importedBy}
            emptyMsg="no incoming imports"
            onItemClick={(item) => {
              const local = findLocalIdx(item.file.id);
              if (local !== null) onSelectLocal(local);
            }}
            findLocal={(item) => findLocalIdx(item.file.id)}
          />
        </>
      )}

      {selectedInfo.kind === "folder" && (
        <>
          <div className="px-4 py-3 border-t border-white/10">
            <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mb-2">
              connected folders · {selectedInfo.neighbors.length}
            </div>
            <div className="space-y-1">
              {selectedInfo.neighbors.length === 0 && (
                <div className="text-[10px] text-white/30 italic">no cross-folder imports</div>
              )}
              {selectedInfo.neighbors.map((n, i) => {
                const local = findFolderLocalIdx(n.folder.id);
                const clickable = local !== null && inRoot;
                return (
                  <button
                    key={i}
                    disabled={!clickable}
                    onClick={() => clickable && onSelectLocal(local)}
                    className={`w-full flex items-center gap-2 text-[11px] px-2 py-1 border ${
                      clickable ? "border-white/10 hover:border-white/30 hover:bg-white/5 cursor-pointer" : "border-white/5 opacity-60 cursor-default"
                    } transition-colors text-left`}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                      background: `#${n.folder.color.toString(16).padStart(6, "0")}`,
                      boxShadow: `0 0 6px #${n.folder.color.toString(16).padStart(6, "0")}`,
                    }} />
                    <span className="text-white/80 flex-1">{n.folder.name}</span>
                    <span className="text-white/40 tabular-nums">{n.weight}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-4 py-3 border-t border-white/10">
            <div className="text-[9px] tracking-[0.3em] text-white/40 uppercase mb-2">
              files · {selectedInfo.folder.files.length}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {selectedInfo.folder.files.map((f) => (
                <div key={f.id} className="text-[10px] text-white/70 truncate px-1">
                  {f.name}
                </div>
              ))}
            </div>
          </div>

          {inRoot && (
            <div className="px-4 py-3 border-t border-white/10">
              <button
                onClick={() => onEnterFolder(selectedInfo.folder.name)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-white/30 hover:border-white hover:bg-white/10 transition-colors text-[11px] font-medium tracking-wider uppercase"
              >
                <span>enter folder</span>
                <span className="text-white/60">→</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
