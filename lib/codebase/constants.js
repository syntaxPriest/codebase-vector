export const MODULES = [
  { name: "components/ui",     color: 0xff4d7e, count: 16 },
  { name: "components/layout", color: 0xff8c42, count: 7  },
  { name: "hooks",             color: 0x4ecdc4, count: 11 },
  { name: "utils",             color: 0xffd93d, count: 13 },
  { name: "api",               color: 0x6bd968, count: 9  },
  { name: "pages",             color: 0x7fb3ff, count: 8  },
  { name: "store",             color: 0xc77dff, count: 7  },
  { name: "lib",               color: 0xff6bc7, count: 10 },
];

export const FILENAMES = [
  "index","config","helpers","client","types","constants","parser","loader",
  "renderer","provider","context","hook","store","reducer","action","model",
  "schema","validator","formatter","adapter","router","guard","middleware",
  "service","repo","query","mutation","event","stream","queue",
];

export const FILE_DESCRIPTIONS = {
  index: "Barrel export aggregating the module's public surface. Re-exports types and utilities from sibling files.",
  config: "Environment-aware configuration object. Resolves values from process.env with sensible defaults.",
  helpers: "Small pure utility functions shared across the module. No external runtime dependencies.",
  client: "Configured SDK or HTTP client instance. Singleton with retry, auth, and base-URL resolution.",
  types: "Type definitions, interfaces, and discriminated unions. Pure type-land with zero runtime output.",
  constants: "Immutable constants and enum-like objects referenced throughout the module.",
  parser: "Input parsing and normalization. Converts external shapes into internal representation.",
  loader: "Lazy resource loading from disk, network, or CDN with caching and fallback.",
  renderer: "Output rendering layer. Takes structured input and produces markup or display state.",
  provider: "Context provider wrapping children with shared state and lifecycle hooks.",
  context: "React Context definition with default value and typed consumer hooks.",
  hook: "Custom React hook encapsulating stateful logic for components.",
  store: "State container with reducers, selectors, and action creators.",
  reducer: "Pure state-transition function — (state, action) → newState.",
  action: "Action creators and action-type constants for state mutations.",
  model: "Domain entity with validation, serialization, and business rules.",
  schema: "Runtime shape validation with static type inference.",
  validator: "Input validation logic. Returns typed errors for malformed data.",
  formatter: "Display-layer formatters for dates, currency, numbers, and text.",
  adapter: "Adapter translating between two otherwise incompatible interfaces.",
  router: "Route definitions and navigation handlers.",
  guard: "Authorization and permission checks before sensitive operations.",
  middleware: "Request/response middleware sitting in the pipeline.",
  service: "Business-logic layer orchestrating repositories and external APIs.",
  repo: "Data-access layer encapsulating persistence behind a clean interface.",
  query: "Read-side data fetching with caching and invalidation.",
  mutation: "Write-side operations with optimistic updates and rollback.",
  event: "Event emitters and subscription handlers.",
  stream: "Streaming data — observables, async iterators, or WebSocket pipes.",
  queue: "Job queue with priority, retry, and exponential backoff.",
};

export const FOLDER_DESCRIPTIONS = {
  "components/ui": "Stateless presentational primitives — buttons, inputs, cards, dialogs. Pure components driven by props.",
  "components/layout": "Page-level layout components. Headers, sidebars, grids, and responsive containers.",
  hooks: "Custom React hooks. Each encapsulates a single concern — data fetching, timers, media queries.",
  utils: "Pure utility functions. Formatting, parsing, math, and small type helpers with no runtime dependencies.",
  api: "HTTP client layer. Typed endpoints, request/response adapters, and error normalization.",
  pages: "Route-level components composed from UI primitives, orchestrating data and navigation.",
  store: "Global state management. Reducers, selectors, and action creators for cross-cutting concerns.",
  lib: "Third-party integration wrappers and framework-agnostic libraries.",
};

export function getFileDescription(file) {
  const base = file.name.replace(".ts", "");
  return FILE_DESCRIPTIONS[base] || "Module-specific implementation file.";
}

export function getFolderDescription(folder) {
  return FOLDER_DESCRIPTIONS[folder.name] || "Folder in the codebase.";
}

export function pseudoLOC(id) {
  const h = ((id * 2654435761) >>> 0);
  return 42 + (h % 380);
}
