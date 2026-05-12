import { MessageCircleQuestion } from "lucide-react";
import { Breadcrumb } from "./Breadcrumb";
import { ModeToggle } from "./ModeToggle";
import type { ViewMode } from "@/lib/codebase/types";

interface TopBarProps {
  view: string;
  inRoot: boolean;
  onRoot: () => void;
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
  hasReadme?: boolean;
  onOpenAsk?: () => void;
  askDisabled?: boolean;
}

export function TopBar({
  view, inRoot, onRoot, mode, setMode, hasReadme,
  onOpenAsk, askDisabled,
}: TopBarProps) {
  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
      {mode === "vector" && (
        <Breadcrumb view={view} inRoot={inRoot} onRoot={onRoot} />
      )}
      <ModeToggle mode={mode} setMode={setMode} hasReadme={hasReadme} />
      {onOpenAsk && (
        <button
          onClick={onOpenAsk}
          disabled={askDisabled}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] tracking-wide border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={askDisabled ? "available for github repos" : "ask the codebase · ⌘J"}
        >
          <MessageCircleQuestion size={13} strokeWidth={1.75} />
          <span>ask</span>
          <kbd className="hidden sm:inline ml-1 text-[9px] font-mono text-neutral-400 border border-neutral-200 px-1 py-px">⌘J</kbd>
        </button>
      )}
    </div>
  );
}
