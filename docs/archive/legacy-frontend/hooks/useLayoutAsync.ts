"use client";

import { useEffect, useRef, useState } from "react";
import { getGraph } from "@/lib/codebase/generator";
import { forceLayoutStep, recommendedIterations } from "@/lib/layout/forceLayout";
import type { Codebase, Graph } from "@/lib/codebase/types";

export interface LayoutOptions {
  hideTests?: boolean;
}

export interface UseLayoutAsyncResult {
  graph: Graph | null;
  progress: number;
}

// Builds the (nodes, edges) graph for `view` and runs the force layout
// across animation frames so the main thread stays responsive on big
// graphs. Caches the laid-out result per (codebase identity, view, opts).
export function useLayoutAsync(
  codebase: Codebase,
  view: string,
  opts: LayoutOptions = {},
): UseLayoutAsyncResult {
  const hideTests = opts.hideTests ?? false;
  const [graph, setGraph] = useState<Graph | null>(null);
  const [progress, setProgress] = useState(0);
  const cache = useRef(new WeakMap<Codebase, Map<string, Graph>>());

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `${view}::${hideTests ? 1 : 0}`;

    let perCodebase = cache.current.get(codebase);
    if (!perCodebase) {
      perCodebase = new Map<string, Graph>();
      cache.current.set(codebase, perCodebase);
    }
    const cached = perCodebase.get(cacheKey);
    if (cached) {
      setGraph(cached);
      setProgress(1);
      return;
    }

    const g = getGraph(codebase, view);
    if (g.nodes.length === 0) {
      perCodebase.set(cacheKey, g);
      setGraph(g);
      setProgress(1);
      return;
    }

    const TOTAL = recommendedIterations(g.nodes.length);
    const CHUNK = g.nodes.length > 100 ? 4 : 12;
    let iter = 0;

    setGraph(null);
    setProgress(0);

    const step = () => {
      if (cancelled) return;
      const todo = Math.min(CHUNK, TOTAL - iter);
      for (let i = 0; i < todo; i++) forceLayoutStep(g.nodes, g.edges);
      iter += todo;
      if (iter >= TOTAL) {
        perCodebase!.set(cacheKey, g);
        setGraph(g);
        setProgress(1);
      } else {
        setProgress(iter / TOTAL);
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);

    return () => { cancelled = true; };
  }, [codebase, view, hideTests]);

  return { graph, progress };
}
