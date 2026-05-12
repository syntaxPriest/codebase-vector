// In-memory hub for the cross-machine relay (Phase 5).
//
// Editors and browsers can't always share localhost — laptops on
// different networks, hosted IDEs, mobile clients. The relay gives them
// a common rendezvous: each side opens an SSE stream to
// `GET /api/session/relay/<id>` and POSTs messages to the same path.
//
// Caveat: the hub is a single-process Map. It works for `next dev`,
// `next start`, and any single-instance host (Fly machine, single VM).
// On multi-instance serverless platforms (Vercel default), two clients
// hitting different lambdas will never see each other — production
// deployments must front this with a sticky-session router or swap the
// Map for Redis pub/sub. The shape (subscribe / publish) is the same.

export interface RelayClient {
  id: string;
  role: "editor" | "browser" | "unknown";
  send: (line: string) => void;
  close: () => void;
}

interface Room {
  clients: Map<string, RelayClient>;
}

const rooms = new Map<string, Room>();

function getRoom(sessionId: string): Room {
  let room = rooms.get(sessionId);
  if (!room) {
    room = { clients: new Map() };
    rooms.set(sessionId, room);
  }
  return room;
}

export function joinRoom(sessionId: string, client: RelayClient): () => void {
  const room = getRoom(sessionId);
  room.clients.set(client.id, client);
  return () => {
    const r = rooms.get(sessionId);
    if (!r) return;
    r.clients.delete(client.id);
    if (r.clients.size === 0) rooms.delete(sessionId);
  };
}

export function publish(sessionId: string, payload: unknown, fromId?: string): number {
  const room = rooms.get(sessionId);
  if (!room) return 0;
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  let delivered = 0;
  for (const client of room.clients.values()) {
    if (fromId && client.id === fromId) continue;
    try {
      client.send(line);
      delivered++;
    } catch {
      // Stream is gone — drop it; the disposer on the SSE handler
      // already takes care of the room cleanup on close.
    }
  }
  return delivered;
}

export function roomStats(sessionId: string) {
  const room = rooms.get(sessionId);
  if (!room) return { clients: 0, editors: 0, browsers: 0 };
  let editors = 0;
  let browsers = 0;
  for (const c of room.clients.values()) {
    if (c.role === "editor") editors++;
    else if (c.role === "browser") browsers++;
  }
  return { clients: room.clients.size, editors, browsers };
}
