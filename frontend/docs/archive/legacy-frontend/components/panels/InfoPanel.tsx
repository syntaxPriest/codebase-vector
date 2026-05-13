import {
  X,
  ChevronRight,
  ArrowRight,
  Plus,
  Check,
  ExternalLink,
  Send,
  Terminal,
  Wand,
} from "lucide-react";
import { Row } from "@/components/ui/Row";
import { RelList, type RelItem } from "@/components/ui/RelList";
import { toHex } from "@/lib/codebase/colors";
import type {
  CodebaseFile,
  Folder,
  Selection,
  ViewMode,
} from "@/lib/codebase/types";

export type InfoPanelAgentTarget = "claude-code" | "cursor" | "codex" | "copy";

export interface InfoPanelFileActions {
  bridgePaired: boolean;
  openInEditor: (file: CodebaseFile) => void;
  sendToAgent: (target: InfoPanelAgentTarget, file: CodebaseFile) => void;
}

interface FolderInfo {
  kind: "folder";
  folder: Folder;
  description: string;
  neighbors: Array<{ folder: Folder; weight: number }>;
  totalImports: number;
}

interface FileInfo {
  kind: "file";
  file: CodebaseFile;
  description: string;
  imports: RelItem[];
  importedBy: RelItem[];
  loc: number;
}

export type SelectedInfo = FolderInfo | FileInfo;

interface InfoPanelProps {
  selectedInfo: SelectedInfo;
  selectedColor: number;
  inRoot: boolean;
  mode: ViewMode;
  onClose: () => void;
  onSelect: (s: Selection) => void;
  onEnterFolder: (name: string) => void;
  inContext?: boolean;
  onToggleContext?: () => void;
  fileActions?: InfoPanelFileActions;
}

