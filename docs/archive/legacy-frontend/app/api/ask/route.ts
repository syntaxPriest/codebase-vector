import type { NextRequest } from "next/server";
import { ask, isClaudeConfigured, type AskMode } from "@/lib/ai/ask";
import type { Codebase } from "@/lib/codebase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface AskBody {
  query?: string;
  codebase?: Codebase;
  mode?: AskMode;
}

const VALID_MODES: ReadonlySet<AskMode> = new Set<AskMode>(["explain", "trace", "deep"]);

// The client posts the codebase along with the query so this works
// uniformly for /demo, /r/[owner]/[repo], and pinned-SHA workspaces —
// no separate cache-aware path needed.
export async function POST(req: NextRequest) {
  let body: AskBody;
  try {
    body = (await req.json()) as AskBody;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const query = (body.query ?? "").trim();
  const codebase = body.codebase;
  const mode: AskMode = body.mode && VALID_MODES.has(body.mode) ? body.mode : "explain";

  if (!query) {
    return new Response("missing query", { status: 400 });
  }
  if (!codebase || !Array.isArray(codebase.allFiles)) {
    return new Response("missing or malformed codebase", { status: 400 });
  }

  try {
    const result = await ask(codebase, query, mode);
    return Response.json({ ...result, configured: isClaudeConfigured() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "ask failed";
    return new Response(message, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ configured: isClaudeConfigured() });
}
