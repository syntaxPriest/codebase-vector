"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PROTOCOL_VERSION,
  PORT_MIN,
  PORT_MAX,
  encodeMessage,
  parseMessage,
  type SessionMessage,
} from "@/lib/session/protocol";

const STORAGE_KEY = "codebase-vector:pair";
const PAIR_PARAM = "pair";
const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 20_000;

type PairToken =
  | { mode: "local"; sessionId: string; port: number }
  | { mode: "relay"; sessionId: string };

export type MessageHandler = (msg: SessionMessage) => void;

export interface SessionBridge {
  /** Token is configured (we have something to attempt). */
  configured: boolean;
  /** Transport (WS or SSE) is open. */
  connected: boolean;
  /** Editor side has acknowledged with a `ready` message (local mode)
   *  or relay reports an editor in the room (relay mode). */
  paired: boolean;
  sessionId: string | null;
  port: number | null;
  /** "local" | "relay" — useful for the chip's tooltip. */
  mode: "local" | "relay" | null;
  /** Editor name from the most recent `ready` message. */
  editorName: string | null;
  /** Returns true when the message was handed to the transport. */
  send: (msg: SessionMessage) => boolean;
  /** Subscribe to inbound editor messages. The handler runs outside
   *  React state so high-frequency events (selection on every cursor
   *  move) don't cause re-renders. Returns an unsubscribe fn. Ping
   *  keepalives are handled internally and are never delivered. */
  subscribe: (handler: MessageHandler) => () => void;
  /** Manually configure a pair token. Accepts either the raw
   *  "<sessionId>:<port>" / "relay:<sessionId>" form or a full URL
   *  with ?pair=… in the query string. Returns true if parsed. */
  pair: (raw: string) => boolean;
  /** Forget the saved pair token and drop the connection. */
  unpair: () => void;
}

function parsePairToken(raw: string | null | undefined): PairToken | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  // Relay form: "relay:<sessionId>" — no port; messages flow over SSE+POST.
  if (value.startsWith("relay:")) {
    const sessionId = value.slice("relay:".length).trim();
    return sessionId ? { mode: "relay", sessionId } : null;
  }

  // Local form: "<sessionId>:<port>".
  const idx = value.lastIndexOf(":");
  if (idx <= 0) return null;
  const sessionId = value.slice(0, idx).trim();
  const port = Number.parseInt(value.slice(idx + 1), 10);
  if (!sessionId || !Number.isFinite(port)) return null;
  if (port < PORT_MIN || port > PORT_MAX) return null;
  return { mode: "local", sessionId, port };
}

function tokenToString(token: PairToken): string {
  return token.mode === "relay"
    ? `relay:${token.sessionId}`
    : `${token.sessionId}:${token.port}`;
}

