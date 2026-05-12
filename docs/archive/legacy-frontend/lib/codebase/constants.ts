// Synthetic-codebase fixtures and description heuristics.
// Real repos go through different code paths; FILE_DESCRIPTIONS /
// FOLDER_DESCRIPTIONS are kept as the synthetic fallback.

import type { CodebaseFile, Folder } from "./types";

interface ModuleDef {
  name: string;
  count: number;
}

export const MODULES: ModuleDef[] = [
  { name: "components/ui",     count: 16 },
  { name: "components/layout", count: 7  },
  { name: "hooks",             count: 11 },
  { name: "utils",             count: 13 },
  { name: "api",               count: 9  },
  { name: "pages",             count: 8  },
  { name: "store",             count: 7  },
  { name: "lib",               count: 10 },
];

export const FILENAMES: string[] = [
  "index","config","helpers","client","types","constants","parser","loader",
  "renderer","provider","context","hook","store","reducer","action","model",
  "schema","validator","formatter","adapter","router","guard","middleware",
  "service","repo","query","mutation","event","stream","queue",
];

const FILE_DESCRIPTIONS: Record<string, string> = {
  index: "Barrel export aggregating the module's public surface.",
  config: "Environment-aware configuration object.",
  helpers: "Small pure utility functions shared across the module.",
  client: "Configured SDK or HTTP client instance.",
  types: "Type definitions, interfaces, discriminated unions.",
  constants: "Immutable constants and enum-like objects.",
  parser: "Input parsing and normalization.",
  loader: "Lazy resource loading with caching and fallback.",
  renderer: "Output rendering layer.",
  provider: "Context provider wrapping children with shared state.",
  context: "React Context definition and typed consumer hooks.",
  hook: "Custom React hook encapsulating stateful logic.",
  store: "State container with reducers, selectors, and action creators.",
  reducer: "Pure state-transition function.",
  action: "Action creators and action-type constants.",
  model: "Domain entity with validation and business rules.",
  schema: "Runtime shape validation with static type inference.",
  validator: "Input validation logic.",
  formatter: "Display-layer formatters for dates, currency, numbers.",
  adapter: "Adapter translating between two interfaces.",
  router: "Route definitions and navigation handlers.",
  guard: "Authorization and permission checks.",
  middleware: "Request/response middleware.",
  service: "Business-logic layer.",
  repo: "Data-access layer.",
  query: "Read-side data fetching with caching.",
  mutation: "Write-side operations.",
  event: "Event emitters and subscription handlers.",
  stream: "Streaming data pipes.",
  queue: "Job queue with retry and backoff.",
};

const FOLDER_DESCRIPTIONS: Record<string, string> = {
  "components/ui":     "Stateless presentational primitives.",
  "components/layout": "Page-level layout components.",
  hooks:               "Custom React hooks.",
  utils:               "Pure utility functions.",
  api:                 "HTTP client layer.",
  pages:               "Route-level components.",
  store:               "Global state management.",
  lib:                 "Third-party integration wrappers.",
};

const REAL_FOLDER_DESCRIPTIONS: Record<string, string> = {
  "(root)":     "Top-level files.",
  "test":       "Test suite.",
  "tests":      "Test suite.",
  "__tests__":  "Test suite.",
  "spec":       "Spec files.",
  "specs":      "Spec files.",
  "examples":   "Usage examples.",
  "example":    "Usage example.",
  "docs":       "Documentation source.",
  "doc":        "Documentation source.",
  "scripts":    "Build / utility scripts.",
  "config":     "Configuration files.",
  "src":        "Application source.",
  "lib":        "Library code.",
  "packages":   "Monorepo packages.",
  "apps":       "Monorepo applications.",
  "components": "UI components.",
  "hooks":      "React hooks.",
  "utils":      "Utility helpers.",
  "api":        "API surface.",
  "pages":      "Route-level pages.",
  "routes":     "Routing layer.",
  "models":     "Domain models.",
  "services":   "Business-logic services.",
  "store":      "State management.",
  "stores":     "State management.",
};