export function InfoPanel({
  selectedInfo,
  selectedColor,
  inRoot,
  mode,
  onClose,
  onSelect,
  onEnterFolder,
  inContext = false,
  onToggleContext,
  fileActions,
}: InfoPanelProps) {
  const hex = toHex(selectedColor);
  const showContextToggle = selectedInfo.kind === "file" && !!onToggleContext;

  return (
    <div className="absolute bottom-6 right-6 w-[360px] max-h-[calc(100vh-140px)] overflow-y-auto border border-neutral-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <span className="text-[9px] tracking-[0.2em] text-neutral-500 uppercase px-1.5 py-0.5 border border-neutral-200 font-mono">
            {selectedInfo.kind}
          </span>
          <span className="w-2 h-2 rounded-full" style={{ background: hex }} />
        </div>
        <div className="flex items-center gap-1">
          {showContextToggle && (
            <button
              onClick={onToggleContext}
              className={`flex items-center gap-1 text-[10px] tracking-wide font-mono px-1.5 py-0.5 border transition-colors ${
                inContext
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900"
              }`}
              title={inContext ? "remove from context" : "add to AI context"}
            >
              {inContext
                ? <Check size={10} strokeWidth={2} />
                : <Plus size={10} strokeWidth={2} />}
              <span>context</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 w-6 h-6 flex items-center justify-center transition-colors"
            aria-label="close"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="text-base font-semibold leading-tight break-all text-neutral-900">
          {selectedInfo.kind === "folder" ? selectedInfo.folder.name : selectedInfo.file.name}
        </div>
        {selectedInfo.kind === "file" && (
          <div className="text-[11px] text-neutral-500 mt-1 flex items-center gap-1">
            <ChevronRight size={11} strokeWidth={1.75} className="text-neutral-300" />
            <span>{selectedInfo.file.folderName}</span>
          </div>
        )}
        {selectedInfo.kind === "folder" && (
          <div className="text-[11px] text-neutral-500 mt-1 font-mono">
            {selectedInfo.folder.fileCount} files · {selectedInfo.totalImports} cross-folder imports
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-neutral-200">
        <div className="text-[9px] tracking-[0.2em] text-neutral-400 uppercase mb-2 font-mono">description</div>
        <div className="text-[12px] text-neutral-700 leading-relaxed">
          {selectedInfo.description}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-neutral-200">
        <div className="text-[9px] tracking-[0.2em] text-neutral-400 uppercase mb-2 font-mono">metrics</div>
        <div className="space-y-1 text-[11px] font-mono">
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

      {selectedInfo.kind === "file" && fileActions && (
        <div className="px-4 py-3 border-t border-neutral-200">
          <div className="text-[9px] tracking-[0.2em] text-neutral-400 uppercase mb-2 font-mono">
            actions
          </div>
          <button
            onClick={() => fileActions.openInEditor(selectedInfo.file)}
            disabled={!fileActions.bridgePaired}
            className="w-full flex items-center gap-2 px-2 py-1.5 mb-1 border border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50 text-[11px] text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={fileActions.bridgePaired ? "open in paired editor" : "pair an editor first"}
          >
            <ExternalLink size={12} strokeWidth={1.75} className="text-neutral-500 flex-shrink-0" />
            <span className="flex-1 text-neutral-800">Open in editor</span>
            {!fileActions.bridgePaired && (
              <span className="text-[9px] tracking-[0.15em] text-neutral-400 uppercase font-mono">pair first</span>
            )}
          </button>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => fileActions.sendToAgent("claude-code", selectedInfo.file)}
              className="flex flex-col items-center gap-1 px-2 py-2 border border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
              title={fileActions.bridgePaired ? "send to Claude Code via paired editor" : "copy claude command"}
            >
              <Terminal size={12} strokeWidth={1.75} className="text-neutral-500" />
              <span className="text-[10px] text-neutral-700 leading-none">Claude</span>
            </button>
            <button
              onClick={() => fileActions.sendToAgent("cursor", selectedInfo.file)}
              className="flex flex-col items-center gap-1 px-2 py-2 border border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
              title={fileActions.bridgePaired ? "send to Cursor via paired editor" : "open Cursor deep link"}
            >
              <Send size={12} strokeWidth={1.75} className="text-neutral-500" />
              <span className="text-[10px] text-neutral-700 leading-none">Cursor</span>
            </button>
            <button
              onClick={() => fileActions.sendToAgent("codex", selectedInfo.file)}
              className="flex flex-col items-center gap-1 px-2 py-2 border border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
              title={fileActions.bridgePaired ? "send to Codex via paired editor" : "copy codex command"}
            >
              <Terminal size={12} strokeWidth={1.75} className="text-neutral-500" />
              <span className="text-[10px] text-neutral-700 leading-none">Codex</span>
            </button>
          </div>
          <button
            onClick={() => fileActions.sendToAgent("copy", selectedInfo.file)}
            className="w-full mt-1 flex items-center gap-2 px-2 py-1.5 border border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50 text-[11px] text-left transition-colors"
            title="copy the agent prompt to clipboard"
          >
            <Wand size={12} strokeWidth={1.75} className="text-neutral-500 flex-shrink-0" />
            <span className="flex-1 text-neutral-800">Copy as agent prompt</span>
          </button>
        </div>
      )}

      {selectedInfo.kind === "file" && (
        <>
          <RelList
            title={`imports · ${selectedInfo.imports.length}`}
            items={selectedInfo.imports}
            emptyMsg="no outgoing imports"
            onItemClick={(item) => onSelect({ kind: "file", id: item.file.id })}
          />
          <RelList
            title={`imported by · ${selectedInfo.importedBy.length}`}
            items={selectedInfo.importedBy}
            emptyMsg="no incoming imports"
            onItemClick={(item) => onSelect({ kind: "file", id: item.file.id })}
          />
        </>
      )}

      {selectedInfo.kind === "folder" && (
        <>
          <div className="px-4 py-3 border-t border-neutral-200">
            <div className="text-[9px] tracking-[0.2em] text-neutral-400 uppercase mb-2 font-mono">
              connected folders · {selectedInfo.neighbors.length}
            </div>
            <div className="space-y-1">
              {selectedInfo.neighbors.length === 0 && (
                <div className="text-[11px] text-neutral-400 italic">no cross-folder imports</div>
              )}
              {selectedInfo.neighbors.map((n, i) => (
                <button
                  key={i}
                  onClick={() => onSelect({ kind: "folder", id: n.folder.id })}
                  className="w-full flex items-center gap-2 text-[11px] px-2 py-1 border border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50 transition-colors text-left"
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: toHex(n.folder.color) }}
                  />
                  <span className="text-neutral-800 flex-1">{n.folder.name}</span>
                  <span className="text-neutral-500 tabular-nums font-mono">{n.weight}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 py-3 border-t border-neutral-200">
            <div className="text-[9px] tracking-[0.2em] text-neutral-400 uppercase mb-2 font-mono">
              files · {selectedInfo.folder.files.length}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              {selectedInfo.folder.files.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onSelect({ kind: "file", id: f.id })}
                  className="text-[10px] text-neutral-700 hover:text-neutral-900 truncate text-left font-mono"
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {mode === "vector" && inRoot && (
            <div className="px-4 py-3 border-t border-neutral-200">
              <button
                onClick={() => onEnterFolder(selectedInfo.folder.name)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-neutral-900 hover:bg-black text-white transition-colors text-[11px] font-medium tracking-wide uppercase"
              >
                <span>enter folder</span>
                <ArrowRight size={13} strokeWidth={1.75} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
