// Vendored copy of the wire protocol. Kept in sync by hand for now —
// the extension needs to compile standalone, so we duplicate the
// types rather than importing across project boundaries.

export const PROTOCOL_VERSION = 1 as const;
export const PORT_MIN = 9700;
export const PORT_MAX = 9799;

export type Role = "browser" | "editor";
export type AgentTarget = "claude-code" | "cursor" | "codex" | "active-chat";

export interface Range {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

interface MsgBase { v: typeof PROTOCOL_VERSION; type: string; }

export interface HelloMsg extends MsgBase { type: "hello"; role: Role; sessionId: string; clientName: string; }
export interface ReadyMsg extends MsgBase { type: "ready"; capabilities: string[]; clientName?: string; }
export interface PingMsg extends MsgBase { type: "ping" }
export interface PongMsg extends MsgBase { type: "pong" }
export interface RepoMsg extends MsgBase { type: "repo"; owner: string; repo: string; sha?: string; branch?: string; }
export interface OpenFileMsg extends MsgBase { type: "open-file"; path: string; line?: number; column?: number; }
export interface SelectionMsg extends MsgBase { type: "selection"; path: string; text: string; range?: Range; }
export interface PromptMsg extends MsgBase { type: "prompt"; target: AgentTarget; text: string; refs?: string[]; }
export interface AgentReplyMsg extends MsgBase { type: "agent-reply"; text: string; model?: string; correlationId?: string; }
export interface ErrorMsg extends MsgBase { type: "error"; code: string; message: string; }

export type SessionMessage =
  | HelloMsg | ReadyMsg | PingMsg | PongMsg
  | RepoMsg | OpenFileMsg | SelectionMsg
  | PromptMsg | AgentReplyMsg | ErrorMsg;

export const DEFAULT_EDITOR_CAPABILITIES = ["prompt", "open-file", "selection", "repo"];

export function parseMessage(raw: string): SessionMessage | null {
  let obj: unknown;
  try { obj = JSON.parse(raw); } catch { return null; }
  if (!obj || typeof obj !== "object") return null;
  const c = obj as { v?: unknown; type?: unknown };
  if (c.v !== PROTOCOL_VERSION) return null;
  if (typeof c.type !== "string") return null;
  return obj as SessionMessage;
}

export function encodeMessage(msg: SessionMessage): string {
  return JSON.stringify(msg);
}
