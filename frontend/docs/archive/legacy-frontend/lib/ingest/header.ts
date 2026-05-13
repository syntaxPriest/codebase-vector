// Pull a short, human-readable description out of a source file's
// leading comments. Handles JSDoc-style block comments, runs of
// `//`-comments, runs of `#`-comments (Python/Ruby/shell) and HTML
// `<!-- ... -->`. Discards obvious license/copyright/lint boilerplate.

const SCAN_BYTES = 4096;
const MAX_LEN = 200;

const NOISE_PATTERNS: RegExp[] = [
  /^\s*copyright\b/i,
  /^\s*\(c\)\s/i,
  /^\s*©/,
  /^\s*licens(e|ed)\b/i,
  /^\s*MIT\b/i,
  /^\s*All rights reserved/i,
  /^\s*This (file|software|module) is/i,
  /SPDX-License-Identifier/,
  /^\s*@(author|copyright|license|version|since|deprecated)\b/i,
  // JS/TS lint / runtime hints
  /^\s*eslint-(disable|enable|env|exports)/i,
  /^\s*ts-(ignore|expect-error|nocheck)/i,
  /^\s*prettier-(ignore|disable)/i,
  /^\s*tslint:/i,
  /^\s*<reference\s/,
  /^\s*global\s/,
  /^\s*"use\s+(strict|client|server)"/i,
  // Python / shell encoding & lint hints
  /^\s*-\*-\s/,
  /^\s*coding[:=]/i,
  /^\s*pylint:/i,
  /^\s*type:\s/i,
  /^\s*noqa\b/i,
  /^\s*flake8:/i,
  /^\s*mypy:/i,
];

const TYPEDEF_PATTERNS: RegExp[] = [
  /^\s*@(param|returns?|throws|see|example|public|private|internal|type|typedef)\b/i,
];

function cleanLine(line: string): string {
  return line
    .replace(/^\s*\*\s?/, "")
    .replace(/^\s*\/\/\s?/, "")
    .replace(/^\s*\/\*+\s?/, "")
    .replace(/^\s*#+\s?/, "")          // Python/Ruby/shell comments + Markdown headings
    .replace(/^\s*<!--+\s?/, "")
    .replace(/^\s*!\s?/, "")
    .replace(/\s*-->\s*$/, "")
    .replace(/\s*\*+\/\s*$/, "")
    .trim();
}

function isWorthwhile(line: string): boolean {
  if (line.length < 8) return false;
  if (!/\s/.test(line)) return false;
  if (NOISE_PATTERNS.some((re) => re.test(line))) return false;
  if (TYPEDEF_PATTERNS.some((re) => re.test(line))) return false;
  return true;
}

function summarize(lines: string[]): string | null {
  const cleaned = lines.map(cleanLine).filter((l) => l.length > 0);
  const filtered = cleaned.filter(isWorthwhile);
  if (filtered.length === 0) return null;
  const joined = filtered.join(" ").replace(/\s+/g, " ").trim();
  if (!joined) return null;
  const sentenceEnd = joined.search(/[.!?]\s/);
  const cut = sentenceEnd > 30 ? sentenceEnd + 1 : MAX_LEN;
  return joined.length > cut ? joined.slice(0, cut).trimEnd() + "…" : joined;
}

export function extractDescription(buf: Buffer | undefined | null): string | null {
  if (!buf || buf.length === 0) return null;
  const text = buf.toString("utf8", 0, Math.min(buf.length, SCAN_BYTES));

  // Strip BOM + shebang.
  let head = text.replace(/^﻿/, "");
  if (head.startsWith("#!")) {
    const nl = head.indexOf("\n");
    if (nl < 0) return null;
    head = head.slice(nl + 1);
  }

  // /* ... */  or  /** ... */  block at top.
  const block = head.match(/^[ \t\r\n]*\/\*\*?([\s\S]*?)\*\//);
  if (block) {
    const summary = summarize(block[1].split("\n"));
    if (summary) return summary;
  }

  // <!-- ... --> block at top (HTML / XML / Markdown frontmatter-ish).
  const htmlBlock = head.match(/^[ \t\r\n]*<!--([\s\S]*?)-->/);
  if (htmlBlock) {
    const summary = summarize(htmlBlock[1].split("\n"));
    if (summary) return summary;
  }

  // Run of // comments.
  const slashRun = head.match(/^[ \t\r\n]*((?:\/\/[^\n]*\n){1,8})/);
  if (slashRun) {
    const summary = summarize(slashRun[1].split("\n"));
    if (summary) return summary;
  }

  // Run of # comments (Python, Ruby, shell, YAML, conf, etc.).
  // Limited to plain `#` to avoid grabbing markdown headings of all
  // levels — first heading + paragraph is captured by the
  // markdown-friendly variant below.
  const hashRun = head.match(/^[ \t\r\n]*((?:#[^\n]*\n){1,8})/);
  if (hashRun) {
    const summary = summarize(hashRun[1].split("\n"));
    if (summary) return summary;
  }

  // Markdown: a single heading line followed by a non-heading paragraph.
  const md = head.match(/^[ \t\r\n]*#+\s+([^\n]+)\n\s*\n([^\n][^\n]*(?:\n[^\n][^\n]*){0,4})/);
  if (md) {
    const summary = summarize([md[2]]);
    if (summary) return summary;
  }

  return null;
}
