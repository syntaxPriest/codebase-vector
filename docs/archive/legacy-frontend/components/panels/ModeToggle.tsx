import { Network, GitBranch, Grid3x3, LayoutGrid, BookOpen, type LucideIcon } from "lucide-react";
import type { ViewMode } from "@/lib/codebase/types";

interface ModeDef {
  key: ViewMode;
  label: string;
  Icon: LucideIcon;
}

const MODES: ModeDef[] = [
  { key: "vector",  label: "vector",  Icon: Network    },
  { key: "tree",    label: "tree",    Icon: GitBranch  },
  { key: "matrix",  label: "matrix",  Icon: Grid3x3    },
  { key: "treemap", label: "treemap", Icon: LayoutGrid },
  { key: "readme",  label: "readme",  Icon: BookOpen   },
];

interface ModeToggleProps {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  hasReadme?: boolean;
}

export function ModeToggle({ mode, setMode }: ModeToggleProps) {
  // README is now always available — when no README ships with the
  // repo we render a synthesized overview, so the tab stays visible.
  const visible = MODES;
  return (
    <div className="flex items-center gap-1 p-1 border border-neutral-200 bg-white">
      {visible.map(({ key, label, Icon }) => {
        const active = mode === key;
        return (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] tracking-wide transition-colors ${
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
            }`}
          >
            <Icon size={13} strokeWidth={1.75} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
