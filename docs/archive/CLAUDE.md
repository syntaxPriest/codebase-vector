# CLAUDE.md — Codebase Vector

> Instructions for Claude Code when working in this repository. Read this fully before writing or editing any code. The conventions and architectural decisions here are deliberate — preserve them.

---

## 0. What you're building

**Codebase Vector** is a local-first tool that helps a developer understand any codebase the way a senior engineer would explain it to them on day one.

It does this by combining three things that most existing tools do separately:

1. **A real structural graph** of the codebase, built from AST parsing — not inferred from file names or LLM guesses. This is the *ground truth*.
2. **Semantic embeddings** of code chunks, so the developer can search by intent ("where does authentication happen?") not just by filename.
3. **A senior-engineer narrator** — an LLM layer that explains what the developer is looking at, grounded in (1) and (2), following the walkthrough methodology in `docs/CODEBASE_WALKTHROUGH.md`.

The output is a local web UI that shows the codebase as an interactive graph + a chat-style explanation panel. The developer points it at a local repo, and within a minute they get a guided tour they can drive themselves.

**It is not** a hosted SaaS, a security scanner, a code-review bot, or a documentation generator. Resist scope creep toward those things.

---

## 1. The north star

If you ever have to make a judgment call and this doc doesn't answer it, ask:

> *"Would a senior engineer onboarding a new hire do this?"*

If yes, do it. If no, don't. This is the entire product philosophy in one sentence.

Concrete examples of what that filter means in practice:

- A senior engineer doesn't read the whole repo aloud. → We don't display every file by default.
- A senior engineer points at the load-bearing 3–7 pieces. → Our default view shows top-level modules, not files.
- A senior engineer answers the question the new hire actually asked. → Our LLM responses are scoped to the user's prompt, not pre-emptive deep dives.
- A senior engineer is honest about the messy parts. → We surface hotspots, churn, and known smells; we don't pretend the codebase is clean.

---

## 2. Architecture overview

Five components, each with a single responsibility:

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│         Next.js + React Flow + Tailwind + shadcn/ui         │
│   - Graph view (folder-aware, layered, never pure F-D)      │
│   - Chat panel (the narrator)                               │
│   - File peek pane                                          │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTP (localhost only)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       API (FastAPI)                         │
│   - /index   : kick off indexing of a local repo            │
│   - /graph   : return structural graph (filtered/scoped)    │
│   - /search  : semantic search over code chunks             │
│   - /explain : LLM walkthrough, grounded in graph + search  │
└──────────┬──────────────────────────────────┬───────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────────┐    ┌─────────────────────────────┐
│      Indexer (Python)    │    │     Narrator (Python)       │
│  - tree-sitter parsing   │    │  - LLM client (Anthropic)   │
│  - imports & call graph  │    │  - Loads WALKTHROUGH.md     │
│  - git history overlay   │    │    as system prompt         │
│  - chunking + embedding  │    │  - Retrieves from graph     │
└──────────┬───────────────┘    │    + vector store           │
           │                    └──────────┬──────────────────┘
           ▼                               │
