import { resolveRepo, downloadTarball } from "./github";
import { extractFiles } from "./extract";
import { extractImports } from "./parsers/js";
import { resolveSpecifier, type PathsAlias } from "./resolve";
import { buildGraph } from "./buildGraph";
import { readCache, writeCache } from "./cache";
import type { Codebase, IngestStage } from "@/lib/codebase/types";

// Files we can parse for imports (JS/TS family).
const PARSEABLE_EXT = /\.(jsx?|tsx?|mjs|cjs)$/i;

// Hard-skip directories — never useful in a visualization, lots of
// noise, often huge.
const SKIP_PATHS = /(^|\/)(node_modules|dist|build|out|coverage|\.next|\.nuxt|\.cache|\.git|vendor|target|tmp|fixtures?|__tests__|__mocks__|\.turbo|\.parcel-cache|\.gradle|\.idea|\.vscode|\.yarn|bower_components)\//;

// Binary or otherwise non-readable extensions. Keeping them out frees
// up the file budget for things you'd actually want to see.
const BINARY_EXT = /\.(png|jpe?g|gif|webp|avif|ico|bmp|tiff?|woff2?|otf|ttf|eot|mp[34]|webm|ogg|flac|wav|aac|mov|avi|pdf|zip|gz|tar|tgz|7z|rar|exe|dll|so|dylib|class|jar|war|ear|wasm|pyc|pyo|whl|egg|deb|rpm|dmg|iso|bin|dat|db|sqlite[23]?|map|min\.js|min\.css|sketch|fig|psd|ai|blend|fbx|obj|stl|glb|gltf|hdr|exr)$/i;

// Lock files from various ecosystems. Huge, generated, almost never
// what you want to inspect.
const LOCK_FILES = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|composer\.lock|Gemfile\.lock|Pipfile\.lock|poetry\.lock|uv\.lock|Cargo\.lock|go\.sum|flake\.lock|mix\.lock)$/i;

const noop: OnProgress = () => {};

export type ProgressInfo =
  | { sha?: string; branch?: string }
  | { tarballBytes?: number }
  | { current?: number; total?: number }
  | undefined;

export type OnProgress = (stage: IngestStage, info?: ProgressInfo) => void;

export interface IngestOptions {
  /** Pin to a specific SHA. Skips default-branch resolution. */
  sha?: string | null;
  /** Per-user OAuth token (or env GITHUB_TOKEN as fallback). */
  token?: string | null;
  onProgress?: OnProgress;
}

// Stages, in order:
//   resolving · resolved · cached · downloading · extracting · parsing · building · done
export async function ingestRepo(
  owner: string,
  repo: string,
  opts: IngestOptions = {},
): Promise<Codebase> {
  const sha = typeof opts.sha === "string" ? opts.sha : null;
  const token = opts.token ?? null;
  const onProgress = opts.onProgress ?? noop;

  onProgress("resolving");
  const meta = sha
    ? { owner, repo, sha, branch: sha }
    : await resolveRepo(owner, repo, token);
  onProgress("resolved", { sha: meta.sha, branch: meta.branch });

  const cached = await readCache(owner, repo);
  if (cached?.meta?.sha === meta.sha) {
    onProgress("cached", { sha: meta.sha });
    return cached;
  }

  onProgress("downloading", { branch: meta.branch });
  const buf = await downloadTarball(owner, repo, meta.branch, token);

  onProgress("extracting", { tarballBytes: buf.length });
  const files = await extractFiles(buf, {
    maxFileSize: 2 * 1024 * 1024,
    fileFilter: (p) =>
      !SKIP_PATHS.test(p) &&
      !BINARY_EXT.test(p) &&
      !LOCK_FILES.test(p),
  });

  const tsconfig = readTsconfig(files);

  // Only JS/TS files get parsed for imports; everything else just
  // becomes a node in the graph with no edges.
  const parseablePaths = [...files.keys()].filter((p) => PARSEABLE_EXT.test(p));
  const importsMap = new Map<string, string[]>();
  const total = parseablePaths.length;
  onProgress("parsing", { current: 0, total });

  for (let i = 0; i < total; i++) {
    const filePath = parseablePaths[i];
    const source = files.get(filePath)!.toString("utf8");
    const specifiers = extractImports(source);
    const resolved: string[] = [];
    for (const spec of specifiers) {
      const r = resolveSpecifier(spec, filePath, files, tsconfig.paths);
      if (r && PARSEABLE_EXT.test(r)) resolved.push(r);
    }
    importsMap.set(filePath, resolved);

    if (i % 25 === 0 || i === total - 1) {
      onProgress("parsing", { current: i + 1, total });
    }
  }

  onProgress("building");
  const codebase = buildGraph(files, importsMap);
  codebase.meta = {
    owner,
    repo,
    sha: meta.sha,
    branch: meta.branch,
    fetchedAt: new Date().toISOString(),
    fileCount: codebase.allFiles.length,
    sourceFilesScanned: parseablePaths.length,
  };

  await writeCache(owner, repo, codebase);
  onProgress("done");
  return codebase;
}

interface TsconfigShape {
  paths: PathsAlias;
}

function readTsconfig(files: Map<string, Buffer>): TsconfigShape {
  const raw = files.get("tsconfig.json")?.toString("utf8");
  if (!raw) return { paths: {} };
  try {
    const cleaned = raw
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/,(\s*[}\]])/g, "$1");
    const parsed = JSON.parse(cleaned);
    const rawPaths: Record<string, string[]> = parsed?.compilerOptions?.paths || {};
    const baseUrl: string = parsed?.compilerOptions?.baseUrl || "";
    const adjusted: PathsAlias = {};
    for (const [k, v] of Object.entries(rawPaths)) {
      adjusted[k] = v.map((p) => {
        const joined = baseUrl ? `${baseUrl}/${p}` : p;
        return joined.replace(/^\.\//, "").replace(/\/+/g, "/");
      });
    }
    return { paths: adjusted };
  } catch {
    return { paths: {} };
  }
}
