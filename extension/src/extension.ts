import * as vscode from "vscode";
import { startServer, type SessionServer } from "./server";

let server: SessionServer | undefined;
let statusItem: vscode.StatusBarItem | undefined;

export async function activate(context: vscode.ExtensionContext) {
  try {
    server = await startServer(context);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Codebase Vector bridge failed to start: ${err instanceof Error ? err.message : String(err)}`,
    );
    return;
  }

  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusItem.command = "codebaseVector.pair";
  refreshStatus(0);
  statusItem.show();
  context.subscriptions.push(statusItem);
  context.subscriptions.push(server.onClientCountChanged((n) => refreshStatus(n)));

  context.subscriptions.push(
    vscode.commands.registerCommand("codebaseVector.pair",            () => commandPair()),
    vscode.commands.registerCommand("codebaseVector.copyPairToken",   () => commandCopyToken()),
    vscode.commands.registerCommand("codebaseVector.regenerateSession", () => commandRegenerate()),
  );

  context.subscriptions.push(server);
}

export function deactivate() {
  // The Disposable in subscriptions handles teardown.
}

function refreshStatus(clientCount: number) {
  if (!statusItem || !server) return;
  const { port } = server.info;
  if (clientCount > 0) {
    statusItem.text = `$(plug) codebase ⏺`;
    statusItem.tooltip = `Codebase Vector paired (${clientCount} client${clientCount === 1 ? "" : "s"})\n· port ${port}\n· click to copy pair URL`;
  } else {
    statusItem.text = `$(plug) codebase`;
    statusItem.tooltip = `Codebase Vector waiting for pair · port ${port}\n· click to copy pair URL`;
  }
}

async function commandPair() {
  if (!server) return;
  const { sessionId, port } = server.info;
  const cfg = vscode.workspace.getConfiguration("codebaseVector");
  const base = cfg.get<string>("workspaceUrl", "http://localhost:3000").replace(/\/$/, "");
  const url = `${base}/?pair=${sessionId}:${port}`;
  const choice = await vscode.window.showInformationMessage(
    `Pair Codebase Vector workspace · ${sessionId.slice(0, 8)}…:${port}`,
    { modal: false },
    "Open in Browser",
    "Copy URL",
    "Copy Token",
  );
  if (choice === "Open in Browser") {
    vscode.env.openExternal(vscode.Uri.parse(url));
  } else if (choice === "Copy URL") {
    await vscode.env.clipboard.writeText(url);
    vscode.window.setStatusBarMessage("$(check) pair URL copied", 2000);
  } else if (choice === "Copy Token") {
    await vscode.env.clipboard.writeText(`${sessionId}:${port}`);
    vscode.window.setStatusBarMessage("$(check) pair token copied", 2000);
  }
}

async function commandCopyToken() {
  if (!server) return;
  const { sessionId, port } = server.info;
  await vscode.env.clipboard.writeText(`${sessionId}:${port}`);
  vscode.window.setStatusBarMessage("$(check) pair token copied", 2000);
}

async function commandRegenerate() {
  if (!server) return;
  const next = await server.regenerateSession();
  vscode.window.setStatusBarMessage(`$(check) new session · ${next.sessionId.slice(0, 8)}…`, 2500);
  refreshStatus(server.clientCount);
}
