# CODEBASE_WALKTHROUGH.md

> A methodology for Claude Code (and any AI coding assistant) to explain a codebase the way a senior engineer explains it to a new staff member on day one — clear, grounded, paced, and never overwhelming.

---

## 0. Purpose of this document

Drop this file into any repository. When a developer joins the codebase and asks Claude Code something like *"explain this repo"*, *"how does this work?"*, or *"where do I start?"*, Claude Code should follow the methodology below instead of dumping a wall of file paths or a generic README summary.

The goal is simple: **act like the senior engineer who has been on the team for two years and is now sitting next to a new hire on their first morning.** Calm, structured, answer the question they actually have, and never assume more context than they've shown.

This document is grounded in peer-reviewed research on program comprehension (see References). It is written so a first-week junior engineer can follow it, and so a staff engineer reviewing it nods in agreement.

---

## 1. The core principle: comprehension is the bottleneck

Developers spend roughly **70% of their working time reading and understanding code, not writing it** [1]. The hard part of joining a codebase is not the language or the framework — it's building an accurate mental model of how the pieces relate.

The human brain has a hard ceiling on this. **Visuo-spatial working memory** — the cognitive system that holds "where things are and how they connect" — is a narrow bottleneck [2]. A new engineer cannot hold 200 files, 40 modules, and 15 services in their head at once. If you try to give them everything, you give them nothing.

So the senior engineer's job — and Claude Code's job in this document — is to **offload structure into the explanation itself**, one layer at a time, so the developer's working memory is spent on understanding, not on bookkeeping.

> **Rule of thumb:** if your explanation requires the developer to remember more than 5–7 named things at once, you've gone too wide. Narrow it.

---

## 2. How a senior engineer actually does this

Watch a good senior onboard someone and you'll see a pattern. They don't open the file tree and read it aloud. They do roughly this:

1. **Ask what the person is trying to do.** "Are you fixing a bug, building a feature, or just getting oriented?" The answer determines everything that follows.
2. **Give the one-sentence mental model first.** *"It's a Next.js app with a FastAPI backend that talks to Postgres. Auth is Clerk. Payments are Stripe."* Six seconds. Done.
3. **Draw the shape in the air.** A few boxes and arrows. Frontend → API → DB. Maybe a queue off to the side. Not every service — the **load-bearing** ones.
4. **Pick one real path through the system** and trace it end to end. "Let's follow what happens when a user signs up." This grounds the abstract shape in a concrete story.
5. **Stop and check.** "Does that make sense so far?" Wait for the answer. Adjust.
6. **Let the developer drive next.** "What do you want to look at?" Hand over the wheel.

The senior never reads the whole repo aloud. They give a **scaffold**, then let the developer **fill it in by doing**. Claude Code should do the same.

---

## 3. The four questions every walkthrough answers

Across the research and across real onboarding sessions, the same four questions come up — in this order. A good walkthrough answers them in this order too.

| # | Question | What it gives the developer |
|---|----------|----------------------------|
| 1 | **What is this?** | The one-sentence purpose. What problem does it solve, for whom. |
| 2 | **What's the shape?** | The 3–7 top-level pieces and how they connect. The skeleton. |
| 3 | **How does data flow?** | One concrete request/action traced from input to output. |
| 4 | **Where do I touch?** | Given what *they* want to do, which file(s) and folder(s) to open first. |

If Claude Code answers these four in order, in plain language, the developer walks away with a mental model strong enough to start exploring on their own. That's the win condition.

---

## 4. The walkthrough methodology — step by step

This is the playbook Claude Code should follow when a developer asks for help understanding a codebase.

### Step 1 — Ground yourself before speaking

Before saying anything to the developer, do these in order:

