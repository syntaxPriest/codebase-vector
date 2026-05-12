// Model Context Protocol (MCP) server endpoint.
//
// Exposes the workspace's ingestion + ask pipelines to MCP-aware coding
// agents (Claude Code, Cursor, Codex CLI) so they can pull repo context
// without screen-scraping the UI. Implements the JSON-RPC subset MCP
// clients actually use: `initialize`, `tools/list`, `tools/call`.
//
// Tools:
//   getRepoIndex(owner, repo, sha?)   → file/folder graph from cache
//   getReadme(owner, repo, sha?)      → top-level README markdown
//   findFeature(owner, repo, query)   → ask() result with files/edges/agentPrompt

import type { NextRequest } from "next/server";
import { readCache } from "@/lib/ingest/cache";
import { ingestRepo } from "@/lib/ingest/pipeline";
import { ask } from "@/lib/ai/ask";
import { getGithubToken } from "@/lib/auth/session";
import type { Codebase } from "@/lib/codebase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MCP_PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "codebase-vector", version: "0.1.0" };

interface JsonRpcRequest {
  jsonrpc?: "2.0";
  id?: number | string | null;
  method?: string;
  params?: unknown;
}

type JsonRpcId = number | string | null;

function rpcResult(id: JsonRpcId, result: unknown) {
  return Response.json({ jsonrpc: "2.0", id, result });
}

function rpcError(id: JsonRpcId, code: number, message: string, data?: unknown) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message, data } });
}

const TOOLS = [
  {
    name: "getRepoIndex",
    description:
      "Return the codebase index (folders, files, imports, meta) for a GitHub repository. Reads from local ingest cache when available; otherwise ingests on demand.",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "GitHub repo owner / org." },
        repo: { type: "string", description: "GitHub repo name." },
        sha: { type: "string", description: "Optional commit sha to pin to." },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "getReadme",
    description: "Return the top-level README markdown for a GitHub repository, if any.",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        sha: { type: "string" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "findFeature",
    description:
      "Ask the codebase a free-form question (e.g. 'how does auth work?'). Returns a summary, explanation, role-tagged file list, edges, and a paste-ready agent prompt.",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        query: { type: "string", description: "What the developer wants to understand." },
        sha: { type: "string" },
      },
      required: ["owner", "repo", "query"],
    },
  },
] as const;

async function loadCodebase(owner: string, repo: string, sha?: string): Promise<Codebase> {
  const cached = await readCache(owner, repo);
  if (cached) {
    if (!sha || cached.meta?.sha === sha) return cached;
  }
  const token = await getGithubToken();
  return ingestRepo(owner, repo, { sha: sha ?? null, token });
}

function asString(v: unknown, field: string): string {
  if (typeof v !== "string" || !v) throw new Error(`missing or invalid '${field}'`);
  return v;
}

function asOptionalString(v: unknown): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

function textContent(value: unknown) {
  return [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }];
}

async function dispatchTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "getRepoIndex": {
      const owner = asString(args.owner, "owner");
      const repo = asString(args.repo, "repo");
      const sha = asOptionalString(args.sha);
      const codebase = await loadCodebase(owner, repo, sha);
      return { content: textContent(codebase), structuredContent: codebase };
    }
    case "getReadme": {
      const owner = asString(args.owner, "owner");
      const repo = asString(args.repo, "repo");
      const sha = asOptionalString(args.sha);
      const codebase = await loadCodebase(owner, repo, sha);
      const readme = codebase.readme ?? "";
      return {
        content: [{ type: "text", text: readme || "_(no README found)_" }],
        structuredContent: { readme, meta: codebase.meta ?? null },
      };
    }
    case "findFeature": {
      const owner = asString(args.owner, "owner");
      const repo = asString(args.repo, "repo");
      const query = asString(args.query, "query");
      const sha = asOptionalString(args.sha);
      const codebase = await loadCodebase(owner, repo, sha);
      const result = await ask(codebase, query);
      return { content: textContent(result), structuredContent: result };
    }
    default:
      throw new Error(`unknown tool '${name}'`);
  }
}

export async function POST(req: NextRequest) {
  let body: JsonRpcRequest;
  try {
    body = (await req.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, "parse error");
  }

  const id = (body.id ?? null) as JsonRpcId;
  const method = body.method;
  if (typeof method !== "string") return rpcError(id, -32600, "invalid request");

  try {
    if (method === "initialize") {
      return rpcResult(id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        serverInfo: SERVER_INFO,
        capabilities: { tools: { listChanged: false } },
      });
    }
    if (method === "notifications/initialized" || method === "ping") {
      return rpcResult(id, {});
    }
    if (method === "tools/list") {
      return rpcResult(id, { tools: TOOLS });
    }
    if (method === "tools/call") {
      const params = (body.params ?? {}) as { name?: unknown; arguments?: unknown };
      const name = typeof params.name === "string" ? params.name : "";
      const args =
        params.arguments && typeof params.arguments === "object"
          ? (params.arguments as Record<string, unknown>)
          : {};
      if (!name) return rpcError(id, -32602, "missing tool name");
      try {
        const result = await dispatchTool(name, args);
        return rpcResult(id, result);
      } catch (e) {
        const message = e instanceof Error ? e.message : "tool error";
        return rpcResult(id, {
          isError: true,
          content: [{ type: "text", text: message }],
        });
      }
    }
    return rpcError(id, -32601, `method not found: ${method}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    return rpcError(id, -32603, message);
  }
}

export async function GET() {
  // Lightweight health probe so MCP clients can confirm the endpoint is alive
  // without doing a full JSON-RPC initialize handshake.
  return Response.json({
    serverInfo: SERVER_INFO,
    protocolVersion: MCP_PROTOCOL_VERSION,
    tools: TOOLS.map((t) => t.name),
  });
}
