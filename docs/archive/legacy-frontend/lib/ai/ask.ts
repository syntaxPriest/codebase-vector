// Comprehensive feature explanation, grounded in the codebase index.
// Goal: when a developer asks "how does auth work?", we return enough
// structured information that they can both *understand* the feature
// (summary + explanation + role-tagged file map) and *act* on it
// (paste a ready-made prompt straight into Claude Code / Codex).

import type { Codebase, CodebaseFile } from "@/lib/codebase/types";

export type AskFileRole =
  | "entry-point"
  | "implementation"
  | "config"
  | "data"
  | "ui"
  | "test"
  | "support";

export interface AskFile {
  path: string;
  role: AskFileRole;
  /** One-line note: how this file participates in the queried feature. */
  note?: string;
}

export interface AskFolder {
  name: string;
  note?: string;
}

export interface AskEdge {
  from: string;
  to: string;
  /** "imports", "calls", "extends", "renders", "tests"… */
  reason?: string;
}

export interface AskResult {
  summary: string;
  explanation: string;
  files: AskFile[];
  folders: AskFolder[];
  edges: AskEdge[];
  /** Copy-pasteable prompt for a coding agent. Already @-prefixed. */
  agentPrompt: string;
  /** Whether the explanation came from the LLM. False = keyword fallback. */
  ai: boolean;
}

// Three "shapes" of answer the UI can request. Each one maps to a
// different system-prompt nudge and a different result envelope so
// the panel knows whether to highlight the file map, the connection
// graph, or a long-form walkthrough.
export type AskMode = "explain" | "trace" | "deep";

interface ModeConfig {
  /** Soft cap on files in the answer. */
  maxFiles: number;
  /** Bullet list appended to the system prompt. */
  guidance: string;
}

const MODE_CONFIG: Record<AskMode, ModeConfig> = {
  explain: {
    maxFiles: 8,
    guidance: [
      "Stay concise: one short summary sentence and 2 short explanation paragraphs.",
      "Cite at most 8 files — only the ones a developer needs to read first.",
      "Edges are optional; include only the most load-bearing relationships (≤4).",
    ].join(" "),
  },
  trace: {
    maxFiles: 16,
    guidance: [
      "Treat this as a walk through the call/import graph. Lead with the entry point and trace the path from there.",
      "The `edges` array is the centrepiece: every cited file should participate in at least one edge with a concrete `reason` (\"imports\", \"calls\", \"renders\", \"tests\", \"dispatches\"…).",
      "Order files in `files` along the trace, not alphabetically. Cite up to 16 files.",
    ].join(" "),
  },
  deep: {
    maxFiles: 24,
    guidance: [
      "Be comprehensive. Cover: how the feature is composed, the lifecycle from request → response (or mount → unmount), where edge cases live, where tests live, and how it's configured.",
      "Aim for 4–6 explanation paragraphs with markdown sub-headings (## …) that group the cited files.",
      "Cite up to 24 files; include tests and config alongside implementation.",
    ].join(" "),
  },
};

const MAX_FILES_FOR_PROMPT = 800;
const KEYWORD_FALLBACK_FILES = 16;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function ask(
  codebase: Codebase,
  query: string,
  mode: AskMode = "explain",
): Promise<AskResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return emptyResult("Empty query.", "Type something to ask.");
  }
  const safeMode: AskMode = MODE_CONFIG[mode] ? mode : "explain";
  if (isClaudeConfigured()) {
    try {
      return await askWithClaude(codebase, trimmed, safeMode);
    } catch (e) {
      const message = e instanceof Error ? e.message : "claude error";
      const fallback = askWithKeywords(codebase, trimmed);
      return {
        ...fallback,
        explanation: `_Claude request failed: ${message}. Falling back to keyword search._\n\n${fallback.explanation}`,
      };
    }
  }
  return askWithKeywords(codebase, trimmed);
}

function emptyResult(summary: string, explanation: string): AskResult {
  return {
    summary,
    explanation,
    files: [],
    folders: [],
    edges: [],
    agentPrompt: "",
    ai: false,
  };
}

// ──────────────────────────────────────────────────────────────
// Claude (model-driven)
// ──────────────────────────────────────────────────────────────

interface ClaudeContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: {
    summary?: string;
    explanation?: string;
    files?: Array<{ path?: string; role?: string; note?: string }>;
    folders?: Array<{ name?: string; note?: string }>;
    edges?: Array<{ from?: string; to?: string; reason?: string }>;
    agentPrompt?: string;
  };
}

interface ClaudeResponse {
  content?: ClaudeContentBlock[];
}

const VALID_ROLES = new Set<AskFileRole>([
  "entry-point",
  "implementation",
  "config",
  "data",
  "ui",
  "test",
  "support",
]);

