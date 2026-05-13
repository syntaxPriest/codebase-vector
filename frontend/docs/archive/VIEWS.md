# VIEWS.md — Visualization specifications

> Detailed specs for the four views Codebase Vector renders. Read this alongside `CLAUDE.md` (which covers architecture) and `docs/CODEBASE_WALKTHROUGH.md` (which covers the narrator). When implementing the frontend, this file is the contract for how each view looks, what data it needs, and how the user interacts with it.

---

## 0. Why four views, not one

Different questions need different shapes. A single "do everything" view ends up doing nothing well — the most common failure mode in code-visualization tools. Each view here answers a specific question:

| View | Question it answers | When it's the default |
|---|---|---|
| **City** | *"Where is the complexity and weight?"* | First-load overview of the whole repo |
| **Service Map** | *"What are the major pieces and how do they talk?"* | Architectural orientation — the senior's "draw on a whiteboard" view |
| **Flow** | *"What happens when X action fires?"* | After the narrator traces a path, or when the user asks "how does signup work?" |
| **Folder Graph** | *"How do these specific files import each other?"* | When the user has zoomed into a folder or asks "show me how this area is wired" |

The user switches between them with a single bar at the top of the canvas. Default opens at **Service Map** because it's the closest to what a senior would draw first.

---

## 1. Shared design language

Everything below lives inside these constraints. They keep the four views feeling like one product.

### Visual style

- **Functional, restrained, no decoration.** No gradients, no glassmorphism, no neon. Inspired by the CodeSee examples: white/very-light backgrounds, subtle dotted grid, single-pixel borders, generous whitespace.
- **Background:** `#FAFAFA` (light) / `#0F0F0F` (dark). Dotted grid at 1px dots spaced ~16px, 6% opacity.
- **Cards/nodes:** white (light) or `#1A1A1A` (dark), `1px solid` border in `#E5E5E5` / `#2A2A2A`, `border-radius: 8px`. No shadow unless selected (then a soft 0 0 0 2px ring in the accent color).
- **Typography:** Inter or system UI font. Node labels at 13px medium. Folder/group labels at 11px medium uppercase tracking-wide.
- **Color usage:** color is *information*, never decoration. The palette below is the entire allowed range.

### The semantic palette

Use these consistently across all four views. A red node always means the same thing.

| Color | Token | Means |
|---|---|---|
| Neutral gray | `#6B7280` | Default, no signal |
| Blue | `#3B82F6` | Currently selected or focused |
| Green | `#10B981` | Added (in git diff overlay), or healthy |
| Amber | `#F59E0B` | Modified, or moderate hotspot |
| Red | `#EF4444` | Deleted, or severe hotspot / circular dependency |
| Purple | `#8B5CF6` | Renamed, or external dependency |
| Light blue | `#60A5FA` | Test files |

Plus a small language palette (used only when colorBy=language is active):

| Language | Color |
|---|---|
| TypeScript / TSX | `#3178C6` |
| JavaScript / JSX | `#F7DF1E` |
| Python | `#3776AB` |
| Go | `#00ADD8` |
| Rust | `#CE422B` |
| Java | `#E76F00` |
| Other | `#9CA3AF` |

### Type icons

Match the CodeSee convention from the reference images: small 2-letter monospaced badges in muted boxes, prefixed before the node label. These help the user parse node kind in under 100ms.

| Badge | Kind |
|---|---|
| `CL` | Client (frontend, mobile app) |
| `SVR` | Server (HTTP service) |
| `FN` | Function/Lambda (serverless) |
| `DB` | Database |
| `MQ` | Message queue |
| `EXT` | External service (third-party API) |
| `JS` `TS` `PY` `GO` etc. | File-level views: language icon |
| `M` `A` `D` `R` | Git status overlay (Modified/Added/Deleted/Renamed) |

Render badges as a small rounded-rect, 11px monospace font, slightly muted color. Place to the **left** of the label for service-level nodes, **right** of the filename for file-level nodes (matches the reference exactly).

### Shared interactions

These work the same way in every view:

