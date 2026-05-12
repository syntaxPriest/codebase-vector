"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ReadmeView } from "@/components/views/ReadmeView";
import { ContextMenuProvider } from "@/components/ui/ContextMenu";
import type { Codebase, Repo } from "@/lib/codebase/types";

interface CaseStudyClientProps {
  readme: string;
  owner: string;
  repoName: string;
  branch: string;
}

export function CaseStudyClient({ readme, owner, repoName, branch }: CaseStudyClientProps) {
  const [pendingAsk, setPendingAsk] = useState<string | null>(null);

  const codebase: Codebase = {
    folders: [],
    allFiles: [],
    folderEdges: [],
    truncated: null,
    readme,
    meta: {
      owner,
      repo: repoName,
      sha: "case-study",
      branch,
      fetchedAt: new Date().toISOString(),
      fileCount: 0,
    },
  };
  const repo: Repo = { kind: "github", owner, repo: repoName };

  return (
    <ContextMenuProvider>
      <div className="relative min-h-screen bg-white">
        <header className="absolute top-0 inset-x-0 px-6 py-5 flex items-center justify-between z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft size={12} strokeWidth={1.75} />
            <span>codebase</span>
          </Link>
          <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase font-mono">
            case study · {owner}/{repoName}@{branch}
          </div>
        </header>
        <ReadmeView
          codebase={codebase}
          repo={repo}
          onAsk={(q) => setPendingAsk(q)}
        />
        {pendingAsk && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white border border-neutral-300 px-4 py-3 max-w-[640px]"
               style={{ boxShadow: "0 12px 32px rgba(0,0,0,0.12)" }}>
            <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-1 font-mono">
              would-be ask query
            </div>
            <div className="text-[12px] text-neutral-800 font-mono whitespace-pre-wrap break-words max-h-[160px] overflow-y-auto">
              {pendingAsk}
            </div>
            <button
              onClick={() => setPendingAsk(null)}
              className="mt-2 text-[10px] tracking-wide uppercase font-mono text-neutral-500 hover:text-neutral-900"
            >
              dismiss
            </button>
          </div>
        )}
      </div>
    </ContextMenuProvider>
  );
}
