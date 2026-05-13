// Wire protocol shared between the workspace (browser) and the VS Code
// extension. Discriminated union so we can evolve safely; every consumer
// narrows on `type` and gets exhaustive checking.

export const PROTOCOL_VERSION = 1 as const

/** Inclusive range. The extension binds a free port from this window. */
export const PORT_MIN = 9700
export const PORT_MAX = 9799

export type Role = 'browser' | 'editor'

export interface Range {
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
}

interface MsgBase {
  v: typeof PROTOCOL_VERSION
  type: string
}

export interface HelloMsg extends MsgBase {
  type: 'hello'
  role: Role
  sessionId: string
  clientName: string
}

export interface ReadyMsg extends MsgBase {
  type: 'ready'
  capabilities: string[]
  clientName?: string
}

export interface PingMsg extends MsgBase { type: 'ping' }
export interface PongMsg extends MsgBase { type: 'pong' }

export interface RepoMsg extends MsgBase {
  type: 'repo'
  repoId: string
  name: string
  rootPath: string
}

export interface OpenFileMsg extends MsgBase {
  type: 'open-file'
  path: string
  line?: number
  column?: number
}

export interface SelectionMsg extends MsgBase {
  type: 'selection'
  path: string
  text: string
  range?: Range
}

export type AgentTarget = 'claude-code' | 'cursor' | 'codex' | 'active-chat'

export interface PromptMsg extends MsgBase {
  type: 'prompt'
  target: AgentTarget
  text: string
  refs?: string[]
}

export interface AgentReplyMsg extends MsgBase {
  type: 'agent-reply'
  text: string
  model?: string
  correlationId?: string
}

export interface ErrorMsg extends MsgBase {
  type: 'error'
  code: string
  message: string
}

export type SessionMessage =
  | HelloMsg
  | ReadyMsg
  | PingMsg
  | PongMsg
  | RepoMsg
  | OpenFileMsg
  | SelectionMsg
  | PromptMsg
  | AgentReplyMsg
  | ErrorMsg

export const isHello       = (m: SessionMessage): m is HelloMsg       => m.type === 'hello'
export const isReady       = (m: SessionMessage): m is ReadyMsg       => m.type === 'ready'
export const isPing        = (m: SessionMessage): m is PingMsg        => m.type === 'ping'
export const isPong        = (m: SessionMessage): m is PongMsg        => m.type === 'pong'
export const isRepo        = (m: SessionMessage): m is RepoMsg        => m.type === 'repo'
export const isOpenFile    = (m: SessionMessage): m is OpenFileMsg    => m.type === 'open-file'
export const isSelection   = (m: SessionMessage): m is SelectionMsg   => m.type === 'selection'
export const isPrompt      = (m: SessionMessage): m is PromptMsg      => m.type === 'prompt'
export const isAgentReply  = (m: SessionMessage): m is AgentReplyMsg  => m.type === 'agent-reply'
export const isErrorMsg    = (m: SessionMessage): m is ErrorMsg       => m.type === 'error'

export function parseMessage(raw: string | unknown): SessionMessage | null {
  let obj: unknown
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw) }
    catch { return null }
  } else {
    obj = raw
  }
  if (!obj || typeof obj !== 'object') return null
  const candidate = obj as { v?: unknown; type?: unknown }
  if (candidate.v !== PROTOCOL_VERSION) return null
  if (typeof candidate.type !== 'string') return null
  return obj as SessionMessage
}

export function encodeMessage(msg: SessionMessage): string {
  return JSON.stringify(msg)
}

export const DEFAULT_EDITOR_CAPABILITIES = ['prompt', 'open-file', 'selection', 'repo']
