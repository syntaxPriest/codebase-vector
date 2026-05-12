import * as crypto from "crypto";
import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { WebSocketServer, type WebSocket } from "ws";
import {
  DEFAULT_EDITOR_CAPABILITIES,
  PORT_MAX,
  PORT_MIN,
  PROTOCOL_VERSION,
  encodeMessage,
  parseMessage,
  type SessionMessage,
} from "./protocol";

export interface SessionInfo {
  sessionId: string;
  port: number;
}

export interface SessionServer extends vscode.Disposable {
  readonly info: SessionInfo;
  readonly clientCount: number;
  onClientCountChanged(handler: (n: number) => void): vscode.Disposable;
  regenerateSession(): Promise<SessionInfo>;
}

const DISCOVERY_DIR = path.join(os.homedir(), ".codebase-vector", "sessions");

export async function startServer(context: vscode.ExtensionContext): Promise<SessionServer> {
  let sessionId = crypto.randomBytes(8).toString("hex");
  let port = await pickFreePort();

  const httpServer = http.createServer();
  const wss = new WebSocketServer({ server: httpServer });
  const clients = new Set<WebSocket>();
  const lastPongAt = new WeakMap<WebSocket, number>();
  const clientCountListeners = new Set<(n: number) => void>();

  function emitClientCount() {
    for (const fn of clientCountListeners) fn(clients.size);
  }

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const token = url.searchParams.get("session");
    const origin = req.headers.origin ?? "";
    if (token !== sessionId) {
      ws.close(1008, "invalid session");
      return;
    }
    if (!isOriginAllowed(origin)) {
      ws.close(1008, "origin not allowed");
      return;
    }

    clients.add(ws);
    lastPongAt.set(ws, Date.now());
    emitClientCount();

    ws.on("message", (data) => {
      const text = typeof data === "string" ? data : data.toString();
      const msg = parseMessage(text);
      if (!msg) return;
      if (msg.type === "pong") lastPongAt.set(ws, Date.now());
      void handleInbound(msg, ws);
    });
    ws.on("close", () => {
      clients.delete(ws);
      lastPongAt.delete(ws);
      emitClientCount();
    });

    // Hand-shake ack
    sendTo(ws, {
      v: PROTOCOL_VERSION,
      type: "ready",
      capabilities: DEFAULT_EDITOR_CAPABILITIES,
      clientName: `vscode ${vscode.version}`,
    });
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, "127.0.0.1", () => resolve());
  });

  await writeDiscovery(sessionId, port);

  // Mirror editor selection / active document into the workspace.
  const selectionDisp = vscode.window.onDidChangeTextEditorSelection((e) => {
    const editor = e.textEditor;
    const rel = relativise(editor.document.uri);
    if (!rel) return;
    const selection = editor.selection;
    const text = editor.document.getText(selection);
    broadcast({
      v: PROTOCOL_VERSION,
      type: "selection",
      path: rel,
      text,
      range: {
        startLine: selection.start.line + 1,
        startColumn: selection.start.character,
        endLine: selection.end.line + 1,
        endColumn: selection.end.character,
      },
    });
  });

  const activeEditorDisp = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (!editor) return;
    const rel = relativise(editor.document.uri);
    if (!rel) return;
    broadcast({
      v: PROTOCOL_VERSION,
      type: "open-file",
      path: rel,
      line: editor.selection.active.line + 1,
      column: editor.selection.active.character,
    });
  });

  // Rotate the session token whenever the workspace identity changes — the
  // discovery file is keyed off the workspace path and the token now grants
  // access to a different repo's selections, so old pair URLs should not work.
  const folderDisp = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    void regenerateSession();
  });

  const heartbeat = setInterval(() => {
    const cfg = vscode.workspace.getConfiguration("codebaseVector");
    const idleMs = Math.max(0, cfg.get<number>("idleTimeoutSeconds", 90)) * 1000;
    const now = Date.now();
    for (const c of clients) {
      // Drop stale clients that haven't responded to ping in idleMs
      if (idleMs > 0) {
        const last = lastPongAt.get(c) ?? now;
        if (now - last > idleMs) {
          c.close(1001, "idle timeout");
          continue;
        }
      }
      sendTo(c, { v: PROTOCOL_VERSION, type: "ping" });
    }
  }, 25_000);

  // ─── relay (cross-machine) ────────────────────────────────────
  // When `codebaseVector.relayUrl` is set, the extension also publishes
  // events to the hosted relay and subscribes to inbound messages from
  // browsers that paired via `relay:<sessionId>`. Local WS still works
  // in parallel — relay is purely additive.
  let relayAbort: AbortController | null = null;
  let relayClientId: string | null = null;

  function relayBaseUrl(): string {
    const cfg = vscode.workspace.getConfiguration("codebaseVector");
    return (cfg.get<string>("relayUrl", "") || "").replace(/\/$/, "");
  }

  async function relayPublish(msg: SessionMessage) {
    const base = relayBaseUrl();
    if (!base) return;
    try {
      await fetch(`${base}/api/session/relay/${encodeURIComponent(sessionId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: relayClientId, message: msg }),
      });
    } catch {
      // Best-effort — local WS clients still got the message.
    }
  }

  async function relaySubscribe() {
    const base = relayBaseUrl();
    if (!base) return;
    relayAbort?.abort();
    relayAbort = new AbortController();
    try {
      const res = await fetch(
        `${base}/api/session/relay/${encodeURIComponent(sessionId)}?role=editor`,
        { signal: relayAbort.signal, headers: { accept: "text/event-stream" } },
      );
      if (!res.ok || !res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const frame of frames) handleRelayFrame(frame);
      }
    } catch {
      // Network blip — caller can re-invoke; for now we just stop.
    }
  }

  function handleRelayFrame(frame: string) {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return;
    const data = dataLines.join("\n");
    if (event === "ready") {
      try {
        const parsed = JSON.parse(data) as { clientId?: string };
        if (parsed.clientId) relayClientId = parsed.clientId;
      } catch {}
      return;
    }
    const msg = parseMessage(data);
    if (!msg) return;
    if (msg.type === "ping") {
      void relayPublish({ v: PROTOCOL_VERSION, type: "pong" });
      return;
    }
    // Inbound from a browser paired via relay — funnel through the same
    // handler the local WS uses. The `ws` argument is unused for the
    // message types browsers send (prompt/open-file), so a no-op stub
    // is safe here.
    void handleInboundFromRelay(msg);
  }

  async function handleInboundFromRelay(msg: SessionMessage) {
    switch (msg.type) {
      case "prompt":   return handlePrompt(msg.target, msg.text);
      case "open-file": return handleOpenFile(msg.path, msg.line, msg.column);
      default:         return;
    }
  }

  void relaySubscribe();
  const relayCfgDisp = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("codebaseVector.relayUrl")) {
      relayAbort?.abort();
      relayClientId = null;
      void relaySubscribe();
    }
  });

  function broadcast(msg: SessionMessage) {
    const text = encodeMessage(msg);
    for (const c of clients) {
      if (c.readyState === c.OPEN) c.send(text);
    }
    void relayPublish(msg);
  }

  function sendTo(ws: WebSocket, msg: SessionMessage) {
    if (ws.readyState === ws.OPEN) ws.send(encodeMessage(msg));
  }

  async function handleInbound(msg: SessionMessage, ws: WebSocket) {
    switch (msg.type) {
      case "prompt":   return handlePrompt(msg.target, msg.text);
      case "open-file": return handleOpenFile(msg.path, msg.line, msg.column);
      case "pong":     return;
      case "ping":     return sendTo(ws, { v: PROTOCOL_VERSION, type: "pong" });
      default:         return;
    }
  }

  async function handlePrompt(target: string, text: string) {
    const cfg = vscode.workspace.getConfiguration("codebaseVector");
    const defaultAgent = cfg.get<string>("defaultAgent", "auto");
    const cli =
      target === "claude-code" ? "claude" :
      target === "codex"       ? "codex" :
      defaultAgent === "auto"  ? "claude" :
      defaultAgent;

    const escaped = `'${text.replace(/'/g, `'"'"'`)}'`;
    const cmd = `${cli} ${escaped}`;
    const term = vscode.window.activeTerminal ?? vscode.window.createTerminal("codebase agent");
    term.show(true);
    // sendText(text, false) types without auto-submit so the user can
    // glance over the prompt before pressing enter.
    term.sendText(cmd, false);
  }

  async function handleOpenFile(rel: string, line?: number, column?: number) {
    const root = vscode.workspace.workspaceFolders?.[0];
    if (!root) return;
    const target = vscode.Uri.joinPath(root.uri, rel);
    try {
      const doc = await vscode.workspace.openTextDocument(target);
      const editor = await vscode.window.showTextDocument(doc, { preview: false });
      if (typeof line === "number") {
        const pos = new vscode.Position(Math.max(0, line - 1), Math.max(0, column ?? 0));
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
      }
    } catch (err) {
      console.warn("[codebase-vector] open-file failed:", err);
    }
  }

  function relativise(uri: vscode.Uri): string | null {
    const root = vscode.workspace.workspaceFolders?.[0];
    if (!root) return null;
    if (uri.scheme !== "file") return null;
    const rel = path.relative(root.uri.fsPath, uri.fsPath);
    if (rel.startsWith("..")) return null;
    return rel.split(path.sep).join("/");
  }

  function isOriginAllowed(origin: string): boolean {
    if (!origin) return true; // some clients don't set Origin; the session token is still required
    const cfg = vscode.workspace.getConfiguration("codebaseVector");
    const configured = cfg.get<string>("workspaceUrl", "http://localhost:3000").replace(/\/$/, "");
    const extras = cfg.get<string[]>("allowedOrigins", []);
    const trimmed = origin.replace(/\/$/, "");
    if (trimmed === configured) return true;
    if (
      trimmed.startsWith("http://localhost") ||
      trimmed.startsWith("http://127.0.0.1") ||
      trimmed.startsWith("https://localhost")
    ) return true;
    for (const extra of extras) {
      const e = extra.replace(/\/$/, "");
      if (e && trimmed.startsWith(e)) return true;
    }
    return false;
  }

  async function regenerateSession(): Promise<SessionInfo> {
    await removeDiscovery(sessionId);
    sessionId = crypto.randomBytes(8).toString("hex");
    // Disconnect existing clients so they don't keep talking with the old token.
    for (const c of clients) c.close(1000, "session rotated");
    clients.clear();
    emitClientCount();
    await writeDiscovery(sessionId, port);
    relayAbort?.abort();
    relayClientId = null;
    void relaySubscribe();
    return { sessionId, port };
  }

  return {
    get info() { return { sessionId, port }; },
    get clientCount() { return clients.size; },
    onClientCountChanged(handler) {
      clientCountListeners.add(handler);
      return new vscode.Disposable(() => clientCountListeners.delete(handler));
    },
    regenerateSession,
    dispose() {
      clearInterval(heartbeat);
      selectionDisp.dispose();
      activeEditorDisp.dispose();
      folderDisp.dispose();
      relayCfgDisp.dispose();
      relayAbort?.abort();
      for (const c of clients) c.close(1001, "extension shutting down");
      clients.clear();
      wss.close();
      httpServer.close();
      void removeDiscovery(sessionId);
    },
  };
}

async function pickFreePort(): Promise<number> {
  for (let candidate = PORT_MIN; candidate <= PORT_MAX; candidate++) {
    if (await isPortFree(candidate)) return candidate;
  }
  throw new Error(`no free port in [${PORT_MIN}, ${PORT_MAX}]`);
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = http.createServer();
    probe.once("error", () => resolve(false));
    probe.listen(port, "127.0.0.1", () => {
      probe.close(() => resolve(true));
    });
  });
}

async function writeDiscovery(sessionId: string, port: number): Promise<void> {
  await fs.promises.mkdir(DISCOVERY_DIR, { recursive: true });
  const file = path.join(DISCOVERY_DIR, `${sessionId}.json`);
  await fs.promises.writeFile(
    file,
    JSON.stringify({
      sessionId,
      port,
      pid: process.pid,
      createdAt: Date.now(),
      workspacePath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null,
    }, null, 2),
    "utf8",
  );
}

async function removeDiscovery(sessionId: string): Promise<void> {
  try {
    await fs.promises.unlink(path.join(DISCOVERY_DIR, `${sessionId}.json`));
  } catch {}
}