┌─────────────────────────────────────────▼───────────────────┐
│                        Storage                              │
│   SQLite : structural graph (files, symbols, edges, git)    │
│   LanceDB: vector embeddings of code chunks                 │
│   Both live in  ~/.codebase-vector/<repo-hash>/             │
└─────────────────────────────────────────────────────────────┘
```

**Why these boundaries:**

- Indexer and Narrator are separate processes/modules because they have different lifecycles. Indexing is slow, batchy, and runs once per repo (then incrementally on git changes). Narration is fast, interactive, and runs on every user prompt. Coupling them would slow narration down to indexer speed.
- Storage is **two stores**, not one. The structural graph is relational (files, imports, calls) and lives in SQLite where joins are cheap. Embeddings are dense vectors and live in LanceDB where similarity search is cheap. Don't try to put embeddings in SQLite or graphs in LanceDB.
- The API is a thin layer. All logic lives in the indexer and narrator modules. The API only routes, validates, and serializes.

---

## 3. Tech stack & rationale

Don't change these without strong reason. Each was chosen against alternatives.

| Layer | Choice | Why this, not the alternative |
|---|---|---|
| **AST parsing** | `tree-sitter` (Python bindings) | Multi-language out of the box (TS, JS, Python, Go, Rust, Java, Ruby). Faster and more accurate than regex; lighter than language-specific parsers. |
| **Language detection** | File extension + tree-sitter grammars | Avoid heavy detection libs. Extension is right 99% of the time. |
| **Backend** | Python 3.11+, FastAPI | Native fit for ML/embedding work. FastAPI for clean async API + auto-generated OpenAPI for the frontend. |
| **Embeddings** | `nomic-embed-text-v1.5` (local via `sentence-transformers`) or Voyage AI's `voyage-code-3` (API) | Default to local for privacy. Voyage code embeddings are noticeably better for code if user opts in. |
| **Vector store** | LanceDB (embedded) | Local, file-based, no server. Beats Chroma on speed and disk footprint for our scale. Avoid pgvector — adds Postgres dependency we don't need. |
| **Graph store** | SQLite (via `sqlite3` stdlib or `aiosqlite`) | The structural graph is small (10k–500k rows for most repos). SQLite handles it trivially. Don't pull in Neo4j. |
| **LLM** | Anthropic API (Claude Sonnet 4.5 by default) | The narrator's quality is the product. Allow user to swap via env var, but default to the best instruction-follower for our methodology. |
| **Frontend framework** | Next.js (App Router) + TypeScript | Matches existing project conventions. App Router for the streaming chat responses. |
| **Graph viz** | React Flow | Best ergonomics for interactive node-link diagrams in React. Handles 1000+ nodes with virtualization. We're not using D3 directly — too much imperative DOM code for our needs. |
| **UI primitives** | Tailwind + shadcn/ui | Same as existing projects. |
| **Package management** | `uv` (Python), `pnpm` (Node) | `uv` for fast Python installs and lockfiles. `pnpm` for monorepo-friendly node_modules. |
| **Process orchestration** | A single `make dev` or `pnpm dev` script that runs both API and frontend with `concurrently` or `procs` | No Docker for local dev. Docker only at the deploy boundary if we ever ship hosted. |

---

## 4. Data model

This is the canonical schema. Keep it stable — frontend and narrator both depend on these shapes.

### 4.1 SQLite (structural graph)

```sql
-- One row per indexed file
CREATE TABLE files (
    id              INTEGER PRIMARY KEY,
    repo_id         TEXT NOT NULL,
    path            TEXT NOT NULL,         -- relative to repo root
    language        TEXT NOT NULL,         -- 'typescript', 'python', etc.
    loc             INTEGER NOT NULL,
    sha             TEXT NOT NULL,         -- content hash for cache invalidation
    last_modified   INTEGER NOT NULL,      -- unix ts
    UNIQUE(repo_id, path)
);

-- One row per top-level symbol (function, class, exported const)
CREATE TABLE symbols (
    id          INTEGER PRIMARY KEY,
    file_id     INTEGER NOT NULL REFERENCES files(id),
    name        TEXT NOT NULL,
    kind        TEXT NOT NULL,             -- 'function', 'class', 'const', 'type'
    start_line  INTEGER NOT NULL,
    end_line    INTEGER NOT NULL,
    is_exported BOOLEAN NOT NULL
);

-- One row per import or call edge
CREATE TABLE edges (
    id          INTEGER PRIMARY KEY,
    source_id   INTEGER NOT NULL,          -- file_id or symbol_id
    target_id   INTEGER NOT NULL,
    source_kind TEXT NOT NULL,             -- 'file' or 'symbol'
    target_kind TEXT NOT NULL,
    edge_kind   TEXT NOT NULL,             -- 'import', 'call', 'extends', 'implements'
    weight      INTEGER NOT NULL DEFAULT 1 -- e.g. call count if known
);

-- Git history overlay, for hotspots and churn
CREATE TABLE file_history (
    file_id     INTEGER NOT NULL REFERENCES files(id),
    commits_30d INTEGER NOT NULL DEFAULT 0,
    commits_90d INTEGER NOT NULL DEFAULT 0,
    authors_90d INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (file_id)
);

