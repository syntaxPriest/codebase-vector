"use client";

import Link from "next/link";
import { Clock, X } from "lucide-react";
import { useRecentRepos } from "@/hooks/useRecentRepos";

export function RecentRepos() {
  const { repos, remove } = useRecentRepos();
  if (repos.length === 0) return null;

  return (
    <div className="mt-10">
      <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-3 font-mono">
        recent
      </div>
      <div className="space-y-0.5">
        {repos.map((r) => {
          const slug = `${r.owner}/${r.repo}`;
          return (
            <div key={slug} className="flex items-center group">
              <Link
                href={`/r/${r.owner}/${r.repo}`}
                className="flex-1 flex items-center gap-2 text-[12px] text-neutral-700 hover:text-neutral-900 px-2 py-1 -mx-2 hover:bg-neutral-100 transition-colors"
              >
                <Clock size={12} strokeWidth={1.75} className="text-neutral-400" />
                <span className="font-mono">{slug}</span>
              </Link>
              <button
                onClick={() => remove(slug)}
                className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-neutral-900 transition-opacity"
                aria-label={`forget ${slug}`}
              >
                <X size={11} strokeWidth={1.75} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
