// Generate a useful overview of a codebase when no README ships with
// the repository. Pure function — takes a Codebase, returns a markdown
// string suitable for the same renderer as a real README.

import type { Codebase } from "./types";

const FOLDER_KIND_LABEL: Record<string, string> = {
  source:   "source",
  test:     "tests",
  examples: "examples",
  docs:     "docs",
  scripts:  "scripts / tools",
  assets:   "assets",
};

export function synthesizeReadme(codebase: Codebase): string {
  const meta = codebase.meta;
  const slug = meta ? `${meta.owner}/${meta.repo}` : "demo";

  const fileCount   = codebase.allFiles.length;
  const folderCount = codebase.folders.length;
  const totalLoc    = codebase.allFiles.reduce((s, f) => s + f.loc, 0);
  const totalImports = codebase.allFiles.reduce((s, f) => s + f.imports.length, 0);
  const folderEdges = codebase.folderEdges.length;

  // ── File mix by extension ───────────────────────────────────
  const extCounts = new Map<string, number>();
  for (const f of codebase.allFiles) {
    const m = f.name.match(/(\.[^./]+)$/);
    const ext = m ? m[1].toLowerCase() : "(no ext)";
    extCounts.set(ext, (extCounts.get(ext) ?? 0) + 1);
  }
  const topExts = [...extCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // ── Folders, ranked by size ────────────────────────────────
  const folderRows = [...codebase.folders]
    .map((f) => {
      const loc = f.files.reduce((s, file) => s + file.loc, 0);
      return { folder: f, loc };
    })
    .sort((a, b) => b.loc - a.loc);

  // ── Heaviest files ──────────────────────────────────────────
  const heaviest = [...codebase.allFiles]
    .sort((a, b) => b.loc - a.loc)
    .slice(0, 8)
    .filter((f) => f.loc > 0);

  // ── Most-imported files (likely entry points / core abstractions) ─
  const core = [...codebase.allFiles]
    .filter((f) => f.importedBy.length > 0)
    .sort((a, b) => b.importedBy.length - a.importedBy.length)
    .slice(0, 6);

  // ── Output ──────────────────────────────────────────────────
  const lines: string[] = [];
  lines.push(`# ${slug}`);
  lines.push("");
  lines.push("_This repository doesn't ship a README — here's an automatic overview generated from the file tree._");
  lines.push("");

  // Stats table
  lines.push("## At a glance");
  lines.push("");
  lines.push("| | |");
  lines.push("|--|--|");
  lines.push(`| Files | **${fileCount.toLocaleString()}** |`);
  lines.push(`| Folders | **${folderCount}** |`);
  lines.push(`| Lines of code | **${totalLoc.toLocaleString()}** |`);
  lines.push(`| Imports tracked | **${totalImports.toLocaleString()}** |`);
  if (folderEdges > 0) {
    lines.push(`| Cross-folder edges | **${folderEdges}** |`);
  }
  if (meta?.sha) {
    lines.push(`| Commit | \`${meta.sha.slice(0, 7)}\` (${meta.branch}) |`);
  }
  lines.push("");

  // File mix
  if (topExts.length > 0) {
    lines.push("## File mix");
    lines.push("");
    for (const [ext, n] of topExts) {
      const pct = ((n / fileCount) * 100).toFixed(1);
      lines.push(`- \`${ext}\` · ${n} files · ${pct}%`);
    }
    lines.push("");
  }

  // Folders
  if (folderRows.length > 0) {
    lines.push("## Folders");
    lines.push("");
    for (const { folder, loc } of folderRows.slice(0, 14)) {
      const kind = FOLDER_KIND_LABEL[folder.kind] ?? folder.kind;
      const locStr = loc > 0 ? ` · ${loc.toLocaleString()} loc` : "";
      lines.push(`- \`${folder.name}\` · ${kind} · ${folder.fileCount} files${locStr}`);
    }
    if (folderRows.length > 14) {
      lines.push(`- _… and ${folderRows.length - 14} more_`);
    }
    lines.push("");
  }

  // Heaviest files
  if (heaviest.length > 0) {
    lines.push("## Heaviest files");
    lines.push("");
    for (const f of heaviest) {
      lines.push(`- \`${f.path ?? f.name}\` · ${f.loc.toLocaleString()} loc`);
    }
    lines.push("");
  }

  // Core / most-imported
  if (core.length > 0) {
    lines.push("## Most-imported files");
    lines.push("");
    lines.push("Pulled in by the rest of the codebase the most — usually entry points or shared abstractions.");
    lines.push("");
    for (const f of core) {
      lines.push(`- \`${f.path ?? f.name}\` · imported by ${f.importedBy.length}`);
    }
    lines.push("");
  }

  if (codebase.truncated) {
    lines.push("## Truncated");
    lines.push("");
    lines.push(`Showing **${codebase.truncated.kept.toLocaleString()}** of **${codebase.truncated.total.toLocaleString()}** source files.`);
    lines.push("");
  }

  return lines.join("\n");
}