-- Change coupling: files that frequently change together
CREATE TABLE coupling (
    file_a_id   INTEGER NOT NULL,
    file_b_id   INTEGER NOT NULL,
    co_changes  INTEGER NOT NULL,
    PRIMARY KEY (file_a_id, file_b_id),
    CHECK (file_a_id < file_b_id)         -- canonical ordering, no dupes
);

CREATE INDEX idx_edges_source ON edges(source_id, source_kind);
CREATE INDEX idx_edges_target ON edges(target_id, target_kind);
CREATE INDEX idx_symbols_file ON symbols(file_id);
```

**Design notes:**

- `edges` is polymorphic (source can be file or symbol) because we want both file-level *and* symbol-level edges in one table for fast joins. Use the `_kind` columns to disambiguate.
- `coupling` uses canonical ordering (`a_id < b_id`) so we never store the same pair twice. Enforce this at insert time.
- `file_history` and `coupling` are populated by a separate pass that reads `git log`. Don't entangle this with AST parsing.

### 4.2 LanceDB (semantic chunks)

One table, one schema:

```python
{
    "id": str,              # f"{repo_id}:{file_path}:{chunk_index}"
    "repo_id": str,
    "file_path": str,
    "start_line": int,
    "end_line": int,
    "symbol_name": str | None,   # if chunk corresponds to a named symbol
    "content": str,              # the actual code text
    "summary": str | None,       # optional one-line LLM-generated summary
    "vector": list[float],       # the embedding
}
```

**Chunking strategy:**

- Chunk by **symbol** when possible (one chunk per function/class). This preserves semantic boundaries.
- For files without clear symbols (config, JSON, markdown), chunk by ~40-line windows with 5-line overlap.
- Never chunk across file boundaries.
- Embed the chunk content prefixed with `f"File: {file_path}\nSymbol: {symbol_name}\n\n{content}"` — the path context measurably improves retrieval quality for code.

---

## 5. The processing pipeline

When a developer points Codebase Vector at a local repo, this is the order of operations. Treat it as a contract — these stages should be implementable independently and testable in isolation.

```
1. WALK    →  enumerate files, filter by .gitignore + skiplist (node_modules,
              .venv, dist, build, .git, lockfiles, binary assets)
