import type {
  Edge,
  File,
  FileHistory,
  GraphResponse,
  RepoSummary,
  Symbol,
} from './types'

// A self-referential fixture: the Codebase Vector project as it WILL look
// once the Python backend lands (apps/api/) alongside the FE (apps/web/).
// Lets the demo walk through the four-question methodology against a repo
// whose intent is obvious to the developer reading it.

const REPO_ID = 'fixture:codebase-vector'

const F = <T extends Omit<File, 'id' | 'repo_id' | 'sha'>>(
  id: number,
  rest: T,
): File => ({
  id,
  repo_id: REPO_ID,
  sha: `sha-${id.toString(16).padStart(8, '0')}`,
  ...rest,
})

const filesRaw: File[] = [
  // apps/api — Python backend
  F(1, { path: 'apps/api/src/main.py', language: 'python', loc: 38, last_modified: 1715000000 }),
  F(2, { path: 'apps/api/src/routes/index.py', language: 'python', loc: 64, last_modified: 1715000100 }),
  F(3, { path: 'apps/api/src/routes/graph.py', language: 'python', loc: 52, last_modified: 1715000150 }),
  F(4, { path: 'apps/api/src/routes/search.py', language: 'python', loc: 41, last_modified: 1715000200 }),
  F(5, { path: 'apps/api/src/routes/explain.py', language: 'python', loc: 88, last_modified: 1715050000 }),
  F(6, { path: 'apps/api/src/indexer/walker.py', language: 'python', loc: 71, last_modified: 1714900000 }),
  F(7, { path: 'apps/api/src/indexer/parser.py', language: 'python', loc: 142, last_modified: 1715040000 }),
  F(8, { path: 'apps/api/src/indexer/resolver.py', language: 'python', loc: 109, last_modified: 1715030000 }),
  F(9, { path: 'apps/api/src/indexer/chunker.py', language: 'python', loc: 58, last_modified: 1714950000 }),
  F(10, { path: 'apps/api/src/indexer/embedder.py', language: 'python', loc: 76, last_modified: 1714960000 }),
  F(11, { path: 'apps/api/src/indexer/git.py', language: 'python', loc: 49, last_modified: 1714970000 }),
  F(12, { path: 'apps/api/src/narrator/client.py', language: 'python', loc: 44, last_modified: 1715055000 }),
  F(13, { path: 'apps/api/src/narrator/retrieval.py', language: 'python', loc: 96, last_modified: 1715056000 }),
  F(14, { path: 'apps/api/src/narrator/prompt.py', language: 'python', loc: 61, last_modified: 1715057000 }),
  F(15, { path: 'apps/api/src/storage/sqlite.py', language: 'python', loc: 84, last_modified: 1714900500 }),
  F(16, { path: 'apps/api/src/storage/lance.py', language: 'python', loc: 53, last_modified: 1714900600 }),
  F(17, { path: 'apps/api/src/models.py', language: 'python', loc: 92, last_modified: 1714900200 }),
  F(18, { path: 'apps/api/pyproject.toml', language: 'other', loc: 31, last_modified: 1714800000 }),

  // apps/web — Next.js frontend
  F(20, { path: 'apps/web/app/layout.tsx', language: 'typescript', loc: 22, last_modified: 1715060000 }),
  F(21, { path: 'apps/web/app/page.tsx', language: 'typescript', loc: 18, last_modified: 1715061000 }),
  F(22, { path: 'apps/web/components/workspace/Shell.tsx', language: 'typescript', loc: 74, last_modified: 1715062000 }),
  F(23, { path: 'apps/web/components/graph/GraphView.tsx', language: 'typescript', loc: 156, last_modified: 1715063000 }),
  F(24, { path: 'apps/web/components/graph/layout.ts', language: 'typescript', loc: 88, last_modified: 1715064000 }),
  F(25, { path: 'apps/web/components/narrator/ChatPanel.tsx', language: 'typescript', loc: 112, last_modified: 1715065000 }),
  F(26, { path: 'apps/web/components/narrator/Citation.tsx', language: 'typescript', loc: 28, last_modified: 1715066000 }),
  F(27, { path: 'apps/web/components/sidepanel/FilePanel.tsx', language: 'typescript', loc: 64, last_modified: 1715067000 }),
  F(28, { path: 'apps/web/lib/api/types.ts', language: 'typescript', loc: 134, last_modified: 1715068000 }),
  F(29, { path: 'apps/web/lib/api/client.ts', language: 'typescript', loc: 68, last_modified: 1715069000 }),
  F(30, { path: 'apps/web/package.json', language: 'json', loc: 24, last_modified: 1714800500 }),

  // docs
  F(40, { path: 'docs/CODEBASE_WALKTHROUGH.md', language: 'markdown', loc: 281, last_modified: 1714700000 }),
  F(41, { path: 'docs/ARCHITECTURE.md', language: 'markdown', loc: 96, last_modified: 1714710000 }),

  // root
  F(50, { path: 'Makefile', language: 'other', loc: 18, last_modified: 1714800100 }),
  F(51, { path: 'README.md', language: 'markdown', loc: 62, last_modified: 1714710500 }),
  F(52, { path: 'CLAUDE.md', language: 'markdown', loc: 493, last_modified: 1714700500 }),
]

