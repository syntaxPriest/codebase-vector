# Codebase Vector — VS Code Bridge

Pairs the [Codebase Vector workspace](../) with VS Code over a local
WebSocket so prompts and selections flow live between them.

## What it does

Once paired:

- **Right-click → Send to Claude Code / Cursor / Codex** in the workspace
  drops the prompt straight into the integrated terminal of the paired
  VS Code window. No clipboard step.
- **Open file** actions in the workspace's tree, treemap, or matrix
  views reveal the file in VS Code at the requested line.
- **Editor selection / active file** changes mirror back into the
  workspace so the visualization stays in sync with what you're
  reading.

If the bridge isn't paired (or the extension isn't installed), the
workspace's right-click actions transparently fall back to clipboard /
deep-link as before.

## Install

```sh
cd extension
npm install
npm run compile
```

Then in VS Code: **Run > Run Extension (F5)** — opens an Extension
Development Host with the bridge active.

To package for sideload:

```sh
npm run package
# produces codebase-vector-bridge-0.1.0.vsix
code --install-extension codebase-vector-bridge-0.1.0.vsix
```

## Pair

1. Open VS Code in the repo you're inspecting.
2. Run `Codebase Vector: Pair Workspace` from the command palette.
3. Pick **Open in Browser** — your default browser opens the workspace
   with `?pair=<session>:<port>` and the chip in the top bar reads
   `paired · vscode N.N`.

Alternatively run `Codebase Vector: Copy Pair Token`, paste the token
into the workspace's pair input (or into the URL as `?pair=<token>`).

The token is persisted in the browser's localStorage; reopening the
workspace tab reconnects without re-pairing.

## Configuration

| Setting | Default | Notes |
|---|---|---|
| `codebaseVector.workspaceUrl` | `http://localhost:3000` | Origin used to build pair URLs and validate inbound WS origins. |
| `codebaseVector.defaultAgent` | `auto` | Which CLI to type when an `active-chat` prompt arrives — `claude`, `codex`, or `auto`. |

## Protocol

Messages are JSON over WebSocket. Schema: `extension/src/protocol.ts`,
mirrored from `lib/session/protocol.ts` in the workspace. Versioned
discriminated union; every message carries `v: 1` and a `type`.

Inbound (browser → editor): `prompt`, `open-file`.
Outbound (editor → browser): `ready`, `selection`, `open-file`, `ping`.

Sessions are bound to a single random token written into
`~/.codebase-vector/sessions/<id>.json`. The WebSocket server only
accepts connections that present that token.

## Files

- `src/extension.ts` · activation, status bar, commands.
- `src/server.ts` · WebSocket server, port picker, discovery file,
  inbound `prompt` / `open-file` handlers, outbound mirroring.
- `src/protocol.ts` · vendored copy of the wire types.
