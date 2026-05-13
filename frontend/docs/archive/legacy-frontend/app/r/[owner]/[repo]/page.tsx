import type { Metadata } from "next";
import { ClientShell } from "@/components/workspace/ClientShell";

interface RepoParams {
  params: Promise<{ owner: string; repo: string }>;
}

export async function generateMetadata({ params }: RepoParams): Promise<Metadata> {
  const { owner, repo } = await params;
  return { title: `Codebase / ${owner}/${repo}` };
}

export default async function RepoPage({ params }: RepoParams) {
  const { owner, repo } = await params;
  return <ClientShell repo={{ kind: "github", owner, repo }} />;
}
