// Shared domain types for the codebase visualization.
// These shapes flow from `lib/ingest/buildGraph.ts` (or the synthetic
// `generator.ts`) through every consumer — hooks, views, panels.

export type FolderKind = "source" | "test" | "examples" | "docs" | "scripts" | "assets";

export interface CodebaseFile {
  id: number;
  name: string;
  /** Repo-relative path. Set for ingested files; absent for synthetic. */
  path?: string;
  folderId: number;
  folderName: string;
  /** Numeric hex (0xRRGGBB) — fed straight to three.js + SVG via toHex. */
  color: number;
  folderColor: number;
  /** Real LOC for ingested files; pseudo-LOC for synthetic. */
  loc: number;
  description?: string | null;
  imports: number[];
  importedBy: number[];
}

export interface Folder {
  id: number;
  name: string;
  kind: FolderKind;
  color: number;
  fileCount: number;
  files: CodebaseFile[];
}

export interface FolderEdge {
  source: number;
  target: number;
  weight: number;
}

export interface CodebaseMeta {
  owner: string;
  repo: string;
  sha: string;
  branch: string;
  fetchedAt: string;
  fileCount: number;
  sourceFilesScanned?: number;
}

export interface Truncation {
  total: number;
  kept: number;
}

export interface Codebase {
  folders: Folder[];
  allFiles: CodebaseFile[];
  folderEdges: FolderEdge[];
  truncated: Truncation | null;
  /** Top-level README markdown (if found during ingestion). */
  readme: string | null;
  meta?: CodebaseMeta;
}

// ──────────────────────────────────────────────────────────────
// Repo identity (URL → workspace).
// ──────────────────────────────────────────────────────────────
export type Repo =
  | { kind: "demo" }
  | { kind: "github"; owner: string; repo: string; sha?: string };

// ──────────────────────────────────────────────────────────────
// Selection — codebase-relative; the same shape works in every view.
// ──────────────────────────────────────────────────────────────
export type Selection =
  | { kind: "folder"; id: number }
  | { kind: "file";   id: number };

// ──────────────────────────────────────────────────────────────
// View modes.
// ──────────────────────────────────────────────────────────────
export type ViewMode = "vector" | "tree" | "matrix" | "treemap" | "readme";

// ──────────────────────────────────────────────────────────────
// Force-laid-out graph (consumed by useVisualizer).
// ──────────────────────────────────────────────────────────────
export interface GraphNode {
  id: number;
  name: string;
  folderName: string;
  color: number;
  isFolder: boolean;
  fileCount?: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  degree: number;
  weightSum?: number;
}

export interface GraphEdge {
  source: number;
  target: number;
  weight: number;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Hover payload shared by tooltip + tree/matrix/treemap views.
export interface HoveredItem {
  name: string;
  folderName: string;
  color: number;
  isFolder: boolean;
  fileCount?: number;
  weightSum?: number;
  degree?: number;
  x: number;
  y: number;
}

// ──────────────────────────────────────────────────────────────
// Stats (computed by useVisualizer for the StatsPanel).
// ──────────────────────────────────────────────────────────────
export interface Stats {
  nodes: number;
  edges: number;
  avgDeg: string;
  faces: number;
  volume: number;
  cov: [[number, number, number], [number, number, number], [number, number, number]];
  eigen: number[];
  center: number[];
}

// ──────────────────────────────────────────────────────────────
// Ingest progress (SSE).
// ──────────────────────────────────────────────────────────────
export type IngestStage =
  | "connecting"
  | "resolving"
  | "resolved"
  | "cached"
  | "downloading"
  | "extracting"
  | "parsing"
  | "building"
  | "done";

export interface IngestProgress {
  stage: IngestStage;
  current?: number;
  total?: number;
  sha?: string;
  branch?: string;
  tarballBytes?: number;
}

// ──────────────────────────────────────────────────────────────
// Auth / session payload returned by /api/auth/me.
// ──────────────────────────────────────────────────────────────
export type AuthProvider = "github" | "google" | "email";

export interface AuthUser {
  id: string;
  provider: AuthProvider;
  email: string;
  name: string;
  avatarUrl: string;
}

export interface AuthMe {
  user: AuthUser | null;
  /** Providers that are configured server-side and available to start a flow. */
  providers: AuthProvider[];
  /** True when the signed-in user has a GitHub access token (private repo access). */
  githubAccess: boolean;
}
