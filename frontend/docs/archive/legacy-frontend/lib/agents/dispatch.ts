// Send a contextual prompt to a coding agent.
//
// Honest about the constraints:
//   - Claude Code & Codex are CLI-first, so we build a `claude "..."`
//     / `codex "..."` invocation and put it on the clipboard for the
//     user to paste in their terminal.
//   - Cursor exposes a `cursor://` URL scheme; we attempt to open it
//     and copy the prompt as a fallback so the user always has the
//     prompt no matter what.
//   - There is no browser primitive to "speak to the agent already
//     running in the editor" — the contract is: prompt + whatever
//     paste / deep-link path that agent supports.

import type { Repo } from "@/lib/codebase/types";
import { PROTOCOL_VERSION, type AgentTarget, type SessionMessage } from "@/lib/session/protocol";

export type AgentKey = "claude-code" | "cursor" | "codex" | "copy" | "raw";

export interface AgentDescriptor {
  key: AgentKey;
  label: string;
  hint?: string;
}

export interface PromptInput {
  /** Highlighted excerpt or other primary content. */
  text: string;
  /** Repo identity, used to anchor the prompt. */
  repo: Repo;
  /** What the user wants the agent to do — defaults to a generic helper. */
  intent?: string;
  /** Optional list of repo-relative paths to mention as @-refs. */
  refs?: string[];
}

export interface DispatchResult {
  ok: boolean;
  /** Short, user-facing description of what happened. */
  message: string;
  /** Whether something was put on the clipboard. */
  copied: boolean;
}

export const AGENT_TARGETS: AgentDescriptor[] = [
  { key: "claude-code", label: "Claude Code (CLI)",      hint: "claude \"…\"" },
  { key: "cursor",      label: "Cursor (deep link)",     hint: "cursor://" },
  { key: "codex",       label: "Codex CLI",              hint: "codex \"…\"" },
  { key: "copy",        label: "Copy as agent prompt" },
  { key: "raw",         label: "Copy raw text" },
];

// ──────────────────────────────────────────────────────────────
// Prompt builder
// ──────────────────────────────────────────────────────────────
function repoTag(repo: Repo): string {
  return repo.kind === "github" ? `${repo.owner}/${repo.repo}` : "this codebase";
}

const DEFAULT_INTENT =
  "Help me understand this in the context of the codebase. Identify which files implement (or should implement) it, walk me through how they fit together, and suggest concrete next steps.";

export function buildAgentPrompt(input: PromptInput): string {
  const lines: string[] = [];
  lines.push(`Working in: ${repoTag(input.repo)}`);
  lines.push("");
  lines.push("Excerpt I'm asking about:");
  lines.push('"""');
  lines.push(input.text.trim());
  lines.push('"""');
  lines.push("");
  if (input.refs && input.refs.length > 0) {
    lines.push("Relevant files (already in @-ref form for paste):");
    lines.push(input.refs.map((p) => `@${p}`).join(" "));
    lines.push("");
  }
  lines.push(input.intent ?? DEFAULT_INTENT);
  return lines.join("\n");
}

// ──────────────────────────────────────────────────────────────
// Per-target dispatchers
// ──────────────────────────────────────────────────────────────
function shellEscape(text: string): string {
  // Wrap in single quotes; close, escape, reopen for any internal '
  return `'${text.replace(/'/g, `'"'"'`)}'`;
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function sendClaudeCode(prompt: string): Promise<DispatchResult> {
  const cmd = `claude ${shellEscape(prompt)}`;
  const ok = await writeClipboard(cmd);
  return ok
    ? { ok: true, copied: true, message: "claude command copied · paste in your terminal" }
    : { ok: false, copied: false, message: "couldn't access clipboard" };
}

async function sendCursor(prompt: string): Promise<DispatchResult> {
  const ok = await writeClipboard(prompt);
  // Best-effort deep link. If Cursor's protocol handler is registered
  // it'll focus the IDE; if not, we silently fail and the user still
  // has the prompt on the clipboard.
  try {
    if (typeof window !== "undefined") {
      const url = `cursor://anysphere.cursor-deeplink/chat?prompt=${encodeURIComponent(prompt)}`;
      window.location.href = url;
    }
  } catch {
    // ignore — fall back to clipboard
  }
  return ok
    ? { ok: true, copied: true, message: "prompt copied · cursor deep link opened (paste if it didn't focus)" }
    : { ok: false, copied: false, message: "couldn't access clipboard" };
}

async function sendCodex(prompt: string): Promise<DispatchResult> {
  const cmd = `codex ${shellEscape(prompt)}`;
  const ok = await writeClipboard(cmd);
  return ok
    ? { ok: true, copied: true, message: "codex command copied · paste in your terminal" }
    : { ok: false, copied: false, message: "couldn't access clipboard" };
}

async function copyPromptOnly(prompt: string): Promise<DispatchResult> {
  const ok = await writeClipboard(prompt);
  return ok
    ? { ok: true, copied: true, message: "prompt copied to clipboard" }
    : { ok: false, copied: false, message: "couldn't access clipboard" };
}

async function copyRaw(text: string): Promise<DispatchResult> {
  const ok = await writeClipboard(text);
  return ok
    ? { ok: true, copied: true, message: "text copied to clipboard" }
    : { ok: false, copied: false, message: "couldn't access clipboard" };
}

export interface DispatchOptions {
  /** Live editor bridge. When the workspace is paired, agent prompts
   * are delivered through here instead of the clipboard so they land
   * directly in the editor. */
  send?: ((msg: SessionMessage) => boolean) | null;
}

const AGENT_TARGET: Partial<Record<AgentKey, AgentTarget>> = {
  "claude-code": "claude-code",
  cursor: "cursor",
  codex: "codex",
};

function prettyTarget(t: AgentTarget): string {
  switch (t) {
    case "claude-code":  return "Claude Code";
    case "cursor":       return "Cursor";
    case "codex":        return "Codex";
    case "active-chat":  return "the active chat";
  }
}

export async function dispatchToAgent(
  target: AgentKey,
  input: PromptInput,
  opts: DispatchOptions = {},
): Promise<DispatchResult> {
  const prompt = buildAgentPrompt(input);
  const wireTarget = AGENT_TARGET[target];

  // Prefer the live bridge for agent targets — direct delivery to the
  // paired editor. Fall through to clipboard on send failure so the
  // user always gets *something* paste-able.
  if (wireTarget && opts.send) {
    const sent = opts.send({
      v: PROTOCOL_VERSION,
      type: "prompt",
      target: wireTarget,
      text: prompt,
      refs: input.refs,
    });
    if (sent) {
      return {
        ok: true,
        copied: false,
        message: `prompt sent to ${prettyTarget(wireTarget)} via paired editor`,
      };
    }
  }

  switch (target) {
    case "claude-code": return sendClaudeCode(prompt);
    case "cursor":      return sendCursor(prompt);
    case "codex":       return sendCodex(prompt);
    case "copy":        return copyPromptOnly(prompt);
    case "raw":         return copyRaw(input.text);
  }
}
