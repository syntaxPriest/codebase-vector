"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Pin, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Codebase, Repo, ViewMode } from "@/lib/codebase/types";

interface RepoHeaderProps {
  repo: Repo;
  codebase?: Codebase | null;
  view: string;
  inRoot: boolean;
  mode: ViewMode;
}

const SCOPE_BY_MODE: Partial<Record<ViewMode, string>> = {
  tree:    "tree view · root → folders → files",
  matrix:  "matrix · folder × folder dependencies",
  treemap: "treemap · folders sized by lines of code",
};

export function RepoHeader({ repo, codebase, view, inRoot, mode }: RepoHeaderProps) {
  const router = useRouter();
  const [pinned, setPinned] = useState(false);
  const isDemo = repo.kind === "demo";

  const subtitle = isDemo ? "synthetic codebase" : `github.com / ${repo.owner}`;
  const title = isDemo ? "demo" : repo.repo;

  const sha = codebase?.meta?.sha;
  const fileCount = codebase?.meta?.fileCount ?? codebase?.allFiles?.length;
  const isPinned = repo.kind === "github" && !!repo.sha;

  const scope = SCOPE_BY_MODE[mode] ??
    (inRoot ? "principal tree · folders as nodes" : `sub-tree · ${view}`);

  const onPin = async () => {
    if (!sha || repo.kind !== "github") return;
    const path = `/r/${repo.owner}/${repo.repo}/at/${sha}`;
    try {
      const url = `${window.location.origin}${path}`;
      await navigator.clipboard.writeText(url);
      setPinned(true);
      setTimeout(() => setPinned(false), 1600);
    } catch {
      router.push(path);
    }
  };

  return (
    <div className="absolute top-6 left-6 max-w-[340px]">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-900 mb-3 transition-colors pointer-events-auto"
      >
        <ArrowLeft size={12} strokeWidth={1.75} />
        <span>codebase</span>
      </Link>

      <div className="pointer-events-none">
        <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-2 font-mono break-all">
          {subtitle}
        </div>
        <div className="text-2xl font-semibold leading-none tracking-tight text-neutral-900 break-all">
          {title}
        </div>

        {!isDemo && (sha || fileCount != null) && (
          <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-400 font-mono pointer-events-auto">
            {sha && (
              <button
                onClick={onPin}
                className="inline-flex items-center gap-1 hover:text-neutral-900 transition-colors"
                title={isPinned ? "viewing a pinned revision" : "copy pinned link"}
              >
                {pinned
                  ? <Check size={11} strokeWidth={1.75} />
                  : <Pin size={11} strokeWidth={1.75} className={isPinned ? "text-neutral-700" : ""} />}
                <span>{pinned ? "copied" : `@${sha.slice(0, 7)}`}</span>
              </button>
            )}
            {fileCount != null && <span>· {fileCount} files</span>}
          </div>
        )}

        <div className="text-[12px] text-neutral-500 mt-3 leading-relaxed">
          {scope}
        </div>
      </div>
    </div>
  );
}