2. PARSE   →  tree-sitter pass per file: extract symbols, imports, calls
3. RESOLVE →  resolve imports to file IDs (handle relative paths, aliases,
              tsconfig "paths", Python's package resolution)
4. GRAPH   →  insert files, symbols, edges into SQLite
5. GIT     →  read git log, populate file_history and coupling tables
6. CHUNK   →  produce semantic chunks per spec in §4.2
7. EMBED   →  batch chunks through embedding model (local or API)
8. STORE   →  write vectors + metadata to LanceDB
9. READY   →  emit indexing-complete event; UI can now query
```

**Incremental re-indexing:** on subsequent runs, compare each file's SHA to the stored value. If unchanged, skip stages 2–8 for that file. If changed, re-run stages 2–8 for that file only, and recompute affected edges. This keeps re-index time on a hot repo under 5 seconds for typical edits.

---

## 6. Build phases (in order)

Build in this order. **Don't skip ahead.** Each phase produces something demoable; that's the point.

### Phase 1 — Indexer MVP (no UI yet)

Goal: point a CLI at a repo, get a populated SQLite + LanceDB on disk.

- [ ] Repo walker with sensible defaults (`.gitignore` aware, hardcoded skip list)
- [ ] tree-sitter integration for **TypeScript and Python only** at this stage
- [ ] Symbol + import extraction
- [ ] SQLite schema + writer
- [ ] CLI: `codebase-vector index <path>`

Skip git history, skip embeddings, skip the resolver edge cases. Get the spine right first.

### Phase 2 — Resolution + git overlay

Goal: edges actually resolve correctly, and we have churn data.

- [ ] Import resolver for TS (handle `tsconfig.json` paths, relative imports, `node_modules` exclusion)
- [ ] Import resolver for Python (handle package imports, relative imports, `__init__.py` packages)
- [ ] Git history pass (`git log --name-only --pretty=format:%H` → `file_history` + `coupling`)
- [ ] CLI flag to dump the graph as JSON for inspection

This phase is where most bugs will live. Budget time for it.

### Phase 3 — Embeddings + semantic search

Goal: `codebase-vector search "where do users get authenticated"` returns relevant chunks.

- [ ] Chunker (symbol-based with line-window fallback)
- [ ] Embedding pipeline (default to local nomic, env-var swap to Voyage)
- [ ] LanceDB writer
- [ ] CLI: `codebase-vector search "<query>"` → top-K results with file paths and line ranges

### Phase 4 — FastAPI layer

Goal: localhost API exposing the four endpoints.

- [ ] `POST /index` — kick off indexing, return job ID, stream progress via SSE
- [ ] `GET /graph?scope=folder:src/api&depth=2` — return graph slice as JSON
- [ ] `GET /search?q=...&k=10` — semantic search
- [ ] `POST /explain` — narrator endpoint (see §8); streams response

### Phase 5 — Frontend graph view

Goal: open a browser, see the codebase as an interactive graph.

- [ ] Next.js app skeleton
- [ ] Repo picker (file dialog → POST to `/index`)
- [ ] Indexing progress UI (SSE consumer)
- [ ] React Flow graph with **folder-aware layout** (see §9)
- [ ] Node click → side panel showing file content + symbols
- [ ] Filter controls: by language, by folder, by "recently changed"

### Phase 6 — The narrator (chat panel)

Goal: the developer can ask "explain this" and get the walkthrough.

- [ ] Chat UI panel alongside the graph
- [ ] System prompt loaded from `docs/CODEBASE_WALKTHROUGH.md` (literally — that file becomes the brain)
- [ ] Retrieval: for each user turn, fetch (a) relevant graph context based on what's selected/visible in the UI and (b) top-K semantic chunks. Both feed into the prompt.
- [ ] Streaming responses with citations (file paths + line ranges) that the user can click to jump in the graph view

This is the phase where the product becomes *the product*. Spend extra care here.

### Phase 7 — Polish

- [ ] Hotspot overlay (color nodes by `commits_90d`)
- [ ] Coupling overlay (dashed edges between frequently co-changed files)
- [ ] Saved walkthroughs (developer can pin a chat session as a doc)
- [ ] Settings: swap embedding provider, swap LLM, set API keys

---

## 7. Coding conventions

These conventions are non-negotiable. They exist because the product has multiple moving parts that need to stay debuggable.

### General

- **Functional and explicit over clever.** No metaclasses, no deep decorator chains, no implicit globals. If a junior engineer can't read the code top-to-bottom and follow it, rewrite it.
- **One module, one responsibility.** Indexer doesn't call the LLM. Narrator doesn't write to SQLite. API doesn't parse code. The diagram in §2 is the law.
- **Pure functions in the core, side effects at the edges.** AST parsing and graph construction should be deterministic and testable without a filesystem mock. File I/O happens in a thin shell around them.
- **Type everything.** Python: full type hints, `mypy --strict` clean. TypeScript: no `any`, no `as` casts except at API boundaries (and even then, validate with zod).

### Python

- Use `dataclasses` or `pydantic` models for all internal data structures. No bare dicts crossing module boundaries.
- Async only where it pays off (FastAPI handlers, LLM streaming). Indexer is fine synchronous; parallelize with `concurrent.futures.ProcessPoolExecutor` for the parse stage.
- Logging via `structlog`, JSON output. Every log line includes `repo_id` if relevant.
- Errors propagate up; don't swallow them in `try/except: pass`. If a file fails to parse, log it with `level=warning` and skip — don't crash the index.

### TypeScript / Next.js

- Server Components by default. Use Client Components only for interactivity (the graph, the chat).
- API calls through a single typed client in `lib/api.ts` that mirrors the FastAPI OpenAPI schema. Generate types from OpenAPI; don't hand-write them.
- No global state libraries (Redux, Zustand) for V1. React Query for server state, `useState` for local state. Lift state only when two components actually need it.
- Styling: Tailwind utility classes. No CSS modules, no styled-components. Use shadcn/ui primitives; customize via Tailwind. Match the "minimal, functional, no decorative treatments" style — clean lines, plenty of whitespace, no gradients or shadows unless they communicate something.

### Repo layout

```
codebase-vector/
├── apps/
│   ├── api/                 # FastAPI app
│   │   ├── pyproject.toml
│   │   ├── src/
│   │   │   ├── main.py
│   │   │   ├── routes/
│   │   │   ├── indexer/     # the indexer module
│   │   │   ├── narrator/    # the narrator module
│   │   │   └── storage/     # SQLite + LanceDB adapters
│   │   └── tests/
│   └── web/                 # Next.js app
│       ├── package.json
│       ├── app/
│       ├── components/
│       └── lib/
├── docs/
│   ├── CODEBASE_WALKTHROUGH.md   # the senior-engineer methodology
│   └── ARCHITECTURE.md           # this kind of doc, but human-facing
├── CLAUDE.md                # this file
├── README.md
└── Makefile                 # dev orchestration
```

---

## 8. The senior-engineer narrator (LLM layer)

This is the heart of the product. Get this right and everything else is plumbing.

### Prompt structure

The system prompt for every narrator call is built from three layers, concatenated in this order:

1. **The methodology** — full contents of `docs/CODEBASE_WALKTHROUGH.md`. This is what makes the narrator behave like a senior engineer instead of a generic code assistant.
2. **The grounding context** — a structured block built fresh for each user turn:
   ```
   <repo_context>
     <repo_summary>Auto-generated one-paragraph summary, cached after first index.</repo_summary>
     <top_level_structure>{folder_tree_to_depth_2}</top_level_structure>
     <currently_focused>{whatever node/file the user has selected in the UI}</currently_focused>
     <relevant_chunks>{top_K semantic search results for the user's query}</relevant_chunks>
     <hotspots>{top 5 files by commits_90d, if relevant}</hotspots>
   </repo_context>
   ```
3. **The instruction** — a short paragraph reminding the model to: stay grounded in the provided context, cite file paths and line ranges, follow the 7-step methodology, end with an invitation for the next question.

### Retrieval logic

For each user turn, build `<repo_context>` by:

1. Always include `repo_summary` and `top_level_structure` (cheap, small).
2. If the user has a node selected in the UI, include that node's immediate neighborhood (1-hop edges) as `currently_focused`.
3. Run semantic search on the user's message → top 8 chunks → include as `relevant_chunks`.
4. If the message contains keywords like "messy", "hotspot", "where's the action", include `hotspots`.

Cap the total grounding context at ~8000 tokens. If retrieval returns more, rank by combined score (semantic similarity + graph proximity to selected node) and trim.

### What the narrator must never do

- **Invent file paths.** Every path mentioned in a response must come from `<repo_context>`. If the model wants to mention a file that wasn't retrieved, it should say "I don't have that file in context — want me to search for it?"
- **Pretend to have read files it didn't retrieve.** Same rule.
- **Skip the methodology.** The 7-step walkthrough in `CODEBASE_WALKTHROUGH.md` is the contract.
- **Dump everything in one response.** If the answer is long, the narrator stops at a natural checkpoint and asks if the developer wants to keep going.

Enforce the "invented path" rule by post-processing the response: extract all file paths matching the repo's known structure, and flag any that don't exist. In V1, log them. In V2, regenerate or annotate.

---

## 9. Visualization principles (frontend)

The graph view is where most tools fail. The rules below come directly from the research summarized in `docs/CODEBASE_WALKTHROUGH.md`.

### Layout

- **Default to a folder-aware layered layout, not pure force-directed.** Group nodes by their top-level folder. Within each group, lay out by dependency depth (top = entry points, bottom = leaves).
- **Never render more than ~80 nodes at once on first load.** Start collapsed at folder level. Let the user expand folders to reveal their files.
- **Edges**: use orthogonal routing when nodes are grouped, curved bezier when free-floating. Bundle edges that share source-and-target groups so the canvas doesn't become spaghetti.

### Encoding

Every visual channel encodes a real signal:

| Channel | Encodes |
|---|---|
| Node size | LOC (file) or member count (folder) |
| Node color | Language (with a muted, accessible palette) |
| Node border | Hotspot intensity (border thickness ∝ `commits_90d`) |
| Edge thickness | Edge weight (call count if known, else 1) |
| Edge style | Solid = import; dashed = co-change (coupling) |

Nothing on the canvas is decorative. If a channel isn't carrying signal, leave it neutral.

### Interaction

- Click a node → side panel opens with file contents, symbols, and a "Ask narrator about this" button.
- Cmd/Ctrl+click → multi-select; the narrator panel now scopes to the selection.
- Right-click a node → "Show only this file's neighborhood" filter.
- The chat panel and the graph are bidirectional: clicking a citation in chat highlights the corresponding node; selecting a node updates the chat's grounding context.

This bidirectionality is the single biggest "feels like a tool" vs "feels like a poster" lever. Don't skip it.

---

## 10. What's explicitly out of scope (V1)

Saying no is part of the design. These will come up; the answer is *not now*.

- **Hosted SaaS / multi-tenant deployment.** Local-first only. The repo never leaves the user's machine.
- **Real-time collaboration.** One developer, one local instance. No multiplayer.
- **Code editing.** This is a comprehension tool. The user reads, navigates, asks. They edit in their actual editor.
- **Authoring documentation.** We display walkthroughs; we don't generate static docs to commit.
- **Security/CVE scanning, license analysis, complexity linting.** Adjacent, useful, and out of scope. Other tools do them well.
- **VS Code extension.** Possibly V2. For V1, the web UI is enough.

If a feature request lands and it's on this list, the answer is "yes, that's a good idea, and it's V2."

---

## 11. Testing approach

- **Indexer**: golden-file tests. A small fixture repo lives in `tests/fixtures/sample-repo/`. We snapshot the resulting SQLite + LanceDB contents and compare on every change. If a parser update changes output, the snapshot needs to be regenerated *intentionally*.
- **Resolver**: table-driven tests. Each row is `(file_path, import_string, expected_target_path)`. Add a row every time a real-world resolution bug is found.
- **Narrator**: prompt regression tests. A small set of (repo_context, user_message) → expected_response_properties pairs. We check structural properties (response cites N files, mentions at most M load-bearing pieces, ends with an invitation), not exact wording.
- **Frontend**: Playwright for the critical paths (open repo → see graph → click node → chat works). No unit tests for components unless they contain real logic.
- **No mocking the LLM in integration tests.** Use a tiny real call against a cheap model with `temperature=0` and assert on structure. Mocked LLM tests give false confidence.

---

## 12. Performance budgets

Treat these as P0. If a feature would violate them, redesign.

| Operation | Budget |
|---|---|
| Full index of a 50k-LOC repo | < 60 seconds |
| Incremental re-index after one file change | < 5 seconds |
| Graph render (80 nodes, default view) | < 200ms |
| Semantic search response | < 300ms |
| First token of narrator response | < 2 seconds |
| Full narrator response | < 15 seconds (streamed) |

---

## References

The methodology and design principles in this document are grounded in:

- `docs/CODEBASE_WALKTHROUGH.md` (in this repo) — the full senior-engineer methodology, including the four-question structure and the cognitive research it's based on.
- Borrelli et al. (2023). *Developers' Visuo-spatial Mental Model and Program Comprehension*. arXiv:2304.09301 — basis for the "never more than 7 nodes in working memory" rule.
- *Static and Dynamic Dependency Visualization in a Layered Software City*. SN Computer Science (Springer, 2022) — basis for the layered-over-force-directed layout choice.
- *AI-Guided Exploration of Large-Scale Codebases*. arXiv:2508.05799 — basis for the narrator-grounded-in-structural-truth design.

---

## A note to future-you

When you come back to this doc in three months and want to add a feature, ask the north-star question first:

> *Would a senior engineer onboarding a new hire do this?*

If the honest answer is no, the feature doesn't belong here. Build a different product. Don't bloat this one.