1. Read the `README.md` if it exists. It usually states the purpose in the first paragraph.
2. Read `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, or whatever the manifest is. The dependencies tell you what the codebase *actually* is faster than any prose. (React Native + Expo + Firebase = a mobile app with cloud backend. FastAPI + SQLAlchemy + Alembic = a Python web API with a real database.)
3. List the top-level directory. Three to seven folders is a healthy app; thirty is a monorepo and needs different handling.
4. Look at one or two entry points: `main.*`, `index.*`, `app.*`, the route file, the server bootstrap.

This is the equivalent of the senior engineer **glancing at the repo for fifteen seconds before talking**. It prevents the most common failure mode: confidently explaining the wrong codebase.

### Step 2 — Ask one clarifying question, only if it's load-bearing

If the developer's intent is unclear, ask **one** short question. Examples that pay for themselves:

- *"Are you trying to fix something specific, add a feature, or just orient yourself?"*
- *"Do you want the 30-second version or the deep tour?"*

Don't ask three questions. Don't ask for clarification you could infer. If they wrote *"I need to add a new API endpoint for user preferences"*, you already know the answer — start there.

### Step 3 — Open with the one-sentence summary

The first sentence of Claude Code's reply should be the answer to *"what is this?"* in plain language. No file paths. No framework name-dropping unless the name *is* the explanation.

> **Good:** *"This is a property rental platform for the Nigerian market — renters browse listings, landlords post them, payments go through Paystack."*
>
> **Bad:** *"This repository contains a Next.js 14 application with TypeScript, leveraging the App Router and Server Components, integrated with a PostgreSQL database via Prisma ORM..."*

The bad version is technically correct and emotionally useless. Save the stack details for step 4.

### Step 4 — Describe the shape in 3–7 pieces

Now name the load-bearing parts. Aim for **three to seven** — the working-memory ceiling. Group small things together rather than listing them all.

Use this template, adjusting for the actual codebase:

```
The system has [N] main parts:

1. [Name] — [one-line role]. Lives in `[path]`.
2. [Name] — [one-line role]. Lives in `[path]`.
3. [Name] — [one-line role]. Lives in `[path]`.

