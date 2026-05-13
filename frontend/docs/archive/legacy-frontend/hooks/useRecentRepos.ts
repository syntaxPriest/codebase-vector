"use client";

import { useCallback, useEffect, useState } from "react";
import type { Repo } from "@/lib/codebase/types";

const KEY = "codebase-vector:recent";
const LIMIT = 8;

export interface RecentRepo {
  owner: string;
  repo: string;
  at: number;
}

function safeRead(): RecentRepo[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentRepo[]) : [];
  } catch {
    return [];
  }
}

export function useRecentRepos() {
  const [repos, setRepos] = useState<RecentRepo[]>([]);

  useEffect(() => {
    setRepos(safeRead());
  }, []);

  const add = useCallback((repo: Repo) => {
    if (repo.kind !== "github") return;
    try {
      const slug = `${repo.owner}/${repo.repo}`;
      const arr = safeRead().filter((r) => `${r.owner}/${r.repo}` !== slug);
      const next = [{ owner: repo.owner, repo: repo.repo, at: Date.now() }, ...arr].slice(0, LIMIT);
      localStorage.setItem(KEY, JSON.stringify(next));
      setRepos(next);
    } catch {}
  }, []);

  const remove = useCallback((slug: string) => {
    try {
      const arr = safeRead().filter((r) => `${r.owner}/${r.repo}` !== slug);
      localStorage.setItem(KEY, JSON.stringify(arr));
      setRepos(arr);
    } catch {}
  }, []);

  return { repos, add, remove };
}