function readStoredPair(): PairToken | null {
  try {
    return parsePairToken(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStoredPair(token: PairToken) {
  try {
    localStorage.setItem(STORAGE_KEY, tokenToString(token));
  } catch {}
}

function clearStoredPair() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

/**
 * Discover a pair token at mount. URL `?pair=…` wins (and is then
 * scrubbed from the address bar so it doesn't leak into shares);
 * otherwise we use a previously-saved one from localStorage.
 */
function discoverToken(): PairToken | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const fromUrl = parsePairToken(params.get(PAIR_PARAM));
  if (fromUrl) {
    writeStoredPair(fromUrl);
    params.delete(PAIR_PARAM);
    const qs = params.toString();
    const cleaned = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState({}, "", cleaned);
    return fromUrl;
  }
  return readStoredPair();
}

export function useSessionBridge(): SessionBridge {
  const [token, setToken] = useState<PairToken | null>(null);
  const [connected, setConnected] = useState(false);
  const [paired, setPaired] = useState(false);
  const [editorName, setEditorName] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const relayClientIdRef = useRef<string | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const attemptRef = useRef(0);
  // Subscriber set lives in a ref so adding/removing handlers (or
  // delivering messages) never triggers a render of this hook.
  const subscribersRef = useRef<Set<MessageHandler>>(new Set());

  const dispatchInbound = (msg: SessionMessage) => {
    for (const fn of subscribersRef.current) {
      try { fn(msg); } catch { /* a bad handler shouldn't break others */ }
    }
  };

  useEffect(() => {
    setToken(discoverToken());
  }, []);

  useEffect(() => {
    if (!token) return;
    cancelledRef.current = false;
    attemptRef.current = 0;

    const scheduleReconnect = (run: () => void) => {
      if (cancelledRef.current) return;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      attemptRef.current += 1;
      const backoff = Math.min(
        RECONNECT_MAX_MS,
        RECONNECT_BASE_MS * Math.pow(1.6, attemptRef.current - 1),
      );
      reconnectTimer.current = setTimeout(run, backoff);
    };

    if (token.mode === "local") {
      const connect = () => {
        if (cancelledRef.current) return;
        const url = `ws://127.0.0.1:${token.port}/?session=${encodeURIComponent(token.sessionId)}`;
        let ws: WebSocket;
        try {
          ws = new WebSocket(url);
        } catch {
          scheduleReconnect(connect);
          return;
        }
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelledRef.current) { ws.close(); return; }
          setConnected(true);
          attemptRef.current = 0;
          ws.send(encodeMessage({
            v: PROTOCOL_VERSION,
            type: "hello",
            role: "browser",
            sessionId: token.sessionId,
            clientName: "codebase-vector-web",
          }));
        };

        ws.onmessage = (evt) => {
          const text = typeof evt.data === "string" ? evt.data : "";
          const msg = parseMessage(text);
          if (!msg) return;
          if (msg.type === "ready") {
            setPaired(true);
            setEditorName(msg.clientName ?? null);
          }
          if (msg.type === "ping") {
            // Reply to keepalives at the transport layer; consumers
            // don't see them.
            ws.send(encodeMessage({ v: PROTOCOL_VERSION, type: "pong" }));
            return;
          }
          // Dispatch via subscriber refs — this does NOT cause React
          // to re-render the hook or its consumers. Selection events
          // from VS Code can fire on every cursor move; surfacing them
          // through state would re-render the whole tree per keystroke.
          dispatchInbound(msg);
        };

        ws.onclose = () => {
          if (wsRef.current === ws) wsRef.current = null;
          setConnected(false);
          setPaired(false);
          setEditorName(null);
          scheduleReconnect(connect);
        };

        ws.onerror = () => { /* let onclose drive reconnect */ };
      };

      connect();

      return () => {
        cancelledRef.current = true;
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        const ws = wsRef.current;
        wsRef.current = null;
        ws?.close();
        setConnected(false);
        setPaired(false);
        setEditorName(null);
      };
    }

    // Relay mode — SSE for inbound, POST for outbound. The relay is just
    // a pipe; "paired" means the relay reported an editor in the room.
    const connect = () => {
      if (cancelledRef.current) return;
      const url = `/api/session/relay/${encodeURIComponent(token.sessionId)}?role=browser`;
      let es: EventSource;
      try {
        es = new EventSource(url);
      } catch {
        scheduleReconnect(connect);
        return;
      }
      sseRef.current = es;

      es.onopen = () => {
        if (cancelledRef.current) { es.close(); return; }
        setConnected(true);
        attemptRef.current = 0;
      };

      es.addEventListener("ready", (evt) => {
        try {
          const data = JSON.parse((evt as MessageEvent).data) as {
            clientId?: string; editors?: number;
          };
          if (data.clientId) relayClientIdRef.current = data.clientId;
          if (typeof data.editors === "number" && data.editors > 0) setPaired(true);
        } catch {}
      });

      es.onmessage = (evt) => {
        const msg = parseMessage(evt.data);
        if (!msg) return;
        if (msg.type === "ready") {
          setPaired(true);
          setEditorName(msg.clientName ?? null);
        }
        if (msg.type === "ping") {
          void postRelay(token.sessionId, relayClientIdRef.current, {
            v: PROTOCOL_VERSION, type: "pong",
          });
          return;
        }
        dispatchInbound(msg);
      };

      es.onerror = () => {
        // EventSource auto-reconnects, but if the server returns a hard
        // error (e.g. 4xx) it stays in a dead state — close + back off.
        if (es.readyState === EventSource.CLOSED) {
          if (sseRef.current === es) sseRef.current = null;
          setConnected(false);
          setPaired(false);
          setEditorName(null);
          scheduleReconnect(connect);
        }
      };
    };

    connect();

    return () => {
      cancelledRef.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      const es = sseRef.current;
      sseRef.current = null;
      es?.close();
      relayClientIdRef.current = null;
      setConnected(false);
      setPaired(false);
      setEditorName(null);
    };
  }, [token]);

  const send = useCallback((msg: SessionMessage): boolean => {
    if (token?.mode === "relay") {
      if (!sseRef.current) return false;
      void postRelay(token.sessionId, relayClientIdRef.current, msg);
      return true;
    }
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(encodeMessage(msg));
      return true;
    } catch {
      return false;
    }
  }, [token]);

  const unpair = useCallback(() => {
    clearStoredPair();
    setToken(null);
  }, []);

  const pair = useCallback((raw: string): boolean => {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    // Accept a full URL — pull the ?pair=… off the query string first.
    let candidate = trimmed;
    try {
      const url = new URL(trimmed);
      const fromQuery = url.searchParams.get(PAIR_PARAM);
      if (fromQuery) candidate = fromQuery;
    } catch {
      // not a URL → treat as a bare token
    }
    const parsed = parsePairToken(candidate);
    if (!parsed) return false;
    writeStoredPair(parsed);
    setToken(parsed);
    return true;
  }, []);

  const subscribe = useCallback((handler: MessageHandler) => {
    subscribersRef.current.add(handler);
    return () => {
      subscribersRef.current.delete(handler);
    };
  }, []);

  // Memoise the return so consumers can depend on `bridge` itself in
  // effect deps without re-firing on every parent render. Identity
  // changes only when something semantic changed.
  return useMemo<SessionBridge>(() => ({
    configured: token !== null,
    connected,
    paired,
    sessionId: token?.sessionId ?? null,
    port: token?.mode === "local" ? token.port : null,
    mode: token?.mode ?? null,
    editorName,
    send,
    subscribe,
    pair,
    unpair,
  }), [token, connected, paired, editorName, send, subscribe, pair, unpair]);
}

async function postRelay(sessionId: string, from: string | null, message: SessionMessage) {
  try {
    await fetch(`/api/session/relay/${encodeURIComponent(sessionId)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from, message }),
    });
  } catch {
    // The next outbound attempt will retry; nothing useful to do here.
  }
}
