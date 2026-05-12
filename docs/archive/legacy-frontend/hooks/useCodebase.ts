"use client";

import { useEffect, useState } from "react";
import { generateCodebase } from "@/lib/codebase/generator";
import type { Codebase, IngestProgress, Repo } from "@/lib/codebase/types";

export interface UseCodebaseState {
  codebase: Codebase | null;
  loading: boolean;
  error: string | null;
  progress: IngestProgress | null;
}

const initialFetchState: UseCodebaseState = {
  codebase: null,
  loading: true,
  error: null,
  progress: null,
};

export function useCodebase(repo: Repo): UseCodebaseState {
  const [state, setState] = useState<UseCodebaseState>(() => {
    if (repo.kind === "demo") {
      return { codebase: generateCodebase(), loading: false, error: null, progress: null };
    }
    return initialFetchState;
  });

  useEffect(() => {
    if (repo.kind !== "github") return;

    const sha = repo.sha ? `?sha=${encodeURIComponent(repo.sha)}` : "";
    const url = `/api/repo/${repo.owner}/${repo.repo}/stream${sha}`;
    let es: EventSource | null = null;
    let cancelled = false;

    setState({ codebase: null, loading: true, error: null, progress: { stage: "connecting" } });

    try {
      es = new EventSource(url);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setState({ codebase: null, loading: false, error: message, progress: null });
      return;
    }

    es.addEventListener("progress", (e: MessageEvent) => {
      if (cancelled) return;
      try {
        const data = JSON.parse(e.data) as IngestProgress;
        setState((s) => ({ ...s, progress: data }));
      } catch {}
    });

    es.addEventListener("codebase", (e: MessageEvent) => {
      if (cancelled) return;
      try {
        const codebase = JSON.parse(e.data) as Codebase;
        setState({ codebase, loading: false, error: null, progress: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : "parse error";
        setState({ codebase: null, loading: false, error: message, progress: null });
      }
      es?.close();
    });

    es.addEventListener("fail", (e: MessageEvent) => {
      if (cancelled) return;
      let msg = "ingest failed";
      try { msg = (JSON.parse(e.data) as { message?: string }).message ?? msg; } catch {}
      setState({ codebase: null, loading: false, error: msg, progress: null });
      es?.close();
    });

    es.onerror = () => {
      if (cancelled) return;
      setState((s) => {
        if (s.codebase || s.error) return s;
        return { ...s, loading: false, error: "stream connection lost", progress: null };
      });
      es?.close();
    };

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [repo.kind, "owner" in repo ? repo.owner : null, "repo" in repo ? repo.repo : null, "sha" in repo ? repo.sha : null]);

  return state;
}
