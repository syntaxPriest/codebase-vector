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

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data?: unknown) => {
        const payload = data === undefined ? "{}" : JSON.stringify(data);
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${payload}\n\n`));
      };

      try {
        const codebase = await ingestRepo(owner, repo, {
          sha,
          token,
          onProgress: (stage, info) => send("progress", { stage, ...(info ?? {}) }),
        });
        send("codebase", codebase);
      } catch (e) {
        const message = e instanceof Error ? e.message : "ingest failed";
        send("fail", { message });
      } finally {
        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