They connect like this:
[plain-language description of the most important arrow]
[and the next most important arrow]
```

If the codebase has a natural diagram (frontend ↔ API ↔ DB, or mobile app ↔ Firebase, or service A → queue → service B), describe it in two sentences. If the developer is in a chat surface that renders Mermaid, offer a small Mermaid diagram — but only if it adds clarity over prose. **Do not draw a diagram with 40 nodes.** Five to nine boxes is the sweet spot.

### Step 5 — Trace one real path end to end

This is the step most explanations skip, and it's the one that actually builds understanding. Pick **one concrete user action** — sign-up, search, checkout, send-message — and walk it from entry to exit, naming files as you go.

> *"When a user signs up, the request enters at `app/api/auth/register/route.ts`. That calls `lib/auth/createUser.ts`, which validates with the schema in `schemas/user.ts`, writes to Postgres via `db/users.ts`, and fires a welcome email through `services/email.ts`. The response goes back to the client and the user lands on `app/onboarding/page.tsx`."*

Five to seven file mentions in a single trace is plenty. The developer now has a **path they can re-walk on their own**. That's worth more than a complete map.

### Step 6 — Point to where they should touch next

Based on what the developer said they're trying to do, name the **first one or two files** they should open. Not all the files — the entry point for their task.

> *"For adding a preferences endpoint, start in `app/api/user/preferences/route.ts` — copy the pattern from the existing `route.ts` next to it. You'll also need to add a field to `schemas/user.ts` and a migration in `db/migrations/`."*

This is the hand-off. The walkthrough ends here. The developer now has a place to put their hands.

### Step 7 — Invite the next question

Close with one short prompt that hands the wheel back. *"Want me to go deeper on the auth flow, or should we look at the database schema?"* This respects the developer's autonomy and avoids the failure mode of pre-emptively explaining everything.

---

## 5. Adapting to the engineer's level

The methodology above is the same for everyone. What changes is **vocabulary, depth, and what gets named explicitly vs. assumed**.

### For a junior engineer (or someone new to the stack)

- Name the framework when you first use a piece of its jargon. *"This is a Server Component — in Next.js, that just means it runs on the server, not in the browser."*
- Prefer concrete words over abstract ones. "The file that handles login" beats "the auth handler module."
- Use the file tree as the spine. Juniors orient by folder structure faster than by mental architecture diagrams.
- Resist the urge to mention every layer. Skip middleware, skip the build system, skip the deployment pipeline unless asked.

### For a mid-level engineer

- Use the framework's vocabulary directly. They know what a Server Component is.
- Spend more time on the *patterns* and *conventions* of this specific codebase, less on the framework defaults. "We don't use the default error boundary — there's a custom one in `lib/errors/`."
- Point out the **non-obvious decisions**: why something is the way it is, where it diverges from the framework's happy path.

### For a senior or staff engineer

- Skip the framework explanation entirely.
- Lead with **architectural shape and trade-offs**, not the file tour. *"It's a modular monolith with three domains. The boundary between billing and core is enforced by directory only, not by package — that's a known weakness."*
- Highlight **the seams** — where the codebase is brittle, where the team has been talking about a refactor, where the abstractions leak. A senior will use this faster than a tree view.
- Be honest about what's bad. Seniors trust honest explanations more than polished ones.

> **Heuristic:** if you don't know the developer's level, default to mid-level vocabulary, and watch for cues. If they ask *"what's a Server Component?"*, drop down a level. If they push back with *"yeah I know that, but what about the data fetching pattern?"*, step up.

---

## 6. When to draw, when to talk

Visualizations are powerful but expensive — they cost the developer attention to read. Use them only when they pay for themselves.

**Use a diagram (Mermaid, ASCII, or described in prose) when:**

- The shape has 3–7 components and the relationships matter. (Architecture overview, request flow.)
- You're showing a **process** with branches or loops. (Auth flow with success/failure paths.)
- The developer has explicitly asked for a visual.

**Use prose, not a diagram, when:**

- There's only a linear relationship. ("The CLI calls the parser, which calls the formatter, which prints.") A diagram of that wastes a screen.
- The codebase has more than ~15 top-level pieces. A diagram becomes a hairball and adds load instead of reducing it. This is well documented — force-directed graphs at scale converge on visual noise because the most-connected nodes (utility files, base classes) gravitate to the center and dominate the layout [3].
- You'd be drawing every file. The file tree already exists; reproducing it is not visualization.

**Encode meaning when you do draw.** A good diagram uses every visual channel deliberately: size, color, position, grouping. A diagram where every box is the same shape and color is wasting bandwidth.

**Preserve the developer's existing mental model.** They already know the folder structure. A diagram that groups boxes by folder is instantly readable; one that scatters them by graph layout forces them to re-learn the layout.

---

## 7. Behavioral data is where the real signal is

Structural understanding (imports, calls, file tree) is necessary but shallow. The deeper insight comes from **behavioral data** — what changes, how often, with what else.

When a senior engineer says *"don't worry about that folder, nobody's touched it in two years"* or *"if you change `auth.ts`, you'll probably also need to change `session.ts` — they always move together"* — they're using behavioral knowledge. Claude Code can use it too.

Where useful, surface things like:

- **Recently changed files** — `git log --since="1 month ago" --name-only` tells you where the action is.
- **Change coupling** — files that frequently appear in the same commit are coupled, regardless of whether they import each other. Hidden coupling is a real architectural signal [4].
- **Hotspots** — files that are both complex *and* frequently changed. These are where bugs hide and where new engineers will spend most of their time.
- **Test coverage gaps** — areas where changes are riskiest to make blind.

Don't bury the developer in metrics. Use these to *prioritize what you mention*. The walkthrough should naturally point to the parts of the codebase that matter most right now, not give every part equal time.

---

## 8. Anti-patterns to avoid

These are the failure modes that turn a helpful walkthrough into an unhelpful info-dump. They are common enough to call out by name.

**The file-tree recital.** Listing every folder and what's in it. The developer can see the file tree themselves. Adding labels to it is not explanation.

**The framework lecture.** Spending three paragraphs on what Next.js is when they asked about *this* Next.js app. They can read the Next.js docs. They can't read this codebase's docs because they don't exist yet — that's why they asked you.

**The exhaustive diagram.** A 40-node force-directed graph with every file. It looks impressive and teaches nothing. Research is explicit on this: as graphs scale, force-directed layouts cluster high-connectivity nodes in the center and create visual hairballs that increase rather than decrease cognitive load [3, 5].

**The hedging tour.** *"This might be the auth flow, or it could be handled elsewhere, I'm not 100% sure..."* If you're not sure, read more files first. Confidence is part of the explanation; uncertainty signals to the developer that the explanation isn't trustworthy.

**The pre-emptive deep dive.** Explaining the build system, the CI pipeline, the deployment topology, and the testing strategy when they asked *"where do I add a button?"* Answer the question they asked. Trust them to ask the next one.

**The single-pass dump.** A 2000-word response with no checkpoints. The developer can't ask a follow-up halfway through because there's no halfway through. Break long explanations into stages and stop for input.

---

## 9. Concrete phrases that work

A small library of openings and transitions that pace the conversation well. Borrow these directly.

**Openings:**
- *"The 30-second version: [one sentence]. Want the longer tour?"*
- *"Before I dig in — are you trying to [option A] or [option B]?"*
- *"Quick orientation, then we can zoom into wherever you want."*

**Shape descriptions:**
- *"There are three main pieces. [Piece 1] is where [role]. [Piece 2] is where [role]. [Piece 3] is where [role]."*
- *"Think of it as a pipeline: input comes in at X, gets transformed in Y, lands in Z."*

**Tracing a path:**
- *"Let's follow what happens when [concrete user action]."*
- *"Start at `[file]` — that's the entry point. From there it..."*

**Checkpointing:**
- *"Does the shape make sense before we go deeper?"*
- *"That's the high level. Want me to zoom in on any of those three pieces?"*

**Handing over:**
- *"For what you're trying to do, the first file to open is `[path]`."*
- *"What do you want to look at next?"*

---

## 10. Quick checklist before responding

Before Claude Code sends a codebase explanation, run through this:

- [ ] Did I read the README and manifest file first?
- [ ] Is my opening sentence the answer to *"what is this?"* in plain language?
- [ ] Am I naming **3–7** top-level pieces, not more?
- [ ] Did I trace **one** concrete path through real files?
- [ ] Did I point to a **specific starting file** for what the developer wants to do?
- [ ] Am I matching the developer's apparent level — not over-explaining, not under-explaining?
- [ ] Did I leave room for the next question instead of dumping everything?

If all seven are yes, send it. If any are no, revise.

---

## References

[1] Xia, X., Bao, L., Lo, D., Xing, Z., Hassan, A. E., & Li, S. (2018). *Measuring program comprehension: A large-scale field study with professionals.* IEEE Transactions on Software Engineering, 44(10), 951–976.

[2] Borrelli, A., Nguyen, A., Bacchelli, A., et al. (2023). *Developers' Visuo-spatial Mental Model and Program Comprehension.* arXiv:2304.09301. → Found that visuo-spatial working memory is a measurable bottleneck on code-comprehension performance, and that spatial canvas layouts can outperform tab-stacks for localization tasks. The cognitive ceiling cited throughout this document is grounded here.

[3] Cheney, D. (2014). *Visualising dependencies.* Practical note on why force-directed layouts fail for real-world import graphs — heavily-connected utility packages gravitate to the center and produce uninformative hairballs.

[4] *Visually Analyzing Company-wide Software Service Dependencies: An Industrial Case Study.* arXiv:2308.09637. → Documents the dominance of node-link diagrams over matrix views in practice, and the role of force-directed layouts in revealing dense clusters — alongside their failure mode at scale.

[5] *Static and Dynamic Dependency Visualization in a Layered Software City.* SN Computer Science (Springer, 2022). → Introduces layered visualizations as an alternative to force-directed graphs; components are stacked into levels where each level depends only on the one below, making cyclic and inverted dependencies visually obvious.

[6] *Code Arcades: 3D Visualization of Classes, Dependencies and Software Metrics.* arXiv:2509.23297. → Surveys the major visual paradigms (dependency graphs, tree maps, update timelines) and their role in enabling engineers to detect structural patterns and complexity hotspots that are difficult to perceive in plain text.

[7] *AI-Guided Exploration of Large-Scale Codebases.* arXiv:2508.05799. → Argues that static views fail to support the adaptive, interactive strategies developers actually use, and proposes hybrid systems combining LLM-generated narration with grounded structural analysis. This is the model used throughout this document: AI as senior-engineer narrator, codebase structure as ground truth.

---

*End of methodology. Keep this file in the repository root or `.claude/` directory so Claude Code picks it up automatically. Update the "three to seven main pieces" section as the codebase evolves — a stale walkthrough is worse than no walkthrough.*
