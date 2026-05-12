import type { Metadata } from "next";
import { ClientShell } from "@/components/workspace/ClientShell";

interface PinnedParams {
  params: Promise<{ owner: string; repo: string; sha: string }>;
}

export async function generateMetadata({ params }: PinnedParams): Promise<Metadata> {
  const { owner, repo, sha } = await params;
  return { title: `Codebase / ${owner}/${repo}@${sha.slice(0, 7)}` };
}

export default async function PinnedRepoPage({ params }: PinnedParams) {
  const { owner, repo, sha } = await params;
  return <ClientShell repo={{ kind: "github", owner, repo, sha }} />;
}
