import type {
  AskEdge,
  AskFile,
  AskFileRole,
  AskFolder,
  AskRequest,
  AskResult,
  ExplainEvent,
  ExplainRequest,
  GraphResponse,
  GraphScope,
  IndexJob,
  RepoSummary,
  SearchResponse,
} from './types'
import { defaultWalkthrough, fixtureGraph, FIXTURE_REPO_ID } from './fixture'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ---------- Repo + graph ----------

export async function mockListRepos(): Promise<RepoSummary[]> {
  await sleep(40)
  return [fixtureGraph.repo]
}

export async function mockGetGraph(
  repoId: string,
  scope: GraphScope,
): Promise<GraphResponse> {
  if (repoId !== FIXTURE_REPO_ID) {
    throw new Error(`Mock graph: unknown repo_id ${repoId}`)
  }
  await sleep(60)
  if (scope.kind === 'all') return fixtureGraph
  if (scope.kind === 'folder' && scope.value) {
    const prefix = scope.value.endsWith('/') ? scope.value : `${scope.value}/`
    const files = fixtureGraph.files.filter((f) => f.path.startsWith(prefix) || f.path === scope.value)
    const fileIds = new Set(files.map((f) => f.id))
    return {
      ...fixtureGraph,
      files,
      symbols: fixtureGraph.symbols.filter((s) => fileIds.has(s.file_id)),
      edges: fixtureGraph.edges.filter((e) => fileIds.has(e.source_id) && fileIds.has(e.target_id)),
      history: fixtureGraph.history.filter((h) => fileIds.has(h.file_id)),
    }
  }
  return fixtureGraph
}

// ---------- Index job ----------

export async function* mockStartIndex(rootPath: string): AsyncGenerator<IndexJob> {
  const job_id = `job-${Math.random().toString(36).slice(2, 10)}`
  const stages: Array<{ stage: IndexJob['stage']; message: string; ms: number }> = [
    { stage: 'walk', message: `Walking ${rootPath}…`, ms: 180 },
    { stage: 'parse', message: 'Parsing files with tree-sitter…', ms: 320 },
    { stage: 'resolve', message: 'Resolving imports…', ms: 220 },
    { stage: 'graph', message: 'Writing structural graph to SQLite…', ms: 160 },
    { stage: 'git', message: 'Reading git history…', ms: 200 },
    { stage: 'chunk', message: 'Chunking by symbol…', ms: 160 },
    { stage: 'embed', message: 'Embedding chunks…', ms: 380 },
    { stage: 'store', message: 'Writing vectors to LanceDB…', ms: 140 },
  ]

  yield { job_id, repo_id: FIXTURE_REPO_ID, status: 'queued', stage: 'walk', progress: 0 }

  for (let i = 0; i < stages.length; i++) {
    const s = stages[i]
    if (!s) continue
    await sleep(s.ms)
    yield {
      job_id,
      repo_id: FIXTURE_REPO_ID,
      status: 'running',
      stage: s.stage,
      progress: (i + 1) / (stages.length + 1),
      message: s.message,
    }
  }

  await sleep(80)
  yield {
    job_id,
    repo_id: FIXTURE_REPO_ID,
    status: 'complete',
    stage: 'ready',
    progress: 1,
    message: `Indexed ${fixtureGraph.files.length} files (${fixtureGraph.repo.total_loc} LOC).`,
  }
}

// ---------- Search ----------

export async function mockSearch(repoId: string, query: string, k = 10): Promise<SearchResponse> {
  if (repoId !== FIXTURE_REPO_ID) throw new Error(`Mock search: unknown repo_id ${repoId}`)
  await sleep(80)

  const tokens = query.toLowerCase().split(/\W+/).filter(Boolean)
  const scored = fixtureGraph.files.map((f) => {
    const haystack = `${f.path} ${fixtureGraph.symbols
      .filter((s) => s.file_id === f.id)
      .map((s) => s.name)
      .join(' ')}`.toLowerCase()
    const score = tokens.reduce((acc, t) => acc + (haystack.includes(t) ? 1 : 0), 0) / Math.max(tokens.length, 1)
    return { f, score }
  })

  const hits = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ f, score }, i) => {
      const sym = fixtureGraph.symbols.find((s) => s.file_id === f.id)
      return {
        id: `${f.id}:${i}`,
        file_path: f.path,
        start_line: sym?.start_line ?? 1,
        end_line: sym?.end_line ?? Math.min(20, f.loc),
        symbol_name: sym?.name ?? null,
        snippet: `(mock snippet from ${f.path})`,
        score,
      }
    })

  return { query, hits }
}

// ---------- Explain (streaming narrator) ----------

export async function* mockExplain(req: ExplainRequest): AsyncGenerator<ExplainEvent> {
  await sleep(140) // first-token latency simulation
  let citeIndex = 0
  for (const chunk of defaultWalkthrough) {
    for (const word of chunk.text.split(/(\s+)/)) {
      if (word.length === 0) continue
      yield { type: 'token', delta: word }
      await sleep(12)
    }
    if (chunk.cite) {
      citeIndex += 1
      yield {
        type: 'citation',
        index: citeIndex,
        citation: {
          file_path: chunk.cite.file_path,
          start_line: chunk.cite.start_line,
          end_line: chunk.cite.end_line,
          symbol_name: chunk.cite.symbol_name ?? null,
        },
      }
    }
  }
  if (req.focused_path) {
    yield { type: 'token', delta: `\n\n*(focused on \`${req.focused_path}\`)*` }
  }
  yield { type: 'done' }
}

// ---------- Ask (structured feature breakdown) ----------

