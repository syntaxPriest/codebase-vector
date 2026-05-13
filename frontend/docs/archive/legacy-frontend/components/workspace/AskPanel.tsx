"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertCircle,
  BookOpen,
  Check,
  Copy,
  FileCode,
  Folder as FolderIcon,
  Layers,
  Loader2,
  Network,
  Plus,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { toHex } from "@/lib/codebase/colors";
import type { Codebase, Repo, Selection } from "@/lib/codebase/types";

interface AskFile {
  path: string;
  role: "entry-point" | "implementation" | "config" | "data" | "ui" | "test" | "support";
  note?: string;
}

interface AskFolder {
  name: string;
  note?: string;
}

interface AskEdge {
  from: string;
  to: string;
  reason?: string;
}

interface AskResult {
  summary: string;
  explanation: string;
  files: AskFile[];
  folders: AskFolder[];
  edges: AskEdge[];
  agentPrompt: string;
  ai: boolean;
  configured?: boolean;
}

type AskMode = "explain" | "trace" | "deep";

interface ModeDef {
  key: AskMode;
  label: string;
  Icon: LucideIcon;
  hint: string;
}

const MODES: ModeDef[] = [
  { key: "explain", label: "explain", Icon: BookOpen, hint: "concise summary + key files" },
  { key: "trace",   label: "trace",   Icon: Network,  hint: "follow the import/call graph between files" },
  { key: "deep",    label: "deep",    Icon: Layers,   hint: "comprehensive walkthrough, more files" },
];

const ROLE_LABEL: Record<AskFile["role"], string> = {
  "entry-point":    "entry",
  implementation:   "impl",
  config:           "config",
  data:             "data",
  ui:               "ui",
  test:             "test",
  support:          "support",
};

interface AskPanelProps {
  codebase: Codebase;
  repo: Repo;
  open: boolean;
  onClose: () => void;
  onSelect: (s: Selection) => void;
  /** Pre-fill the input. Cleared after first read. */
  prefill?: string | null;
  onPrefillConsumed?: () => void;
  onAddPathsToContext?: (paths: string[]) => void;
}

