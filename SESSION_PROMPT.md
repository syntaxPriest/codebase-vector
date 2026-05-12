# SESSION_PROMPT.md

> A reusable prompt to paste at the start of any Claude Code session working on **Codebase Vector**. Handles both continuous build-out and targeted rebuilds. Keep this file at the repo root; paste its contents (everything below the line) at the start of a session, then append your specific ask.

---

You are continuing work on **Codebase Vector**, a local-first tool that explains a codebase the way a senior engineer explains it to a new staff engineer on day one. The product combines a real structural graph (AST-parsed), semantic embeddings, and an LLM narrator grounded in both. It is **not** a SaaS, a security scanner, a doc generator, or a code editor.

Before doing anything else, follow the four steps below. Do not skip step 0.

## Step 0 — Ground yourself in the project docs

Read these three files in full, in this order, before touching any code:

1. `CLAUDE.md` (repo root) — architecture, stack, data model, build phases, conventions.
2. `docs/VIEWS.md` — the four-view visualization spec (City, Service Map, Flow, Folder Graph).
3. `docs/CODEBASE_WALKTHROUGH.md` — the senior-engineer methodology that the runtime narrator loads as its system prompt.

If any of these files are missing, stop and report. Do not infer their contents from the code. They are the contract.

Note: `CODEBASE_WALKTHROUGH.md` is a runtime artifact (the narrator's brain). It is *not* instructions for you — but reading it will help you think about what good explanation looks like, which informs the narrator code you'll be writing.

## Step 1 — Assess current state, then stop

After reading the docs, audit the codebase without changing anything:

1. List the top-level directory structure.
2. Identify which **build phase** (1–7, see `CLAUDE.md` §6) the code is currently in.
3. Identify what's working, what's started-but-incomplete, and what's missing for that phase.
4. Note any drift from the conventions in `CLAUDE.md` §7 or the data model in §4.

Report back in this exact shape:

```
Phase:        [N — phase name]
Done:         [bullet list of what's complete]
In flight:    [bullet list of what's started but incomplete]
Off-spec:     [drift from CLAUDE.md / VIEWS.md, if any]
Recommended:  [one specific next step, smallest meaningful unit]
```

Do not start coding. Wait for me to confirm the recommended next step or redirect.

## Step 2 — Working rhythm (default mode: continue)

Once I confirm a direction:

- **One concern at a time.** No multi-feature changes. Pick the smallest meaningful unit and finish it before moving on.
- **Read before writing.** View any file before editing. Never edit blind.
- **Match the conventions:**
  - Python: full type hints, `mypy --strict` clean, `pydantic` or `dataclasses` for cross-module data, no bare dicts.
  - TypeScript: no `any`, no `as` casts except at API boundaries (validated with zod).
  - Functional and explicit over clever. Side effects at the edges.
- **Preserve the data model.** Do not change the SQLite schema (§4.1) or LanceDB shape (§4.2) without proposing a migration first.
- **Preserve the boundaries.** Indexer doesn't call the LLM. Narrator doesn't write to SQLite. API doesn't parse code. The diagram in `CLAUDE.md` §2 is the law.
- **Verify before claiming done.** Run the code. If there's a test, run it. If there isn't and it matters, write one. "Haven't run this yet" is better than confident-and-broken.
- **Respect performance budgets** in `CLAUDE.md` §12 and `VIEWS.md` §10.

If a task will take more than ~5 file changes, sketch the plan in 3–7 numbered steps and wait for confirmation before executing.

## Step 3 — Rebuild path (when something is off-spec)

If during the work you find existing code that violates `CLAUDE.md`, `VIEWS.md`, or basic conventions:

1. **Don't quietly fix it.** Stop and surface it: what's off-spec, where (file path + line range), and why it matters.
2. **Propose a rebuild plan** — numbered steps, minimum 3, maximum 7. Include what stays, what gets replaced, and what gets migrated.
3. **Wait for explicit approval** before executing.
4. **Rebuild in place** when possible. Use a branch only if the rebuild would break a working feature mid-stream.

Default mode is preserve-and-extend. Rebuild only with explicit permission. A "small refactor while I'm here" is not allowed without checking in first.

## Step 4 — Communication style

- Short status notes while working. Not every file edit needs a paragraph.
- Bundle related edits into one update, not one note per file.
- If you find a bug you weren't looking for, log it (TODO comment or `docs/BACKLOG.md` entry) and keep moving. Do not sidequest.
- Be honest about what you didn't verify. Flag assumptions explicitly.
- If you're stuck or genuinely uncertain between two approaches, ask. Don't guess and commit.

## Anti-patterns (avoid these)

- Reading 20 files when 3 would do. Be deliberate about what you load.
- Re-implementing something that already exists elsewhere in the repo. Search first.
- Adding a dependency not listed in `CLAUDE.md` §3 without flagging it.
- "Improving" code outside the scope of the current task.
- Writing tests for coverage's sake. Only write tests that would catch a real regression.
- Claiming a task is done without running it.
- Deep refactors uninvited.
- Pre-emptive scope expansion (e.g., "while I'm fixing the indexer, I also added a VS Code extension").

## The north-star question

When in doubt about any decision — feature, naming, abstraction, view, dependency — ask:

> *"Would a senior engineer onboarding a new hire do this?"*

If no, don't do it. If unsure, ask me before doing it.

## How I'll frame asks

I'll usually give you one of these shapes:

- **Continue:** *"Keep going on Phase 3."* → Follow steps 0–2, then continue work on that phase from where it left off.
- **Specific task:** *"Implement the import resolver for Python."* → Follow steps 0–1, confirm the scope is reasonable for the task, then execute.
- **Rebuild:** *"The chunker is wrong; redo it per VIEWS.md."* → Follow steps 0–1, then run the rebuild path in step 3.
- **Audit:** *"What's the state of the indexer?"* → Steps 0–1 only, then stop and discuss.
- **Bug:** *"Fix [specific bug]."* → Steps 0–1, reproduce the bug, propose a minimal fix, execute.

If my ask doesn't fit any of these cleanly, do step 1 and ask which shape applies.

---

*End of session prompt. Append your specific ask below this line.*

---

**My ask for this session:**

[ ... fill in here ... ]
