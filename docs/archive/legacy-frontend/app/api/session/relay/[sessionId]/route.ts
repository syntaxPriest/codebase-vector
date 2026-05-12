// Cross-machine relay endpoint.
//
//   GET  /api/session/relay/<id>?role=editor|browser   → SSE stream
//   POST /api/session/relay/<id>                       → publish a message
//
// The relay is dumb: it doesn't validate message shape or remember
// state. The session id is the shared secret — anyone with the id can
// read and write. Treat the id like a bearer token (rotate via the
// extension's "New Session" command if it leaks).

import type { NextRequest } from "next/server";
import { joinRoom, publish, roomStats, type RelayClient } from "@/lib/session/relay";
import { parseMessage } from "@/lib/session/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ sessionId: string }>;
}

const HEARTBEAT_MS = 25_000;

export async function GET(req: NextRequest, { params }: RouteCtx) {
  const { sessionId } = await params;
  if (!sessionId) return new Response("missing session id", { status: 400 });

  const url = new URL(req.url);
  const role = (url.searchParams.get("role") ?? "unknown") as RelayClient["role"];
  const clientId = `${role}-${Math.random().toString(36).slice(2, 10)}`;

  const encoder = new TextEncoder();
  let leave: (() => void) | null = null;
  let heartbeat: NodeJS.Timeout | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (line: string) => controller.enqueue(encoder.encode(line));

      // Initial frames: hello + room stats so a fresh subscriber knows
      // who else is on the line without waiting for traffic.
      send(`: connected ${clientId}\n\n`);
      send(`event: ready\ndata: ${JSON.stringify({ clientId, role, ...roomStats(sessionId) })}\n\n`);

      const client: RelayClient = {
        id: clientId,
        role,
        send,
        close() {
          try { controller.close(); } catch {}
        },
      };
      leave = joinRoom(sessionId, client);

      heartbeat = setInterval(() => {
        try { send(`: ping\n\n`); } catch {}
      }, HEARTBEAT_MS);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      leave?.();
    },
  });

  // Disconnect when the client aborts the request — Next runs cancel()
  // for native ReadableStream consumers, but explicit AbortSignal
  // wiring keeps Node fetch happy too.
  req.signal.addEventListener("abort", () => {
    if (heartbeat) clearInterval(heartbeat);
    leave?.();
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const { sessionId } = await params;
  if (!sessionId) return new Response("missing session id", { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  // Accept either a bare SessionMessage or `{ from?, message }` so a
  // client can self-identify and avoid receiving its own echo.
  let from: string | undefined;
  let payload: unknown = body;
  if (body && typeof body === "object" && "message" in (body as Record<string, unknown>)) {
    const wrapped = body as { from?: unknown; message?: unknown };
    if (typeof wrapped.from === "string") from = wrapped.from;
    payload = wrapped.message;
  }

  const text = typeof payload === "string" ? payload : JSON.stringify(payload);
  const parsed = parseMessage(text);
  if (!parsed) return new Response("invalid message", { status: 400 });

  const delivered = publish(sessionId, parsed, from);
  return Response.json({ delivered });
}
