// Model Context Protocol (MCP) server endpoint.
//
// Exposes this workspace to MCP-aware coding agents (Claude Code, Cursor,
// Codex CLI) so they can pull repo context without screen-scraping the UI.
// Implements the JSON-RPC subset MCP clients actually use:
//   `initialize`, `tools/list`, `tools/call`.
//
// Tools:
//   list_repos()                       → list of repos the workspace knows about
//   get_graph(repo_id, scope?)         → structural graph slice
//   ask(repo_id, query, mode?)         → ask() result with files/edges/agentPrompt
//
// Backed by the same mock layer the frontend uses, so external agents see
// the same data as the workspace UI. Swap to the real backend at the same
// place where lib/api/client.ts flips USE_MOCK.

import type { NextRequest } from 'next/server'
import {
  mockAsk,
  mockGetGraph,
  mockListRepos,
} from '@/lib/api/mock'
import type { GraphScope } from '@/lib/api/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MCP_PROTOCOL_VERSION = '2024-11-05'
const SERVER_INFO = { name: 'codebase-vector', version: '0.1.0' } as const

interface JsonRpcRequest {
  jsonrpc?: '2.0'
  id?: number | string | null
  method?: string
  params?: unknown
}

type JsonRpcId = number | string | null

function rpcResult(id: JsonRpcId, result: unknown) {
  return Response.json({ jsonrpc: '2.0', id, result })
}

function rpcError(id: JsonRpcId, code: number, message: string, data?: unknown) {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message, data } })
}

const TOOLS = [
  {
    name: 'list_repos',
    description: 'List all repositories the workspace has indexed.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_graph',
    description:
      'Return the structural graph (files, symbols, edges, git history) for a repository. Optionally scoped to a folder.',
    inputSchema: {
      type: 'object',
      properties: {
        repo_id: { type: 'string', description: 'Repo identifier.' },
        folder: { type: 'string', description: 'Optional top-level folder to scope to.' },
        depth: { type: 'number', description: 'Edge expansion depth (1–5, default 2).' },
      },
      required: ['repo_id'],
    },
  },
  {
    name: 'ask',
    description:
      'Ask the codebase a free-form question (e.g. "how does indexing work?"). Returns a summary, explanation, role-tagged file list, edges, and a paste-ready agent prompt.',
    inputSchema: {
      type: 'object',
      properties: {
        repo_id: { type: 'string' },
        query: { type: 'string', description: 'What the developer wants to understand.' },
        mode: { type: 'string', enum: ['explain', 'trace', 'deep'], description: 'Default: explain.' },
      },
      required: ['repo_id', 'query'],
    },
  },
] as const

function asString(v: unknown, field: string): string {
  if (typeof v !== 'string' || v.length === 0) throw new Error(`missing or invalid '${field}'`)
  return v
}

function asOptionalString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

function asMode(v: unknown): 'explain' | 'trace' | 'deep' {
  if (v === 'trace' || v === 'deep') return v
  return 'explain'
}

function textContent(value: unknown) {
  return [
    {
      type: 'text',
      text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
    },
  ]
}

async function dispatchTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'list_repos': {
      const repos = await mockListRepos()
      return { content: textContent(repos), structuredContent: { repos } }
    }
    case 'get_graph': {
      const repo_id = asString(args.repo_id, 'repo_id')
      const folder = asOptionalString(args.folder)
      const depth = typeof args.depth === 'number' ? Math.max(1, Math.min(5, args.depth)) : 2
      const scope: GraphScope = folder
        ? { kind: 'folder', value: folder, depth }
        : { kind: 'all', depth }
      const graph = await mockGetGraph(repo_id, scope)
      return { content: textContent(graph), structuredContent: graph }
    }
    case 'ask': {
      const repo_id = asString(args.repo_id, 'repo_id')
      const query = asString(args.query, 'query')
      const mode = asMode(args.mode)
      const result = await mockAsk({ repo_id, query, mode })
      return { content: textContent(result), structuredContent: result }
    }
    default:
      throw new Error(`unknown tool '${name}'`)
  }
}

export async function POST(req: NextRequest) {
  let body: JsonRpcRequest
  try {
    body = (await req.json()) as JsonRpcRequest
  } catch {
    return rpcError(null, -32700, 'parse error')
  }

  const id = (body.id ?? null) as JsonRpcId
  const method = body.method
  if (typeof method !== 'string') return rpcError(id, -32600, 'invalid request')

  try {
    if (method === 'initialize') {
      return rpcResult(id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        serverInfo: SERVER_INFO,
        capabilities: { tools: { listChanged: false } },
      })
    }
    if (method === 'notifications/initialized' || method === 'ping') {
      return rpcResult(id, {})
    }
    if (method === 'tools/list') {
      return rpcResult(id, { tools: TOOLS })
    }
    if (method === 'tools/call') {
      const params = (body.params ?? {}) as { name?: unknown; arguments?: unknown }
      const name = typeof params.name === 'string' ? params.name : ''
      const args =
        params.arguments && typeof params.arguments === 'object'
          ? (params.arguments as Record<string, unknown>)
          : {}
      if (!name) return rpcError(id, -32602, 'missing tool name')
      try {
        const result = await dispatchTool(name, args)
        return rpcResult(id, result)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'tool error'
        return rpcResult(id, {
          isError: true,
          content: [{ type: 'text', text: message }],
        })
      }
    }
    return rpcError(id, -32601, `method not found: ${method}`)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'internal error'
    return rpcError(id, -32603, message)
  }
}

// Health probe — MCP clients can confirm the endpoint is alive without
// running a full JSON-RPC handshake.
export async function GET() {
  return Response.json({
    serverInfo: SERVER_INFO,
    protocolVersion: MCP_PROTOCOL_VERSION,
    tools: TOOLS.map((t) => t.name),
  })
}