// Comprehensive feature explorer.
// Ask renders four bands:
//   summary + explanation, files (role-tagged), folders, connections,
// and a copy-pasteable agent prompt for Claude Code / Codex / Cursor.
export function AskPanel({
  codebase,
  repo,
  open,
  onClose,
  onSelect,
  prefill,
  onPrefillConsumed,
  onAddPathsToContext,
}: AskPanelProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<AskMode>("explain");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResult | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedRefs, setCopiedRefs] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const consumedPrefill = useRef<string | null>(null);

  // Reset transient panel state on the open transition. Intentionally
  // does NOT include prefill in deps — we don't want consuming a
  // prefill (which causes the parent to set prefill back to null) to
  // re-run this and wipe the input.
  useEffect(() => {
    if (!open) {
      consumedPrefill.current = null;
      return;
    }
    setError(null);
    setLoading(false);
    setResult(null);
    setCopiedPrompt(false);
    setCopiedRefs(false);
    // Only clear the input on open if there's no prefill arriving.
    // If there is, the prefill effect below will set it.
    if (!prefill) setQuery("");
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Apply an incoming prefill exactly once per (open session, prefill
  // value). Excluded from deps: onPrefillConsumed — its identity is
  // irrelevant to whether we should reapply.
  useEffect(() => {
    if (!open || !prefill) return;
    if (consumedPrefill.current === prefill) return;
    setQuery(prefill);
    consumedPrefill.current = prefill;
    onPrefillConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill]);

  const pathIndex = useMemo(() => {
    const map = new Map<string, number>();
    codebase.allFiles.forEach((f) => {
      if (f.path) map.set(f.path, f.id);
      else map.set(f.name, f.id);
    });
    return map;
  }, [codebase]);

  const folderIndex = useMemo(() => {
    const map = new Map<string, number>();
    codebase.folders.forEach((f) => map.set(f.name, f.id));
    return map;
  }, [codebase]);

  const submit = async () => {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q, codebase, mode }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} · ${text.slice(0, 200) || res.statusText}`);
      }
      const data = (await res.json()) as AskResult;
      setResult(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "ask failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const goToFile = (path: string) => {
    const id = pathIndex.get(path);
    if (id === undefined) return;
    onSelect({ kind: "file", id });
    onClose();
  };

  const goToFolder = (name: string) => {
    const id = folderIndex.get(name);
    if (id === undefined) return;
    onSelect({ kind: "folder", id });
    onClose();
  };

  const copy = async (text: string, which: "prompt" | "refs") => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === "prompt") {
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 1600);
      } else {
        setCopiedRefs(true);
        setTimeout(() => setCopiedRefs(false), 1600);
      }
    } catch {}
  };

  const addAllToContext = () => {
    if (!result || !onAddPathsToContext) return;
    onAddPathsToContext(result.files.map((f) => f.path));
  };

  if (!open) return null;

  const placeholder = repo.kind === "demo"
    ? "ask about a feature, e.g. how does the layout system work"
    : "ask about a feature, e.g. how does auth work";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/15 flex items-start justify-center pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="bg-white border border-neutral-300 w-[760px] max-w-[calc(100vw-32px)] max-h-[84vh] flex flex-col"
        style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.14)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-2 px-3 border-b border-neutral-200">
          <Search size={14} strokeWidth={1.75} className="text-neutral-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder={placeholder}
            disabled={loading}
            spellCheck={false}
            className="flex-1 px-1 py-3 text-[13px] outline-none text-neutral-900 placeholder:text-neutral-400 disabled:bg-transparent disabled:cursor-not-allowed"
          />
          <button
            onClick={submit}
            disabled={loading || !query.trim()}
            className="px-3 py-1 text-[11px] tracking-wide bg-neutral-900 text-white hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {loading
              ? <Loader2 size={11} strokeWidth={1.75} className="animate-spin" />
              : <span>↵ ask</span>}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-900 transition-colors"
            aria-label="close"
          >
            <X size={13} strokeWidth={1.75} />
          </button>
        </div>

        {/* Mode selector */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-neutral-200 bg-neutral-50">
          <span className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase font-mono">
            mode
          </span>
          <div className="flex items-center gap-1 p-0.5 border border-neutral-200 bg-white">
            {MODES.map(({ key, label, Icon, hint }) => {
              const active = mode === key;
              return (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  disabled={loading}
                  title={hint}
                  className={`flex items-center gap-1 px-2 py-0.5 text-[10px] tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    active
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                  }`}
                  aria-pressed={active}
                >
                  <Icon size={11} strokeWidth={1.75} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
          <span className="text-[10px] text-neutral-500 truncate">
            {MODES.find((m) => m.key === mode)?.hint}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {!result && !error && !loading && (
            <div className="px-4 py-8 text-center text-[12px] text-neutral-500 font-mono">
              ask about a feature, file, or pattern · ↵ to send
            </div>
          )}

          {loading && (
            <div className="px-4 py-12 text-center">
              <Loader2 size={18} strokeWidth={1.5} className="animate-spin mx-auto text-neutral-400 mb-3" />
              <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase font-mono">
                analysing
              </div>
            </div>
          )}

          {error && (
            <div className="px-4 py-6">
              <div className="flex items-start gap-2 text-[12px] text-neutral-700">
                <AlertCircle size={13} strokeWidth={1.75} className="text-neutral-500 mt-0.5 flex-shrink-0" />
                <div className="font-mono break-all">{error}</div>
              </div>
            </div>
          )}

          {result && (
            <div className="px-5 py-4 space-y-5">
              {/* Source / configuration */}
              <div className="flex items-center justify-between text-[10px] tracking-[0.2em] text-neutral-400 uppercase font-mono">
                <span>
                  {result.ai ? "claude" : "keyword search"} ·{" "}
                  {result.files.length} {result.files.length === 1 ? "file" : "files"}
                  {result.folders.length > 0 && ` · ${result.folders.length} folders`}
                  {result.edges.length > 0 && ` · ${result.edges.length} edges`}
                </span>
                {!result.ai && (
                  <span title="set ANTHROPIC_API_KEY for ai-powered explanations">no api key</span>
                )}
              </div>

              {/* Summary */}
              {result.summary && (
                <div className="text-[15px] text-neutral-900 font-medium leading-snug">
                  {result.summary}
                </div>
              )}

              {/* Explanation */}
              {result.explanation && (
                <div className="text-[13px] text-neutral-700 leading-[1.7]">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p:  ({ children }) => <p className="my-2">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
                      a:  ({ children, href }) => (
                        <a href={href} target="_blank" rel="noreferrer"
                           className="text-neutral-900 underline underline-offset-2 decoration-neutral-300 hover:decoration-neutral-900">
                          {children}
                        </a>
                      ),
                      code: ({ className, children }) => {
                        const isBlock = typeof className === "string" && className.startsWith("language-");
                        if (isBlock) {
                          return <code className={`font-mono text-[12px] block ${className}`}>{children}</code>;
                        }
                        const text = String(children).replace(/^@/, "");
                        const id = pathIndex.get(text);
                        return (
                          <code
                            onClick={id !== undefined ? () => goToFile(text) : undefined}
                            className={`font-mono text-[11.5px] bg-neutral-100 text-neutral-900 px-1 py-0.5 border border-neutral-200 ${
                              id !== undefined ? "cursor-pointer hover:bg-neutral-200" : ""
                            }`}
                          >
                            {children}
                          </code>
                        );
                      },
                      em: ({ children }) => <em className="italic text-neutral-500">{children}</em>,
                      strong: ({ children }) => <strong className="font-semibold text-neutral-900">{children}</strong>,
                    }}
                  >
                    {result.explanation}
                  </ReactMarkdown>
                </div>
              )}

              {/* Files */}
              {result.files.length > 0 && (
                <Section title={`files · ${result.files.length}`}>
                  <div className="space-y-1">
                    {result.files.map((f) => {
                      const id = pathIndex.get(f.path);
                      const file = id !== undefined ? codebase.allFiles[id] : null;
                      return (
                        <button
                          key={f.path}
                          disabled={!file}
                          onClick={() => goToFile(f.path)}
                          className={`w-full text-left border transition-colors ${
                            file
                              ? "border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50"
                              : "border-transparent text-neutral-400 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-start gap-2 px-2 py-1.5">
                            <RoleBadge role={f.role} />
                            {file && (
                              <span
                                className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                                style={{ background: toHex(file.color) }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-[11.5px] text-neutral-900 truncate">
                                <span className="text-neutral-400">@</span>{f.path}
                              </div>
                              {f.note && (
                                <div className="text-[11px] text-neutral-600 mt-0.5 leading-snug">{f.note}</div>
                              )}
                            </div>
                            {file && (
                              <span className="text-[10px] text-neutral-400 font-mono mt-1 flex-shrink-0">
                                {file.loc} loc
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Folders */}
              {result.folders.length > 0 && (
                <Section title={`folders · ${result.folders.length}`}>
                  <div className="space-y-1">
                    {result.folders.map((fl) => {
                      const id = folderIndex.get(fl.name);
                      const folder = id !== undefined ? codebase.folders[id] : null;
                      return (
                        <button
                          key={fl.name}
                          disabled={!folder}
                          onClick={() => goToFolder(fl.name)}
                          className={`w-full flex items-center gap-2 px-2 py-1 border transition-colors text-left ${
                            folder
                              ? "border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50"
                              : "border-transparent text-neutral-400 cursor-not-allowed"
                          }`}
                        >
                          <FolderIcon
                            size={11}
                            strokeWidth={1.5}
                            className="flex-shrink-0"
                            style={{ color: folder ? toHex(folder.color) : "#a3a3a3" }}
                          />
                          <span className="font-mono text-[11.5px] text-neutral-900">{fl.name}</span>
                          {fl.note && (
                            <span className="text-[10px] text-neutral-500 ml-1 truncate">{fl.note}</span>
                          )}
                          {folder && (
                            <span className="text-[10px] text-neutral-400 font-mono ml-auto flex-shrink-0">
                              {folder.fileCount} files
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Connections */}
              {result.edges.length > 0 && (
                <Section title={`connections · ${result.edges.length}`}>
                  <div className="space-y-0.5 font-mono text-[11px]">
                    {result.edges.map((edge, i) => (
                      <div key={i} className="flex items-center gap-1 text-neutral-700">
                        <button
                          onClick={() => goToFile(edge.from)}
                          className="hover:text-neutral-900 hover:underline truncate"
                        >
                          @{edge.from}
                        </button>
                        <span className="text-neutral-400">→</span>
                        <button
                          onClick={() => goToFile(edge.to)}
                          className="hover:text-neutral-900 hover:underline truncate"
                        >
                          @{edge.to}
                        </button>
                        {edge.reason && (
                          <span className="text-[10px] text-neutral-400 ml-1">· {edge.reason}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Agent prompt */}
              {result.agentPrompt && (
                <Section title="for coding agents">
                  <pre className="bg-neutral-50 border border-neutral-200 px-3 py-2.5 text-[11.5px] font-mono text-neutral-800 whitespace-pre-wrap leading-[1.6] max-h-[260px] overflow-y-auto">
                    {result.agentPrompt}
                  </pre>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => copy(result.agentPrompt, "prompt")}
                      className="flex items-center gap-1.5 px-2 py-1 border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 text-[11px] transition-colors"
                    >
                      {copiedPrompt
                        ? <Check size={11} strokeWidth={1.75} />
                        : <Copy size={11} strokeWidth={1.75} className="text-neutral-500" />}
                      <span className="font-mono">{copiedPrompt ? "copied" : "copy prompt"}</span>
                    </button>
                    <button
                      onClick={() => copy(result.files.map((f) => `@${f.path}`).join(" "), "refs")}
                      className="flex items-center gap-1.5 px-2 py-1 border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 text-[11px] transition-colors"
                    >
                      {copiedRefs
                        ? <Check size={11} strokeWidth={1.75} />
                        : <Copy size={11} strokeWidth={1.75} className="text-neutral-500" />}
                      <span className="font-mono">{copiedRefs ? "copied" : "copy @refs"}</span>
                    </button>
                    {onAddPathsToContext && result.files.length > 0 && (
                      <button
                        onClick={addAllToContext}
                        className="flex items-center gap-1.5 px-2 py-1 border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 text-[11px] transition-colors"
                      >
                        <Plus size={11} strokeWidth={1.75} className="text-neutral-500" />
                        <span className="font-mono">add files to context tray</span>
                      </button>
                    )}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>

        <div className="px-3 py-1.5 border-t border-neutral-200 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
          <span>↵ ask · esc · close · click @paths to inspect</span>
          <span>
            {mode}
            {result && ` · ${result.ai ? "ai" : "keyword"}`}
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-neutral-200 pt-3">
      <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-2 font-mono">
        {title}
      </div>
      {children}
    </div>
  );
}

function RoleBadge({ role }: { role: AskFile["role"] }) {
  return (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] tracking-[0.1em] uppercase font-mono border border-neutral-200 text-neutral-600 flex-shrink-0 mt-1">
      {ROLE_LABEL[role]}
    </span>
  );
}