const symbolsRaw: Symbol[] = [
  { id: 1, file_id: 1, name: 'app', kind: 'const', start_line: 8, end_line: 8, is_exported: true },
  { id: 2, file_id: 1, name: 'lifespan', kind: 'function', start_line: 12, end_line: 28, is_exported: false },
  { id: 3, file_id: 2, name: 'start_index', kind: 'function', start_line: 14, end_line: 48, is_exported: true },
  { id: 4, file_id: 3, name: 'get_graph', kind: 'function', start_line: 11, end_line: 39, is_exported: true },
  { id: 5, file_id: 4, name: 'search', kind: 'function', start_line: 9, end_line: 32, is_exported: true },
  { id: 6, file_id: 5, name: 'explain', kind: 'function', start_line: 18, end_line: 71, is_exported: true },
  { id: 7, file_id: 6, name: 'walk_repo', kind: 'function', start_line: 21, end_line: 60, is_exported: true },
  { id: 8, file_id: 7, name: 'parse_file', kind: 'function', start_line: 33, end_line: 118, is_exported: true },
  { id: 9, file_id: 8, name: 'resolve_imports', kind: 'function', start_line: 14, end_line: 92, is_exported: true },
  { id: 10, file_id: 9, name: 'chunk_file', kind: 'function', start_line: 11, end_line: 48, is_exported: true },
  { id: 11, file_id: 10, name: 'embed_chunks', kind: 'function', start_line: 18, end_line: 62, is_exported: true },
  { id: 12, file_id: 13, name: 'build_repo_context', kind: 'function', start_line: 22, end_line: 84, is_exported: true },
  { id: 13, file_id: 14, name: 'assemble_prompt', kind: 'function', start_line: 8, end_line: 51, is_exported: true },
  { id: 14, file_id: 22, name: 'Shell', kind: 'function', start_line: 14, end_line: 68, is_exported: true },
  { id: 15, file_id: 23, name: 'GraphView', kind: 'function', start_line: 28, end_line: 146, is_exported: true },
  { id: 16, file_id: 25, name: 'ChatPanel', kind: 'function', start_line: 31, end_line: 102, is_exported: true },
]

// Import edges. (source = file_id, target = file_id, kind = 'import')
const importPairs: Array<[number, number]> = [
  // main.py wires up route modules
  [1, 2], [1, 3], [1, 4], [1, 5],
  // routes call into indexer / narrator / storage
  [2, 6], [2, 7], [2, 8], [2, 9], [2, 10], [2, 11], [2, 15], [2, 16],
  [3, 15], [3, 17],
  [4, 16], [4, 17],
  [5, 12], [5, 13], [5, 14], [5, 15], [5, 16],
  // indexer internal
  [7, 17], [8, 17], [9, 17], [10, 16], [11, 15],
  // narrator internal
  [13, 15], [13, 16], [13, 17], [14, 17],
  // web layer
  [22, 23], [22, 25], [22, 27], [22, 29],
  [23, 24], [23, 28], [23, 29],
  [25, 26], [25, 28], [25, 29],
  [27, 28], [27, 29],
  [29, 28],
  [21, 22],
]

const edgesRaw: Edge[] = importPairs.map(([s, t], i) => ({
  id: i + 1,
  source_id: s,
  target_id: t,
  source_kind: 'file' as const,
  target_kind: 'file' as const,
  edge_kind: 'import' as const,
  weight: 1,
}))

