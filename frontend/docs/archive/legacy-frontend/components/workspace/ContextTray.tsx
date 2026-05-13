"use client";

import { useState } from "react";
import { Boxes, Check, ChevronDown, ChevronUp, Copy, X } from "lucide-react";

interface ContextTrayProps {
  paths: string[];
  onRemove: (path: string) => void;
  onClear: () => void;
}

// Bottom-center floating pill. Hidden when nothing has been added.
// Click the pill to expand a sheet listing the gathered paths plus
// three copy formats: @-mentions for Claude Code / Codex, plain
// newline-separated paths, and a markdown bullet list.
export function ContextTray({ paths, onRemove, onClear }: ContextTrayProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (paths.length === 0) return null;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1600);
    } catch {}
  };

  // AI coding tools (Claude Code, Codex, Cursor) reference files with
  // an `@`-prefix — keep that convention across every copy format so a
  // straight paste lands as actual context.
  const inlineText   = paths.map((p) => `@${p}`).join(" ");
  const linesText    = paths.map((p) => `@${p}`).join("\n");
  const markdownText = paths.map((p) => `- \`@${p}\``).join("\n");

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="pointer-events-auto">
        {expanded && (
          <div
            className="bg-white border border-neutral-300 mb-2 w-[440px] max-w-[calc(100vw-32px)]"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}
          >
            <div className="px-3 py-2 border-b border-neutral-200 flex items-center justify-between">
              <div className="text-[10px] tracking-[0.2em] text-neutral-500 uppercase font-mono">
                context · {paths.length} {paths.length === 1 ? "file" : "files"}
              </div>
              <button
                onClick={onClear}
                className="text-[10px] text-neutral-400 hover:text-neutral-900 font-mono transition-colors"
              >
                clear
              </button>
            </div>

            <div className="max-h-[260px] overflow-y-auto py-1">
              {paths.map((path) => (
                <div key={path} className="flex items-center gap-2 px-3 py-1 group hover:bg-neutral-50 transition-colors">
                  <span className="text-[11px] font-mono flex-1 truncate">
                    <span className="text-neutral-400">@</span>
                    <span className="text-neutral-700">{path}</span>
                  </span>
                  <button
                    onClick={() => onRemove(path)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-400 hover:text-neutral-900 transition-opacity"
                    aria-label={`remove ${path}`}
                  >
                    <X size={11} strokeWidth={1.75} />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-200 grid grid-cols-3 text-[11px]">
              <CopyButton onClick={() => copy(inlineText, "inline")} active={copied === "inline"} label="inline" />
              <CopyButton onClick={() => copy(linesText, "lines")} active={copied === "lines"} label="lines" leftBorder />
              <CopyButton onClick={() => copy(markdownText, "md")} active={copied === "md"} label="md" leftBorder />
            </div>

            <div className="px-3 py-1.5 border-t border-neutral-200 text-[10px] text-neutral-400 font-mono leading-relaxed">
              All formats use the <span className="text-neutral-700">@path</span> convention.{" "}
              <span className="font-medium text-neutral-600">inline</span> · space-joined.{" "}
              <span className="font-medium text-neutral-600">lines</span> · one per line.{" "}
              <span className="font-medium text-neutral-600">md</span> · bullet list.
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded((v) => !v)}
          className="bg-white border border-neutral-300 px-3 py-1.5 flex items-center gap-2 hover:border-neutral-900 transition-colors mx-auto"
          style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
        >
          <Boxes size={12} strokeWidth={1.75} className="text-neutral-500" />
          <span className="text-[11px] font-mono text-neutral-700">
            context · {paths.length}
          </span>
          {expanded
            ? <ChevronDown size={12} strokeWidth={1.75} className="text-neutral-400" />
            : <ChevronUp size={12} strokeWidth={1.75} className="text-neutral-400" />}
        </button>
      </div>
    </div>
  );
}

function CopyButton({
  onClick,
  active,
  label,
  leftBorder,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  leftBorder?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-2 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5 ${leftBorder ? "border-l border-neutral-200" : ""}`}
    >
      {active
        ? <Check size={12} strokeWidth={1.75} className="text-neutral-900" />
        : <Copy size={12} strokeWidth={1.75} className="text-neutral-500" />}
      <span className="font-mono">{active ? "copied" : label}</span>
    </button>
  );
}
