"use client";

import { type MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  MessageCircleQuestion,
  Plus,
  Send,
  Terminal,
  Wand,
} from "lucide-react";
import { useContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { dispatchToAgent, type AgentKey } from "@/lib/agents/dispatch";
import { PROTOCOL_VERSION, type SessionMessage } from "@/lib/session/protocol";
import type { CodebaseFile, Folder, Repo } from "@/lib/codebase/types";

type AgentTarget = Extract<AgentKey, "claude-code" | "cursor" | "codex" | "copy">;

interface BridgeApi {
  paired: boolean;
  send: (msg: SessionMessage) => boolean;
}

interface UseFileActionsOptions {
  repo: Repo;
  bridge: BridgeApi;
  isInContext: (path: string) => boolean;
  addToContext: (paths: string[]) => void;
  removeFromContext: (path: string) => void;
  onAsk?: (query: string) => void;
}

export interface FileActions {
  /** Open the standard file context menu at the event's coordinates. */
  openFileMenu: (e: ReactMouseEvent | { clientX: number; clientY: number; preventDefault: () => void }, file: CodebaseFile) => void;
  /** Open the folder context menu (add files to context, ask about folder). */
  openFolderMenu: (e: ReactMouseEvent | { clientX: number; clientY: number; preventDefault: () => void }, folder: Folder) => void;
  /** Send a file-anchored prompt to the named agent (or copy fallback). */
  sendToAgent: (target: AgentTarget, file: CodebaseFile) => void;
  /** Ask the paired editor to focus a file (no-op when not paired). */
  openInEditor: (file: CodebaseFile) => void;
  /** Most recent action toast — render somewhere visible. */
  toast: string | null;
}

function filePath(file: CodebaseFile): string {
  return file.path ?? file.name;
}

function fileIntent(path: string): string {
  return `Walk me through ${path}: explain what it does, the key functions or types, and how it fits with the rest of the codebase. Use @${path} as context.`;
}

function folderIntent(folder: Folder): string {
  return `Walk me through the ${folder.name}/ folder: what it contains, how it's organised, and the most important files to read first.`;
}

export function useFileActions(opts: UseFileActionsOptions): FileActions {
  const ctxMenu = useContextMenu();
  const [toast, setToast] = useState<string | null>(null);
  const { repo, bridge, isInContext, addToContext, removeFromContext, onAsk } = opts;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const sendToAgent = useCallback(
    (target: AgentTarget, file: CodebaseFile) => {
      const path = filePath(file);
      void (async () => {
        const result = await dispatchToAgent(
          target,
          { text: path, repo, refs: [path], intent: fileIntent(path) },
          { send: bridge.paired ? bridge.send : null },
        );
        setToast(result.message);
      })();
    },
    [repo, bridge.paired, bridge.send],
  );

  const openInEditor = useCallback(
    (file: CodebaseFile) => {
      const path = filePath(file);
      if (!bridge.paired) {
        setToast("not paired with editor — use the pair chip in the top bar");
        return;
      }
      const sent = bridge.send({ v: PROTOCOL_VERSION, type: "open-file", path });
      setToast(sent ? `opened ${file.name} in editor` : "couldn't reach editor");
    },
    [bridge.paired, bridge.send],
  );

  const fileMenuItems = useCallback(
    (file: CodebaseFile): ContextMenuItem[] => {
      const path = filePath(file);
      const inCtx = isInContext(path);
      const liveHint = bridge.paired ? "live" : undefined;
      return [
        {
          label: bridge.paired ? "Open in editor" : "Open in editor (pair first)",
          Icon: ExternalLink,
          disabled: !bridge.paired,
          onClick: () => openInEditor(file),
        },
        { label: "", separator: true },
        {
          label: "Send to Claude Code",
          Icon: Terminal,
          hint: liveHint ?? "CLI",
          onClick: () => sendToAgent("claude-code", file),
        },
        {
          label: "Send to Cursor",
          Icon: Send,
          hint: liveHint ?? "deep link",
          onClick: () => sendToAgent("cursor", file),
        },
        {
          label: "Send to Codex",
          Icon: Terminal,
          hint: liveHint ?? "CLI",
          onClick: () => sendToAgent("codex", file),
        },
        { label: "", separator: true },
        {
          label: "Copy as agent prompt",
          Icon: Wand,
          onClick: () => sendToAgent("copy", file),
        },
        {
          label: inCtx ? "Remove from AI context" : "Add to AI context",
          Icon: inCtx ? Check : Plus,
          onClick: () => {
            if (inCtx) removeFromContext(path);
            else addToContext([path]);
          },
        },
        ...(onAsk
          ? [
              { label: "", separator: true } as ContextMenuItem,
              {
                label: "Ask about this file",
                Icon: MessageCircleQuestion,
                onClick: () => onAsk(`Tell me about ${path}: what it does, how it fits in the codebase, and where it's used.`),
              } as ContextMenuItem,
            ]
          : []),
      ];
    },
    [bridge.paired, isInContext, addToContext, removeFromContext, openInEditor, sendToAgent, onAsk],
  );

  const folderMenuItems = useCallback(
    (folder: Folder): ContextMenuItem[] => {
      const paths = folder.files.map(filePath);
      const count = paths.length;
      return [
        {
          label: `Add ${count} ${count === 1 ? "file" : "files"} to AI context`,
          Icon: Plus,
          disabled: count === 0,
          onClick: () => addToContext(paths),
        },
        ...(onAsk
          ? [
              { label: "", separator: true } as ContextMenuItem,
              {
                label: `Ask about ${folder.name}/`,
                Icon: MessageCircleQuestion,
                onClick: () => onAsk(folderIntent(folder)),
              } as ContextMenuItem,
            ]
          : []),
      ];
    },
    [addToContext, onAsk],
  );

  const openFileMenu = useCallback(
    (e: ReactMouseEvent | { clientX: number; clientY: number; preventDefault: () => void }, file: CodebaseFile) => {
      ctxMenu.open(e, fileMenuItems(file));
    },
    [ctxMenu, fileMenuItems],
  );

  const openFolderMenu = useCallback(
    (e: ReactMouseEvent | { clientX: number; clientY: number; preventDefault: () => void }, folder: Folder) => {
      ctxMenu.open(e, folderMenuItems(folder));
    },
    [ctxMenu, folderMenuItems],
  );

  return useMemo(
    () => ({ openFileMenu, openFolderMenu, sendToAgent, openInEditor, toast }),
    [openFileMenu, openFolderMenu, sendToAgent, openInEditor, toast],
  );
}
