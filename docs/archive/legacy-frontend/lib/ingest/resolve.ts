// Resolve a JS/TS import specifier to a repo-relative file path.
// Returns the resolved path, or null if external (npm package, etc).

const EXTS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const INDEXES = ["/index.ts", "/index.tsx", "/index.js", "/index.jsx", "/index.mjs", "/index.cjs"];

export type PathsAlias = Record<string, string[]>;

export function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i < 0 ? "" : p.slice(0, i);
}

export function joinPath(base: string, rel: string): string {
  const parts = (base ? base + "/" : "").concat(rel).split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

function tryResolve(candidate: string, files: Map<string, unknown>): string | null {
  for (const ext of EXTS) {
    const p = candidate + ext;
    if (files.has(p)) return p;
  }
  for (const idx of INDEXES) {
    const p = candidate + idx;
    if (files.has(p)) return p;
  }
  return null;
}

export function resolveSpecifier(
  specifier: string,
  fromPath: string,
  files: Map<string, unknown>,
  paths: PathsAlias = {},
): string | null {
  if (specifier.startsWith(".")) {
    const dir = dirname(fromPath);
    const target = joinPath(dir, specifier);
    return tryResolve(target, files);
  }

  // tsconfig paths: "@/components/*": ["./src/components/*"]
  for (const [alias, replacements] of Object.entries(paths)) {
    const wildcard = alias.endsWith("*");
    const aliasBase = wildcard ? alias.slice(0, -1) : alias;
    if (wildcard ? specifier.startsWith(aliasBase) : specifier === aliasBase) {
      const rest = wildcard ? specifier.slice(aliasBase.length) : "";
      for (const replacement of replacements) {
        const replBase = replacement.endsWith("*") ? replacement.slice(0, -1) : replacement;
        const candidate = joinPath("", replBase + rest);
        const r = tryResolve(candidate, files);
        if (r) return r;
      }
    }
  }

  return null;
}
