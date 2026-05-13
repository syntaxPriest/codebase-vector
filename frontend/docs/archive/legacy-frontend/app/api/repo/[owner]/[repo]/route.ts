import type { NextRequest } from "next/server";
import { ingestRepo } from "@/lib/ingest/pipeline";
import { getGithubToken } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteCtx {
  params: Promise<{ owner: string; repo: string }>;
}

export async function GET(req: NextRequest, { params }: RouteCtx) {
  const { owner, repo } = await params;
  const url = new URL(req.url);
  const sha = url.searchParams.get("sha");
  const token = await getGithubToken();
  try {
    const codebase = await ingestRepo(owner, repo, { sha, token });
    return Response.json(codebase);
  } catch (e) {
    const message = e instanceof Error ? e.message : "ingest failed";
    return new Response(message, { status: 500 });
  }
}
