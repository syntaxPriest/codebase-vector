"use client";

import dynamic from "next/dynamic";
import type { Repo } from "@/lib/codebase/types";

const Shell = dynamic(
  () => import("./Shell").then((m) => m.Shell),
  {
    ssr: false,
    loading: () => <div className="w-full h-screen bg-white" />,
  }
);

interface ClientShellProps {
  repo: Repo;
}

export function ClientShell({ repo }: ClientShellProps) {
  return <Shell repo={repo} />;
}