async function askWithClaude(
  codebase: Codebase,
  query: string,
  mode: AskMode,
): Promise<AskResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const cfg = MODE_CONFIG[mode];
  const maxResultFiles = cfg.maxFiles;

  const files = codebase.allFiles.slice(0, MAX_FILES_FOR_PROMPT);
  const fileLines = files
    .map((f) => {
      const path = f.path ?? f.name;
      const desc = f.description ? ` · ${f.description.slice(0, 90)}` : "";
      return `${path} · ${f.loc} loc${desc}`;
    })
    .join("\n");

  const folderLines = codebase.folders
    .map((f) => `${f.name} · ${f.fileCount} files · kind=${f.kind}`)
    .join("\n");

  const slug = codebase.meta
    ? `${codebase.meta.owner}/${codebase.meta.repo}@${codebase.meta.sha.slice(0, 7)}`
    : "this codebase";

  const system = `You are an expert at reading codebases. Given a file index and a developer's question about a feature, identify the files and folders that implement it, explain how they fit together, and produce an actionable prompt the developer can hand to a coding agent.

Be concrete:
- Cite files by exact repo-relative path (matching the index).
- For each cited file, classify its role and write a one-line note about how it participates in this feature.
- Only include folders whose contents are collectively relevant.
- For \`edges\`, describe meaningful import/call/render relationships between cited files (from → to with a one-word reason).
- The \`agentPrompt\` should be a self-contained prompt a developer can paste into Claude Code / Codex / Cursor:
  • Open with a one-paragraph problem statement that refines the user's question.
  • Reference each relevant file using @-prefixed paths (e.g. @src/auth/session.ts).
  • End with concrete starting points or suggested edits the agent can act on.

Mode = "${mode}":
${cfg.guidance}`;

  const user = `Repository: ${slug}

Folders:
${folderLines}

Files:
${fileLines}

Question: ${query}`;

  const tool = {
    name: "report_findings",
    description: "Comprehensive answer about a codebase feature with files, folders, edges, and an agent prompt.",
    input_schema: {
      type: "object",
      properties: {
        summary:     { type: "string", description: "One-sentence summary of the feature." },
        explanation: { type: "string", description: "Markdown explanation, 2–5 short paragraphs." },
        files: {
          type: "array",
          maxItems: maxResultFiles,
          items: {
            type: "object",
            properties: {
              path: { type: "string" },
              role: {
                type: "string",
                enum: ["entry-point", "implementation", "config", "data", "ui", "test", "support"],
              },
              note: { type: "string", description: "One-line note on this file's role in the feature." },
            },
            required: ["path", "role"],
          },
        },
        folders: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              note: { type: "string" },
            },
            required: ["name"],
          },
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              reason: { type: "string" },
            },
            required: ["from", "to"],
          },
        },
        agentPrompt: {
          type: "string",
          description: "A copy-pasteable prompt for a coding agent, with @-prefixed paths.",
        },
      },
      required: ["summary", "explanation", "files", "agentPrompt"],
    },
  };

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2400,
      system,
      tools: [tool],
      tool_choice: { type: "tool", name: "report_findings" },
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`anthropic ${res.status} · ${body.slice(0, 160)}`);
  }

  const data = (await res.json()) as ClaudeResponse;
  const toolUse = data.content?.find((c) => c.type === "tool_use" && c.name === "report_findings");
  if (!toolUse?.input) throw new Error("malformed tool response");

  const input = toolUse.input;

  // Validate against the actual codebase — Claude occasionally invents
  // a path; drop those rather than hand back a broken @-ref.
  const knownPaths = new Set<string>();
  for (const f of codebase.allFiles) knownPaths.add(f.path ?? f.name);
  const knownFolders = new Set<string>();
  for (const f of codebase.folders) knownFolders.add(f.name);

  const askFiles: AskFile[] = [];
  for (const f of input.files ?? []) {
    if (askFiles.length >= maxResultFiles) break;
    if (!f.path || typeof f.path !== "string") continue;
    if (!knownPaths.has(f.path)) continue;
    const role: AskFileRole =
      f.role && VALID_ROLES.has(f.role as AskFileRole)
        ? (f.role as AskFileRole)
        : "support";
    const entry: AskFile = { path: f.path, role };
    if (typeof f.note === "string" && f.note) entry.note = f.note;
    askFiles.push(entry);
  }

  const askFolders: AskFolder[] = [];
  for (const f of input.folders ?? []) {
    if (!f.name || !knownFolders.has(f.name)) continue;
    const entry: AskFolder = { name: f.name };
    if (typeof f.note === "string" && f.note) entry.note = f.note;
    askFolders.push(entry);
  }

  const askEdges: AskEdge[] = [];
  for (const e of input.edges ?? []) {
    if (!e.from || !e.to) continue;
    if (!knownPaths.has(e.from) || !knownPaths.has(e.to)) continue;
    const entry: AskEdge = { from: e.from, to: e.to };
    if (typeof e.reason === "string" && e.reason) entry.reason = e.reason;
    askEdges.push(entry);
  }

  return {
    summary: input.summary ?? "",
    explanation: input.explanation ?? "",
    files: askFiles,
    folders: askFolders,
    edges: askEdges,
    agentPrompt: input.agentPrompt ?? defaultAgentPrompt(query, askFiles),
    ai: true,
  };
}