// File history — fake but plausible. The indexer and explain route are the
// hotspots; storage and chunker have been stable for a while.
const historyRaw: FileHistory[] = [
  { file_id: 5, commits_30d: 11, commits_90d: 24, authors_90d: 2 },   // explain route — hot
  { file_id: 7, commits_30d: 8, commits_90d: 19, authors_90d: 2 },    // parser — hot
  { file_id: 13, commits_30d: 6, commits_90d: 14, authors_90d: 1 },   // retrieval — hot
  { file_id: 23, commits_30d: 5, commits_90d: 12, authors_90d: 1 },   // GraphView — hot
  { file_id: 25, commits_30d: 4, commits_90d: 9, authors_90d: 1 },    // ChatPanel
  { file_id: 8, commits_30d: 3, commits_90d: 8, authors_90d: 2 },     // resolver
  { file_id: 1, commits_30d: 1, commits_90d: 4, authors_90d: 1 },     // main.py
  { file_id: 15, commits_30d: 0, commits_90d: 2, authors_90d: 1 },    // sqlite — stable
  { file_id: 16, commits_30d: 0, commits_90d: 1, authors_90d: 1 },    // lance — stable
  { file_id: 9, commits_30d: 0, commits_90d: 3, authors_90d: 1 },     // chunker — stable
]

const languageCounts = filesRaw.reduce<Record<string, number>>((acc, f) => {
  acc[f.language] = (acc[f.language] ?? 0) + 1
  return acc
}, {})

const repo: RepoSummary = {
  repo_id: REPO_ID,
  name: 'codebase-vector',
  root_path: '~/work/codebase-vector',
  file_count: filesRaw.length,
  total_loc: filesRaw.reduce((s, f) => s + f.loc, 0),
  languages: Object.entries(languageCounts).map(([language, file_count]) => ({
    language: language as RepoSummary['languages'][number]['language'],
    file_count,
  })),
  indexed_at: 1715070000,
}

export const fixtureGraph: GraphResponse = {
  repo,
  files: filesRaw,
  symbols: symbolsRaw,
  edges: edgesRaw,
  history: historyRaw,
  coupling: [],
}

export const FIXTURE_REPO_ID = REPO_ID

// Hand-written walkthrough that follows the 7-step methodology in
// CODEBASE_WALKTHROUGH.md. Used by the mock /explain stream so the FE can
// be developed and demoed before the real narrator exists.
export interface WalkthroughChunk {
  text: string
  cite?: { file_path: string; start_line: number; end_line: number; symbol_name?: string }
}

export const defaultWalkthrough: WalkthroughChunk[] = [
  { text: 'The 30-second version: this is a **local-first codebase explainer** — point it at a repo, get a senior-engineer walkthrough grounded in the real structure.' },
  { text: '\n\nIt has **five load-bearing pieces**:\n\n' },
  { text: '1. **Indexer** — walks the repo, parses every file with tree-sitter, writes symbols and import edges. ', cite: { file_path: 'apps/api/src/indexer/parser.py', start_line: 33, end_line: 118, symbol_name: 'parse_file' } },
  { text: '\n2. **Storage** — SQLite holds the structural graph, LanceDB holds vector embeddings. Two stores because joins and similarity search want different shapes. ', cite: { file_path: 'apps/api/src/storage/sqlite.py', start_line: 1, end_line: 84 } },
  { text: '\n3. **Narrator** — assembles a prompt from the walkthrough methodology + graph context + retrieved chunks, then streams a Claude response. ', cite: { file_path: 'apps/api/src/narrator/prompt.py', start_line: 8, end_line: 51, symbol_name: 'assemble_prompt' } },
  { text: '\n4. **API** — thin FastAPI layer wiring the four endpoints. ', cite: { file_path: 'apps/api/src/main.py', start_line: 1, end_line: 38 } },
  { text: '\n5. **Web** — Next.js workspace: graph canvas, chat panel, file peek. ', cite: { file_path: 'apps/web/components/workspace/Shell.tsx', start_line: 14, end_line: 68, symbol_name: 'Shell' } },
  { text: '\n\n**How a question flows through it:** you ask "how does signup work?" in the chat. ' },
  { text: 'The narrator runs a semantic search over the embeddings, looks up the structural neighbors of any hits in SQLite, ', cite: { file_path: 'apps/api/src/narrator/retrieval.py', start_line: 22, end_line: 84, symbol_name: 'build_repo_context' } },
  { text: 'then builds a grounded prompt and streams the answer back with citations you can click. ', cite: { file_path: 'apps/api/src/routes/explain.py', start_line: 18, end_line: 71, symbol_name: 'explain' } },
  { text: '\n\n**Where to touch next:** if you\'re adding a new language, start in the parser — that\'s where tree-sitter grammars get registered. If you\'re changing how the narrator picks context, retrieval.py is the file.' },
  { text: '\n\nWant me to go deeper on the indexer, the narrator prompt structure, or the chat ↔ graph linking?' },
]
