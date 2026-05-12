"use client";

import { useState } from "react";
import { Plug, PlugZap, X } from "lucide-react";

interface PairChipProps {
  configured: boolean;
  connected: boolean;
  paired: boolean;
  editorName: string | null;
  sessionId: string | null;
  port: number | null;
  mode?: "local" | "relay" | null;
  onPair: (raw: string) => boolean;
  onUnpair: () => void;
}

// Status pill for the editor bridge. Always visible so the feature is
// discoverable: clicking opens a panel with either pair instructions
// (when nothing is configured) or session detail + an unpair button.
export function PairChip({
  configured,
  connected,
  paired,
  editorName,
  sessionId,
  port,
  mode,
  onPair,
  onUnpair,
}: PairChipProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [pasteError, setPasteError] = useState(false);

  const label = !configured
    ? "pair editor"
    : paired
      ? `paired · ${editorName ?? "editor"}`
      : connected
        ? "linking…"
        : "reconnecting…";

  const Icon = paired ? PlugZap : Plug;
  const color = paired
    ? "text-neutral-900 border-neutral-900"
    : configured
      ? "text-neutral-500 border-neutral-200"
      : "text-neutral-400 border-neutral-200 border-dashed";

  const handlePaste = () => {
    const ok = onPair(pasteValue);
    if (ok) {
      setPasteValue("");
      setPasteError(false);
      setShowDetail(false);
    } else {
      setPasteError(true);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetail((v) => !v)}
        className={`flex items-center gap-1.5 px-2 py-1 text-[11px] tracking-wide border bg-white ${color} hover:bg-neutral-50 transition-colors`}
        title={
          paired
            ? "paired with editor"
            : configured
              ? "waiting for editor"
              : "connect a paired VS Code session"
        }
      >
        <Icon size={12} strokeWidth={1.75} />
        <span>{label}</span>
      </button>
      {showDetail && (
        <div
          className="absolute right-0 top-7 w-[300px] border border-neutral-200 bg-white p-3 z-30"
          style={{ boxShadow: "0 12px 32px rgba(0,0,0,0.10)" }}
          onMouseLeave={() => setShowDetail(false)}
        >
          <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-2 font-mono">
            session bridge
          </div>

          {configured ? (
            <>
              <div className="text-[11px] text-neutral-700 space-y-1 font-mono">
                <div>session · <span className="text-neutral-500">{sessionId?.slice(0, 12)}…</span></div>
                <div>transport · <span className="text-neutral-500">{mode === "relay" ? "relay (sse)" : `local · :${port ?? "?"}`}</span></div>
                <div>state · <span className="text-neutral-500">{paired ? "ready" : connected ? "handshake" : "reconnecting"}</span></div>
              </div>
              <button
                onClick={() => { onUnpair(); setShowDetail(false); }}
                className="mt-3 inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                <X size={11} strokeWidth={1.75} />
                <span>unpair</span>
              </button>
            </>
          ) : (
            <>
              <div className="text-[11px] text-neutral-700 leading-relaxed">
                Pair this tab with a VS Code session so right-click actions go
                straight to your editor.
              </div>
              <ol className="mt-2 text-[11px] text-neutral-600 space-y-1 list-decimal pl-4">
                <li>In VS Code, run <span className="font-mono text-neutral-900">Codebase Vector: Pair Workspace</span>.</li>
                <li>Click <span className="font-mono text-neutral-900">Open in Browser</span> — this tab will pair automatically.</li>
              </ol>
              <div className="mt-3 text-[10px] tracking-[0.15em] text-neutral-400 uppercase font-mono">
                or paste the pair token / URL
              </div>
              <div className="mt-1 flex gap-1">
                <input
                  value={pasteValue}
                  onChange={(e) => { setPasteValue(e.target.value); setPasteError(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handlePaste(); }}
                  placeholder="<session>:<port>"
                  className={`flex-1 min-w-0 px-2 py-1 border text-[11px] font-mono bg-white outline-none ${
                    pasteError ? "border-red-400 text-red-700" : "border-neutral-200 focus:border-neutral-400"
                  }`}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
                <button
                  onClick={handlePaste}
                  disabled={!pasteValue.trim()}
                  className="px-2 py-1 text-[11px] font-mono border border-neutral-300 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  pair
                </button>
              </div>
              {pasteError && (
                <div className="mt-1 text-[10px] text-red-600 font-mono">
                  unrecognised token
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
