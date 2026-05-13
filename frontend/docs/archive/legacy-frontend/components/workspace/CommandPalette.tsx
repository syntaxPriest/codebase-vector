"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search, Folder as FolderIcon, FileCode } from "lucide-react";
import { toHex } from "@/lib/codebase/colors";
import type { Codebase, CodebaseFile, Folder, Selection } from "@/lib/codebase/types";

function score(text: string, query: string): number {
  if (!text) return -1;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = t.indexOf(q);
  if (idx < 0) return -1;
  return 100 - idx - t.length * 0.4 + (idx === 0 ? 40 : 0);
}

type FolderResult = { kind: "folder"; item: Folder; score: number };
type FileResult   = { kind: "file";   item: CodebaseFile; score: number };
type Result = FolderResult | FileResult;

interface CommandPaletteProps {
  codebase: Codebase;
  open: boolean;
  onClose: () => void;
  onSelect: (s: Selection) => void;
}

export function CommandPalette({ codebase, open, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIdx(0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const results: Result[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return codebase.folders.slice(0, 12).map<Result>((f) => ({
        kind: "folder",
        item: f,
        score: 0,
      }));
    }
    const out: Result[] = [];
    for (const folder of codebase.folders) {
      const s = score(folder.name, q);
      if (s > -1) out.push({ kind: "folder", item: folder, score: s });
    }
    for (const file of codebase.allFiles) {
      const nameScore = score(file.name, q);
      let best = nameScore;
      if (file.path && file.path !== file.name) {
        const pathScore = score(file.path, q);
        if (pathScore > best) best = pathScore - 6;
      }
      if (best > -1) out.push({ kind: "file", item: file, score: best });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, 60);
  }, [query, codebase]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const row = list.querySelector(`[data-row-idx="${activeIdx}"]`);
    if (row) (row as HTMLElement).scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const submit = (idx: number) => {
    const r = results[idx];
    if (!r) return;
    onSelect({ kind: r.kind, id: r.item.id });
    onClose();
  };

  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit(activeIdx);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/15 flex items-start justify-center pt-[18vh]"
      onClick={onClose}
    >
      <div
        className="bg-white border border-neutral-300 w-[540px] max-w-[calc(100vw-32px)]"
        style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 border-b border-neutral-200">
          <Search size={14} strokeWidth={1.75} className="text-neutral-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="search files and folders…"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 px-1 py-3 text-[13px] outline-none font-mono text-neutral-900 placeholder:text-neutral-400"
          />
          <kbd className="text-[10px] font-mono text-neutral-400 px-1.5 py-0.5 border border-neutral-200">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[420px] overflow-y-auto py-1">
          {results.map((r, i) => {
            const Icon = r.kind === "folder" ? FolderIcon : FileCode;
            return (
              <button
                key={`${r.kind}-${r.item.id}`}
                data-row-idx={i}
                onClick={() => submit(i)}
                onMouseMove={() => setActiveIdx(i)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left transition-colors ${
                  i === activeIdx ? "bg-neutral-100" : ""
                }`}
              >
                <Icon size={12} strokeWidth={1.5} className="text-neutral-400 flex-shrink-0" />
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: toHex(r.item.color) }}
                />
                <span className="text-neutral-900 font-mono truncate">{r.item.name}</span>
                {r.kind === "file" && r.item.path && r.item.path !== r.item.name && (
                  <span className="text-[10px] text-neutral-400 ml-auto truncate font-mono">
                    {r.item.path}
                  </span>
                )}
                {r.kind === "folder" && (
                  <span className="text-[10px] text-neutral-400 ml-auto font-mono">
                    {r.item.fileCount}
                  </span>
                )}
              </button>
            );
          })}
          {results.length === 0 && (
            <div className="px-3 py-6 text-[11px] text-neutral-400 text-center font-mono">
              no matches
            </div>
          )}
        </div>

        <div className="px-3 py-1.5 border-t border-neutral-200 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
          <span>↑↓ navigate · ↵ select</span>
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  );
}