// ──────────────────────────────────────────────────────────────
// Keyword fallback (no API key)
// ──────────────────────────────────────────────────────────────

function score(text: string, terms: string[]): number {
  if (!text) return 0;
  const t = text.toLowerCase();
  let total = 0;
  for (const term of terms) {
    if (!term) continue;
    const idx = t.indexOf(term);
    if (idx < 0) continue;
    total += 6;
    if (idx === 0) total += 4;
    if (new RegExp(`\\b${term}\\b`).test(t)) total += 4;
  }
  return total;
}

function askWithKeywords(codebase: Codebase, query: string): AskResult {
  const terms = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
  if (terms.length === 0) {
    return emptyResult("Empty query.", "Type something to ask.");
  }

  const ranked = codebase.allFiles
    .map((f) => {
      const path = f.path ?? f.name;
      const s =
        score(path, terms) +
        score(f.name, terms) * 1.5 +
        score(f.description ?? "", terms) * 0.8 +
        score(f.folderName, terms) * 0.6;
      return { file: f, path, s };
    })
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, KEYWORD_FALLBACK_FILES);

  const folderHits = new Map<string, number>();
  for (const r of ranked) {
    folderHits.set(r.file.folderName, (folderHits.get(r.file.folderName) ?? 0) + 1);
  }
  const folders: AskFolder[] = [...folderHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, n]) => ({ name, note: `${n} matching ${n === 1 ? "file" : "files"}` }));

  const files: AskFile[] = ranked.map((r) => ({
    path: r.path,
    role: classifyRole(r.file),
    note: r.file.description ?? undefined,
  }));

  const edges: AskEdge[] = collectEdges(ranked.map((r) => r.file), codebase);

  const summary = ranked.length === 0
    ? `No keyword matches for "${query}".`
    : `${ranked.length} file${ranked.length === 1 ? "" : "s"} match keyword search for "${query}".`;

  const explanation = ranked.length === 0
    ? `_Keyword search didn't find anything for **${query}**._\n\nSet \`ANTHROPIC_API_KEY\` in your environment to enable AI-powered feature search.`
    : `_Keyword match (set \`ANTHROPIC_API_KEY\` for an AI explanation)._\n\n` +
      `These files mention or contain the terms in **${query}**:\n\n` +
      ranked.slice(0, 8).map((r) => `- \`${r.path}\``).join("\n");

  return {
    summary,
    explanation,
    files,
    folders,
    edges,
    agentPrompt: defaultAgentPrompt(query, files),
    ai: false,
  };
}

function classifyRole(file: CodebaseFile): AskFileRole {
  const path = (file.path ?? file.name).toLowerCase();
  if (/\.test\.|\.spec\.|^tests?\/|\/__tests__\//.test(path)) return "test";
  if (/\.css$|\.scss$|\.tsx$|\.jsx$|\.svg$/.test(path)) return "ui";
  if (/\.json$|\.ya?ml$|\.toml$|config|env/.test(path)) return "config";
  if (/^(?:app|src)\/(?:page|index|main|server)/.test(path)) return "entry-point";
  return "implementation";
}

function collectEdges(files: CodebaseFile[], codebase: Codebase): AskEdge[] {
  const ids = new Set(files.map((f) => f.id));
  const out: AskEdge[] = [];
  for (const f of files) {
    const fromPath = f.path ?? f.name;
    for (const tid of f.imports) {
      if (!ids.has(tid)) continue;
      const t = codebase.allFiles[tid];
      if (!t) continue;
      out.push({ from: fromPath, to: t.path ?? t.name, reason: "imports" });
    }
  }
  return out.slice(0, 32);
}

function defaultAgentPrompt(query: string, files: AskFile[]): string {
  const refs = files.map((f) => `@${f.path}`).join(" ");
  const lines = [
    `I'm working on this question: ${query}`,
    "",
    "Relevant files:",
    ...files.map((f) => `- @${f.path}${f.role ? ` (${f.role})` : ""}${f.note ? ` — ${f.note}` : ""}`),
    "",
    "Please walk me through how these fit together and propose concrete edits if changes are needed.",
    "",
    `Quick reference: ${refs}`,
  ];
  return lines.join("\n");
}