const MAX_ASK_FILES: Record<AskRequest['mode'], number> = {
  explain: 8,
  trace: 16,
  deep: 24,
}

function scoreTextAgainstTerms(text: string, terms: string[]): number {
  if (text.length === 0) return 0
  const t = text.toLowerCase()
  let total = 0
  for (const term of terms) {
    if (!term) continue
    const idx = t.indexOf(term)
    if (idx < 0) continue
    total += 6
    if (idx === 0) total += 4
    if (new RegExp(`\\b${term}\\b`).test(t)) total += 4
  }
  return total
}

function classifyRole(path: string): AskFileRole {
  const p = path.toLowerCase()
  if (/\.test\.|\.spec\.|^tests?\/|\/__tests__\//.test(p)) return 'test'
  if (/\.css$|\.scss$|\.tsx$|\.jsx$|\.svg$/.test(p)) return 'ui'
  if (/\.json$|\.ya?ml$|\.toml$|config|env/.test(p)) return 'config'
  if (/^(?:app|src|apps\/[^/]+\/src)\/(?:page|index|main|server|app|layout)/.test(p)) return 'entry-point'
  if (/main\.py$|app\.py$|server\.py$/.test(p)) return 'entry-point'
  return 'implementation'
}

function defaultAgentPrompt(query: string, files: AskFile[]): string {
  const refs = files.map((f) => `@${f.path}`).join(' ')
  return [
    `I'm working on this question: ${query}`,
    '',
    'Relevant files:',
    ...files.map((f) => `- @${f.path} (${f.role})${f.note ? ` — ${f.note}` : ''}`),
    '',
    'Please walk me through how these fit together and propose concrete edits if changes are needed.',
    '',
    `Quick reference: ${refs}`,
  ].join('\n')
}

export async function mockAsk(req: AskRequest): Promise<AskResult> {
  if (req.repo_id !== FIXTURE_REPO_ID) throw new Error(`Mock ask: unknown repo_id ${req.repo_id}`)
  await sleep(380) // first-response latency simulation

  const query = req.query.trim()
  const terms = query.toLowerCase().split(/\W+/).filter((w) => w.length >= 2)
  const cap = MAX_ASK_FILES[req.mode]

  if (terms.length === 0) {
    return {
      summary: 'Empty query.',
      explanation: 'Type something to ask.',
      files: [],
      folders: [],
      edges: [],
      agentPrompt: '',
      ai: false,
    }
  }

  const symbolsByFile = new Map<number, string[]>()
  for (const s of fixtureGraph.symbols) {
    const arr = symbolsByFile.get(s.file_id)
    if (arr) arr.push(s.name)
    else symbolsByFile.set(s.file_id, [s.name])
  }

  const ranked = fixtureGraph.files
    .map((f) => {
      const syms = (symbolsByFile.get(f.id) ?? []).join(' ')
      const score =
        scoreTextAgainstTerms(f.path, terms) +
        scoreTextAgainstTerms(syms, terms) * 1.5
      return { file: f, score }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, cap)

  const askFiles: AskFile[] = ranked.map((r) => {
    const symbol = (symbolsByFile.get(r.file.id) ?? [])[0]
    const note = symbol ? `defines \`${symbol}\`` : undefined
    const f: AskFile = { path: r.file.path, role: classifyRole(r.file.path) }
    if (note) f.note = note
    return f
  })

  // Group cited files by their top-level folder (loose) → AskFolders.
  const folderCounts = new Map<string, number>()
  for (const r of ranked) {
    const folder = r.file.path.split('/').slice(0, 2).join('/')
    folderCounts.set(folder, (folderCounts.get(folder) ?? 0) + 1)
  }
  const askFolders: AskFolder[] = [...folderCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, n]) => ({ name, note: `${n} matching ${n === 1 ? 'file' : 'files'}` }))

  // Edges between cited files only.
  const citedIds = new Set(ranked.map((r) => r.file.id))
  const fileById = new Map(fixtureGraph.files.map((f) => [f.id, f]))
  const askEdges: AskEdge[] = []
  for (const e of fixtureGraph.edges) {
    if (e.edge_kind !== 'import') continue
    if (!citedIds.has(e.source_id) || !citedIds.has(e.target_id)) continue
    const from = fileById.get(e.source_id)
    const to = fileById.get(e.target_id)
    if (!from || !to) continue
    askEdges.push({ from: from.path, to: to.path, reason: 'imports' })
    if (askEdges.length >= 32) break
  }

  const summary = ranked.length === 0
    ? `No matches for "${query}".`
    : `${ranked.length} file${ranked.length === 1 ? '' : 's'} touch "${query}" in this codebase.`

  const explanation = ranked.length === 0
    ? `_No files matched **${query}**._ Try a broader term (e.g. \`auth\`, \`index\`, \`narrator\`).`
    : [
        `Looking at the top cited files for **${query}**:`,
        '',
        ...ranked.slice(0, Math.min(5, ranked.length)).map((r) => `- \`${r.file.path}\``),
        '',
        req.mode === 'trace'
          ? `The trace starts at the entry point and follows imports through ${askEdges.length} link${askEdges.length === 1 ? '' : 's'} between these files.`
          : req.mode === 'deep'
            ? `Comprehensive breakdown: implementation + config + tests where present. Use the agent prompt below to hand this off to a coding agent.`
            : `These are the load-bearing pieces — read them in order to build a mental model.`,
      ].join('\n')

  return {
    summary,
    explanation,
    files: askFiles,
    folders: askFolders,
    edges: askEdges,
    agentPrompt: defaultAgentPrompt(query, askFiles),
    ai: false, // mock, not LLM-backed
  }
}
