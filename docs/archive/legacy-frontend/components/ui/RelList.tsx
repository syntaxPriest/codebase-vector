import { toHex } from "@/lib/codebase/colors";
import type { CodebaseFile, Folder } from "@/lib/codebase/types";

export interface RelItem {
  file: CodebaseFile;
  folder: Folder;
  sameFolder?: boolean;
}

interface RelListProps {
  title: string;
  items: RelItem[];
  emptyMsg: string;
  onItemClick: (item: RelItem) => void;
}

export function RelList({ title, items, emptyMsg, onItemClick }: RelListProps) {
  return (
    <div className="px-4 py-3 border-t border-neutral-200">
      <div className="text-[9px] tracking-[0.2em] text-neutral-400 uppercase mb-2 font-mono">{title}</div>
      <div className="space-y-1">
        {items.length === 0 && (
          <div className="text-[11px] text-neutral-400 italic">{emptyMsg}</div>
        )}
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => onItemClick(item)}
            className="w-full flex items-center gap-2 text-[11px] px-2 py-1 border border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50 transition-colors text-left"
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: toHex(item.folder.color) }}
            />
            <span className="text-neutral-800 flex-1 truncate">{item.file.name}</span>
            <span className="text-[10px] text-neutral-400 tracking-wide font-mono">{item.folder.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