- **Hover** → tooltip with full path + key metrics (LOC, last modified, language).
- **Click** → opens the side panel with file/service contents + "Ask narrator about this" button.
- **Cmd/Ctrl + click** → multi-select; narrator scopes to the selection.
- **Right-click** → context menu: "Focus here", "Hide", "Show neighbors only", "Trace flow from here".
- **Hover an edge** → highlight both endpoints, dim everything else to 30% opacity.
- **Cmd/Ctrl + F** → search; matches dim non-matches to 20% opacity, leaves matches at full opacity.
- **Esc** → clear selection, reset opacity.
- **Space + drag** → pan. Scroll → zoom. Same as Figma; users already know this.

### View-switching bar

A single horizontal segmented control pinned to the top of the canvas:

```
[ City ]  [ Service Map ]  [ Flow ]  [ Folder Graph ]
```

Switching views preserves the user's current focus. If they had `apps/api/auth/` selected in the Folder Graph and switch to the City, the camera flies to that district. If they switch to Service Map, the corresponding service is highlighted.

---

## 2. View 1 — The City

Inspired by CodeCharta. A 3D treemap where folders are districts and files are buildings.

### Purpose

Answer *"where is the weight and complexity?"* at a glance, across the entire codebase, at any scale (up to ~50k files). The view that survives where node-link graphs fall apart.

### When to use it

- First-load overview, especially for unfamiliar repos.
- "Where should I focus?" — the hotspots are visible from camera height.
- Tracking codebase health over time (delta mode — see below).

### Layout

- **Squarified treemap algorithm** for the 2D layout, then extruded into 3D by the height metric.
- Folders are flat plates with their name centered. Buildings (files) sit on top of the plate of their parent folder.
- Top-level folders get the biggest plates; nested folders sit on top of their parent plate, recursively.
- Margin between plates: 4 units. Margin between files within a folder: 2 units. (These are world-space units; treat as ratios, not pixels.)

### Encoding

Three independent metric channels, all user-configurable from a control bar at the top of the view:

| Channel | Default metric | Other options |
|---|---|---|
| **Area** (footprint) | `loc` (lines of code) | `symbols_count`, `imports_count` |
| **Height** | `complexity` (cyclomatic, from a complexity pass) | `commits_90d`, `authors_90d`, `coupling_count` |
| **Color** | `commits_90d` (churn) — green→amber→red gradient | `language`, `complexity`, `coverage` (if available) |

Show the three dropdowns in a header bar exactly like CodeCharta's reference image: `Area Metric Options | Height Metric Options | Color Metric Options`.

A legend in the bottom-right shows the color scale with min/max values and the current top-5 nodes by the color metric.

### Delta mode

Toggle in the top bar. When on, compare current state to a reference (default: HEAD~30 commits or "30 days ago"). Buildings that have **grown** since the reference appear with a translucent ghost on top showing the previous height. Buildings that have **shrunk** show a sunken floor. New files appear in blue. Deleted files appear as gray ghosts.

This is the killer feature for "is the codebase getting better or worse?" reviews. Don't skip it.

### Camera & controls

- Orbital camera (three.js `OrbitControls`) with clamped polar angle so the user can't tip the city upside down. Min polar angle 0.1, max 1.4 radians.
- Default camera angle: ~35° pitch, looking northeast across the city.
- Mouse wheel zooms. Right-drag pans. Left-drag orbits.
- A "reset view" button in the top-right corner that smooths back to default angle and frames the whole city.
- "Fly to" animation when the user clicks a node in another panel — 600ms easeInOutCubic to the target.

### Tech recommendation

- **Three.js via react-three-fiber** + `@react-three/drei` for camera and helpers.
- Squarified treemap layout: implement `squarify(items, container)` in pure TS, ~80 lines. Don't import a treemap library — d3-hierarchy works but pulls in d3-array, d3-scale, etc. We need so little of it that a direct implementation is cleaner.
- Use `InstancedMesh` for the buildings. A repo with 5000 files generates 5000 box meshes if you naively render each one — that tanks the FPS. Instanced rendering keeps it at 60fps on a laptop.
- Labels for the top-N most relevant nodes only (top 8 by selected color metric). Use `@react-three/drei`'s `<Html>` for label rendering — DOM labels read better than canvas text, and they don't fight with the 3D depth.
- Picking: use raycasting via `react-three-fiber`'s built-in `onClick`. Anything more elaborate is overkill.