const FILE_KIND_PATTERNS: Array<{ pattern: RegExp; desc: string }> = [
  // Tests / specs / stories
  { pattern: /\.test\.[jt]sx?$/i,    desc: "Unit / integration tests." },
  { pattern: /\.spec\.[jt]sx?$/i,    desc: "Behavioural specs." },
  { pattern: /\.stories\.[jt]sx?$/i, desc: "Storybook stories." },

  // JS/TS family
  { pattern: /\.d\.ts$/i,            desc: "Ambient type declarations." },
  { pattern: /\.tsx$/i,              desc: "TypeScript React component." },
  { pattern: /\.jsx$/i,              desc: "React component." },
  { pattern: /\.mjs$/i,              desc: "ES module." },
  { pattern: /\.cjs$/i,              desc: "CommonJS module." },
  { pattern: /\.ts$/i,               desc: "TypeScript module." },
  { pattern: /\.js$/i,               desc: "JavaScript module." },

  // Web frameworks
  { pattern: /\.vue$/i,              desc: "Vue single-file component." },
  { pattern: /\.svelte$/i,           desc: "Svelte component." },
  { pattern: /\.astro$/i,            desc: "Astro component." },

  // Other source languages
  { pattern: /\.pyi?$/i,             desc: "Python module." },
  { pattern: /\.rb$/i,               desc: "Ruby module." },
  { pattern: /\.go$/i,               desc: "Go module." },
  { pattern: /\.rs$/i,               desc: "Rust module." },
  { pattern: /\.java$/i,             desc: "Java source." },
  { pattern: /\.kt$/i,               desc: "Kotlin source." },
  { pattern: /\.scala$/i,            desc: "Scala source." },
  { pattern: /\.swift$/i,            desc: "Swift source." },
  { pattern: /\.cs$/i,               desc: "C# source." },
  { pattern: /\.php$/i,              desc: "PHP source." },
  { pattern: /\.cpp$|\.cc$|\.cxx$|\.c$/i, desc: "C / C++ source." },
  { pattern: /\.hpp$|\.hh$|\.hxx$|\.h$/i, desc: "C / C++ header." },
  { pattern: /\.lua$/i,              desc: "Lua module." },
  { pattern: /\.dart$/i,             desc: "Dart module." },
  { pattern: /\.elm$/i,              desc: "Elm module." },
  { pattern: /\.exs?$/i,             desc: "Elixir module." },
  { pattern: /\.erl$/i,              desc: "Erlang source." },
  { pattern: /\.clj[scx]?$/i,        desc: "Clojure source." },
  { pattern: /\.hs$/i,               desc: "Haskell module." },
  { pattern: /\.ml$|\.mli$/i,        desc: "OCaml source." },
  { pattern: /\.fs$|\.fsx$|\.fsi$/i, desc: "F# source." },
  { pattern: /\.jl$/i,               desc: "Julia source." },
  { pattern: /\.nim$/i,              desc: "Nim source." },
  { pattern: /\.zig$/i,              desc: "Zig source." },
  { pattern: /\.sh$|\.bash$|\.zsh$|\.fish$/i, desc: "Shell script." },
  { pattern: /\.ps1$/i,              desc: "PowerShell script." },

  // Web / templates
  { pattern: /\.html?$/i,            desc: "HTML markup." },
  { pattern: /\.css$/i,              desc: "Stylesheet." },
  { pattern: /\.s[ac]ss$/i,          desc: "Sass stylesheet." },
  { pattern: /\.less$/i,             desc: "Less stylesheet." },

  // Data / config
  { pattern: /\.json[5c]?$/i,        desc: "JSON data." },
  { pattern: /\.ya?ml$/i,            desc: "YAML." },
  { pattern: /\.toml$/i,             desc: "TOML config." },
  { pattern: /\.xml$/i,              desc: "XML." },
  { pattern: /\.proto$/i,            desc: "Protobuf schema." },
  { pattern: /\.graphql?$/i,         desc: "GraphQL schema." },
  { pattern: /\.sql$/i,              desc: "SQL." },

  // Docs / markup
  { pattern: /\.md$|\.mdx$/i,        desc: "Markdown documentation." },
  { pattern: /\.rst$/i,              desc: "reStructuredText." },
  { pattern: /\.adoc$/i,             desc: "AsciiDoc." },
  { pattern: /\.txt$/i,              desc: "Plain text." },

  // Build / infra
  { pattern: /(^|\/)Dockerfile$/i,   desc: "Docker build recipe." },
  { pattern: /(^|\/)Makefile$/i,     desc: "Make recipe." },
  { pattern: /\.nix$/i,              desc: "Nix expression." },

  // Vector
  { pattern: /\.svg$/i,              desc: "SVG asset." },
];

export function getFileDescription(file: CodebaseFile): string {
  if (file.description) return file.description;
  if (file.path) {
    for (const { pattern, desc } of FILE_KIND_PATTERNS) {
      if (pattern.test(file.name)) return desc;
    }
    return "Source file.";
  }
  const base = file.name.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");
  return FILE_DESCRIPTIONS[base] ?? "Module-specific implementation file.";
}

export function getFolderDescription(folder: Pick<Folder, "name">): string {
  return (
    REAL_FOLDER_DESCRIPTIONS[folder.name] ??
    FOLDER_DESCRIPTIONS[folder.name] ??
    "Folder in the codebase."
  );
}

export function getLoc(file: Pick<CodebaseFile, "id" | "loc">): number {
  if (typeof file.loc === "number") return file.loc;
  const h = ((file.id * 2654435761) >>> 0);
  return 42 + (h % 380);
}

// Backwards-compat alias kept for any straggler callers.
export { getLoc as pseudoLOC };