### Performance budget

- 5,000 file nodes: must hit 60fps on M1-class hardware.
- 20,000 file nodes: must hit 30fps. Below that, switch to LOD — only render top-level folder plates with aggregate stats; expand on click.

---

## 3. View 2 — The Service Map

Inspired by the left half of CodeSee's reference image. Boxed groups containing services, with edges showing service-to-service communication.

### Purpose

Answer *"what are the major pieces, and how do they talk to each other?"* — the architectural overview. This is the view the senior engineer would draw on a whiteboard in the first five minutes.

### When to use it

- Default landing view (because it's the most senior-engineer-shaped).
- Orientation: "what is this product, in five boxes."
- When the user asks high-level questions like "how is auth done?" or "where does data go?"

### What counts as a "service"

This is the hard part. A "service" isn't a file. We need a way to group files into meaningful nodes.

Use a **layered resolution** approach in this priority order:

1. **Explicit config:** if the repo has a `codebase-vector.json` with a `services` block, use it. (We document this format separately. Most users won't write one; that's fine.)
2. **Monorepo conventions:** detect `apps/*`, `services/*`, `packages/*`, `workspaces` from `package.json` / `pyproject.toml`. Each top-level entry becomes a service.
3. **Entry-point detection:** files containing `app.listen(`, `if __name__ == "__main__":`, `func main()`, `fastify(`, `express()`, AWS Lambda handler signatures — each entry point seeds a service. Roll up the files reachable from that entry point into that service node.
4. **Last resort:** top-level folders become services.

Each detected service gets classified by heuristic into a **kind** that drives the icon:

- Contains a `Dockerfile` exposing a port + has HTTP framework → `SVR`
- Lambda handler signature → `FN`
- React/Next.js/Expo entry → `CL`
- Package.json with `bin` field and no server → CLI (no icon variant yet, just `FN`)
- Detected DB connections (Postgres, MongoDB, Redis URLs in env or config) → render as `DB` external nodes

### Groups

Services are grouped into **categories** rendered as the soft-tinted background containers from the reference. Detect them with:

- `Application` — has primary entry points and the bulk of source code
- `Infrastructure` — queues, caches, workers
- `Database` — anything we detected as `DB`
- `Auth` — files matching `*auth*`, `*session*`, plus detected external auth providers (Clerk, Auth0, Cognito, etc.)
- `Serverless` — services classified as `FN`
- `SAAS Tools` / `External` — detected third-party integrations from import analysis (Stripe, Segment, Twilio, etc.)
- `Client` — frontend apps

A user can drag a service between groups; we persist that override in the local DB.

### Layout

- **ELK.js** with `layered` algorithm, direction `RIGHT`.
- Groups are rendered as parent nodes containing their children, with ELK doing the inner layout.
- Edge routing: orthogonal with rounded corners (`edgeRouting: ORTHOGONAL`, `routingStyle: ORTHOGONAL`).
- Padding: 24px inside group containers. 32px between groups.
- Run layout once on data change, cache positions. Allow the user to drag and override; persist overrides to `~/.codebase-vector/<repo-hash>/layout.json`.

### Encoding

| Element | Encodes |
|---|---|
| Group color | Category (subtle tints from a 7-color pastel palette — match the reference) |
| Node icon | Service kind (`SVR`, `FN`, `DB`, etc.) |
| Edge thickness | Number of file-level imports/calls between the two services |
| Edge color | Solid neutral by default. Blue if the selected service is an endpoint of the edge. |
| Node border (when selected) | 2px blue ring |

### Interactions specific to this view

- **Click a service** → side panel shows: service name, file count, top 5 files by LOC, recent commits, "Explore inside" button (which switches to Folder Graph filtered to that service).
- **Double-click a service** → drill in: switches to Folder Graph view scoped to that service.
- **Click an edge** → side panel shows the actual imports/calls that compose this edge, with file:line citations.
- **Right-click → "Trace a flow from here"** → switches to Flow view starting at this service's entry point.

### Tech recommendation

- **React Flow** with custom node types: one per service kind, one for group containers. Use `parentNode` to nest services inside groups.
- **ELK.js** (npm: `elkjs`) for layout. Run in a Web Worker to avoid blocking the main thread on big graphs.
- Custom edge component with orthogonal routing — React Flow's default is fine for simple cases, but for orthogonal with corner radius use `getSmoothStepPath`.

---

## 4. View 3 — The Flow

Inspired by the right half of CodeSee's reference. A top-down trace of one specific user action through the system.

### Purpose

Answer *"what happens when [user does X]?"* — the senior's "let's follow what happens when a user signs up" gesture, made concrete.

### When to use it

- The narrator just described a flow in chat → render it as this view automatically.
- User right-clicks a service and picks "Trace a flow from here" → start a flow from that entry point.
- User asks the narrator "how does X work?" where X is a request/action → narrator picks the entry point and renders this view.

### Data model

A flow is a typed sequence of steps:

```typescript
type FlowStep = {
  id: string
  kind: 'client' | 'http_call' | 'service' | 'db_query' | 'queue_publish' | 'external_call' | 'function_call'
  label: string          // human-readable, e.g. "POST /api/user", "INSERT users, teams"
  service_id?: string    // links back to a Service Map node
  file_path?: string     // links back to a real file
  line_range?: [number, number]
  metadata?: Record<string, string>  // method, query type, etc.
}

type Flow = {
  id: string
  name: string           // e.g. "User sign ups"
  variant?: string       // e.g. "Sign up with GitHub"
  entry_step_id: string
  steps: FlowStep[]
  edges: Array<{ from: string; to: string; label?: string }>  // edge labels render as the small "POST /api/user" pills
}
```

### Layout

- Vertical, top-to-bottom DAG.
- ELK.js with `layered` algorithm, direction `DOWN`.
- Entry point at top, terminal steps (DB writes, external calls, response) at bottom.
- Parallel branches stay parallel (e.g., the service writes to DB *and* publishes to a queue → two columns).

### Encoding

| Element | Encodes |
|---|---|
| Step icon | Step kind — `CL`, `SVR`, `DB`, `FN`, `EXT`, `MQ` |
| Edge label (pill) | The actual operation: HTTP method + path, SQL verb, queue topic |
| Edge color | Neutral by default. Red dashed if the step is known to fail occasionally (from logs/error tracking — V2 feature). |
| Entry-point step | Tagged with a small "Entry point" badge above the node, matching the reference |

### Interactions specific to this view

- **Click a step** → side panel shows the file and the exact lines that produced this step. The narrator can elaborate on this step in the chat panel.
- **Header shows breadcrumb:** `Flows > User sign ups > Sign up with GitHub` exactly like the reference, with the star icon for "save this flow" and the small stats line "37% of Flow, 11 services, 12 API calls".
- **Variant switcher:** if a flow has variants (sign up with GitHub vs Google vs email), show them as tabs above the canvas.

### Flow detection

Where do flows come from? Three sources, in priority order:

1. **Narrator-generated:** the LLM traces a path from an entry point through the structural graph using imports/calls, validates each step against the actual file content, and emits a `Flow` JSON object. This is the V1 source.
2. **Runtime traces (V2):** if the user wires up OpenTelemetry, ingest real traces and render them as flows. Out of scope for V1 but the data model is designed for it (`metadata` field carries trace IDs).
3. **User-authored:** the user can edit a generated flow and save it. Persists to local storage.

### Tech recommendation

- React Flow again, with custom node types per step kind.
- The "Entry point" badge: an absolutely-positioned small pill above the entry step node.
- The breadcrumb header: a separate React component above the canvas, not a React Flow node.

---

## 5. View 4 — The Folder Graph

Inspired by image 3. Folder containers with files inside, edges showing imports between files, with optional git-status overlay.

### Purpose

Answer *"how do these specific files import each other?"* at the file level, within a scoped area of the codebase. This is the view the developer will spend the most time in once they're past initial orientation.

### When to use it

- User drilled in from a service in the Service Map.
- User searched for a file and wants to see its neighborhood.
- User is reviewing a PR (delta mode shows just the changed files + their dependents).

### Scope

Critical: **never show the whole codebase in this view.** It only works when scoped.

Default scope sources (in priority order):

1. The service the user drilled in from.
2. The folder the user explicitly selected.
3. "File X and its 1-hop neighbors" (when a file is selected from search).

If the user tries to widen beyond ~200 nodes, prompt: "This will show {N} files. Continue or filter?"

### Layout

- React Flow with **parent nodes for folders, child nodes for files**.
- ELK.js for the inner layout of each folder (algorithm: `mrtree` or `layered` depending on edge density).
- Folders are arranged at the top level with ELK as well, generally left-to-right by dependency direction (consumer on left, producer on right).
- Folders can be **collapsed** to a single node showing aggregate stats — clicking expands.

### Encoding

| Element | Encodes |
|---|---|
| Folder container | Light gray rounded rectangle, label at top-left with `▸`/`▾` collapse toggle |
| File node | White card, monospaced filename, optional language icon, optional git-status badge |
| Git status badge | `M` amber, `A` green, `D` red, `R` purple (only shown in delta mode or PR mode) |
| Numbered annotations (1, 2, 3...) | When the narrator is walking through this view step-by-step, it can attach small numbered badges to nodes to reference them in the chat panel — matches image 3 exactly |
| Edge color | Blue (default import), green (newly added import in PR mode), red dashed (broken/circular) |
| Edge style | Solid for direct imports, dashed for type-only imports (TypeScript `import type`) |

### Interactions specific to this view

- **Collapse/expand folders** → the layout re-runs smoothly (animate node positions over 300ms).
- **Click a file** → side panel with full file content and symbol list.
- **Hover an edge** → show what's being imported (the symbol name) in a tooltip.
- **"Highlight cycles"** button in a toolbar → if there are any circular dependencies in scope, render the cycle edges in red dashed and dim everything else.
- **"PR mode"** toggle → only show files changed in the current git diff plus their direct dependents/dependencies. The badges (M/A/D/R) are computed from `git diff --name-status`.

### The narrator integration (important)

The folder graph is where the narrator's "trace through a few files" methodology lands visually. When the narrator's response references files, those files should:

1. Be highlighted in the folder graph (1px → 2px blue border).
2. Get numbered badges (1, 2, 3...) corresponding to the order they're mentioned in the narrator's response.
3. The corresponding edges should be highlighted in blue.

This bidirectional link is the product. The chat says *"start at `routes/index.tsx` (1), which calls `Profile.tsx` (2), which uses `useMentionSuggester.ts` (3)..."* — and those exact badges appear on those exact files in the graph. The user can click a badge to jump to the file, or read the explanation in chat. Either direction works.

### Tech recommendation

- React Flow with `parentNode` and `extent: 'parent'` for folder containment.
- ELK.js for layout — run it twice: once for files within each folder (parallelizable), once for folders relative to each other.
- Smooth re-layout on collapse/expand: use React Flow's `setNodes` with the new positions, and let CSS transitions on `transform` handle the animation (set `transition: transform 300ms ease-in-out` on `.react-flow__node`).
- For numbered annotation badges: a small absolute-positioned span on the node, top-right corner, similar to a notification dot but with a number.

---

## 6. View switching & state preservation

Switching views never disorients the user. Implement these rules:

- The currently-selected file/service/folder is **the anchor**. Switching views keeps the anchor highlighted and centers/focuses on it.
- The narrator chat panel persists across all views — it's a sidebar, not part of any single view.
- The filter state (language filter, "recently changed" filter, search query) is **shared across views**. If the user has filtered to `*.ts` files only in the Folder Graph and switches to the City, the City respects the same filter.
- The view selection itself is persisted per-repo. Reopen a repo → land on the last view used.

---

## 7. Component file layout

In `apps/web/`:

```
components/
├── views/
│   ├── ViewSwitcher.tsx          # the top segmented control
│   ├── city/
│   │   ├── CityView.tsx          # react-three-fiber root
│   │   ├── Building.tsx          # the instanced mesh logic
│   │   ├── DistrictPlate.tsx     # folder plates
│   │   ├── MetricControls.tsx    # area/height/color dropdowns
│   │   └── squarify.ts           # the treemap algorithm
│   ├── service-map/
│   │   ├── ServiceMapView.tsx    # React Flow root
│   │   ├── ServiceNode.tsx       # per-kind node renderers
│   │   ├── GroupContainer.tsx    # the soft-tinted group bg
│   │   ├── ServiceEdge.tsx
│   │   └── layout.ts             # ELK invocation
│   ├── flow/
│   │   ├── FlowView.tsx
│   │   ├── FlowStep.tsx          # per-kind step renderers
│   │   ├── FlowHeader.tsx        # breadcrumb + stats
│   │   └── layout.ts
│   └── folder-graph/
│       ├── FolderGraphView.tsx
│       ├── FileNode.tsx
│       ├── FolderContainer.tsx
│       ├── ImportEdge.tsx
│       ├── NumberedBadge.tsx
│       └── layout.ts
├── shared/
│   ├── TypeIcon.tsx              # the CL/SVR/FN/DB/EXT badges
│   ├── LanguageIcon.tsx
│   ├── GitStatusBadge.tsx
│   └── SidePanel.tsx
└── narrator/
    ├── ChatPanel.tsx
    └── Citation.tsx              # clickable file:line refs that highlight in views
```

---

## 8. What's deliberately not a view

A few things from other tools that we are **not** adopting. Listed so we don't drift toward them later:

- **A pure force-directed hairball graph** — covered in `CLAUDE.md` §9. Forces converge utility files to the center; useless at scale.
- **A "code complexity heatmap" as a separate view** — that's a color metric in the City. Don't fragment.
- **A class hierarchy view** — most modern codebases aren't OO-heavy. The Folder Graph plus the side panel's symbol list cover the rare cases.
- **A timeline / git history view** — interesting but a different product. We surface temporal data as overlays (churn, delta mode) inside the existing views.
- **A "Mermaid export"** — tempting because it's cheap. Skip it. The product is the interactive view, not a screenshot generator. (Reconsider in V2 if users genuinely ask.)

---

## 9. Build order for the views

Don't try to ship all four at once. Build in this order, each working end-to-end before starting the next:

1. **Folder Graph first.** Highest daily-use value. Forces all the shared infrastructure (React Flow setup, ELK integration, side panel, narrator integration with numbered badges) into place.
2. **Service Map second.** Reuses 80% of the Folder Graph infrastructure. Adds service detection.
3. **Flow third.** Reuses React Flow + ELK from the previous two. Adds the flow data model.
4. **City last.** Different tech stack (three.js), so building it last avoids context-switching during the foundational work. By the time we get here, narrator and side panel are stable.

Each view should be **fully shippable on its own** before the next one starts. No half-built views in `main`.

---

## 10. Performance budgets per view

| View | Acceptable node count | First-paint target | Interaction frame target |
|---|---|---|---|
| City | 50,000 files (with LOD) | 1.5s | 60fps M1, 30fps any laptop |
| Service Map | 50 services | 400ms | 60fps |
| Flow | 30 steps | 300ms | 60fps |
| Folder Graph | 200 files in scope | 500ms | 60fps |

If a view violates these on a real repo, the answer is **better filtering / scoping**, not optimization. The City uses LOD; the others enforce scope.

---

## References

The view designs above are informed by:

- **CodeCharta** — for the City view metaphor and the area/height/color metric controls.
- **CodeSee** — for the Service Map grouping, the Flow trace view, and the Folder Graph with git-status overlay.
- **Sourcetrail** — for the bidirectional code ↔ graph navigation pattern (now applied to the chat ↔ graph integration).
- `docs/CODEBASE_WALKTHROUGH.md` — for the principle that visualization serves explanation, not the other way around.

When in doubt about a visualization decision, return to the north-star question from `CLAUDE.md`:

> *Would a senior engineer onboarding a new hire do this?*

The four views above all pass that test. New views must too.
