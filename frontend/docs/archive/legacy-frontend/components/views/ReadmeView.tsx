"use client";

import { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import { Copy, MessageCircleQuestion, Search, Send, Terminal, Wand } from "lucide-react";
import { synthesizeReadme } from "@/lib/codebase/synthReadme";
import { useContextMenu } from "@/components/ui/ContextMenu";
import { dispatchToAgent, type AgentKey, type DispatchResult } from "@/lib/agents/dispatch";
import type { Codebase, Repo } from "@/lib/codebase/types";

import type { SessionMessage } from "@/lib/session/protocol";

interface ReadmeViewProps {
  codebase: Codebase;
  repo: Repo;
  /** When provided, right-click on a text selection offers "Ask AI". */
  onAsk?: (query: string) => void;
  /** Live editor bridge. When the workspace is paired, agent prompts
   * go through here instead of the clipboard. */
  bridgeSend?: ((msg: SessionMessage) => boolean) | null;
}

const PROSE_BASE = "max-w-[820px] mx-auto px-8 pt-24 pb-24 text-neutral-800 leading-relaxed";

// ──────────────────────────────────────────────────────────────
// YouTube embed promotion
// ──────────────────────────────────────────────────────────────
function extractYouTubeId(href: string | undefined | null): string | null {
  if (!href) return null;
  const shortMatch = href.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const watchMatch = href.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watchMatch && /youtube\.com/.test(href)) return watchMatch[1];
  const pathMatch = href.match(/youtube\.com\/(?:embed|v|shorts)\/([A-Za-z0-9_-]{11})/);
  if (pathMatch) return pathMatch[1];
  return null;
}

function YouTubeEmbed({ id, title }: { id: string; title?: string }) {
  return (
    <span className="block my-5 w-full max-w-[640px]">
      <span className="block relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title={title ?? "YouTube video"}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 w-full h-full border border-neutral-200"
        />
      </span>
    </span>
  );
}

// ──────────────────────────────────────────────────────────────
// Repo-relative path resolution.
// GitHub renders relative `![](images/foo.png)` against
// raw.githubusercontent.com, and relative `[label](docs/x.md)` against
// github.com/owner/repo/blob/branch/. Mirroring that.
// ──────────────────────────────────────────────────────────────
type Asset = "raw" | "blob";

function isAbsolute(href: string): boolean {
  return (
    /^https?:\/\//i.test(href) ||
    href.startsWith("data:") ||
    href.startsWith("mailto:") ||
    href.startsWith("//") ||
    href.startsWith("#")
  );
}

function rewriteRepoUrl(
  href: string | undefined,
  repo: Repo,
  codebase: Codebase,
  asset: Asset,
): string | undefined {
  if (!href) return href;
  if (isAbsolute(href)) return href;
  if (repo.kind !== "github" || !codebase.meta) return href;
  const branch = codebase.meta.branch || "HEAD";
  const cleaned = href.replace(/^\.\//, "").replace(/^\//, "");
  if (asset === "raw") {
    return `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${branch}/${cleaned}`;
  }
  return `https://github.com/${repo.owner}/${repo.repo}/blob/${branch}/${cleaned}`;
}

// ──────────────────────────────────────────────────────────────
// Sanitiser — extends rehype-sanitize's GitHub-flavoured default
// schema to allow the bits READMEs actually use:
// alignment attrs, width/height on img, target on a, lang on code,
// class on code/span (for syntax highlighters), checked on inputs
// (task lists), and id on every block (heading anchors).
// ──────────────────────────────────────────────────────────────
const SAFE_SCHEMA: typeof defaultSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...((defaultSchema.attributes && defaultSchema.attributes["*"]) || []), "id", "className", "align"],
    a: [
      ...((defaultSchema.attributes && defaultSchema.attributes.a) || []),
      "target",
      "rel",
    ],
    img: [
      ...((defaultSchema.attributes && defaultSchema.attributes.img) || []),
      "align",
      "width",
      "height",
      "loading",
    ],
    div: [
      ...((defaultSchema.attributes && defaultSchema.attributes.div) || []),
      "align",
    ],
    p: [
      ...((defaultSchema.attributes && defaultSchema.attributes.p) || []),
      "align",
    ],
    span: [
      ...((defaultSchema.attributes && defaultSchema.attributes.span) || []),
      "className",
    ],
    code: [
      ...((defaultSchema.attributes && defaultSchema.attributes.code) || []),
      "className",
    ],
    input: [
      ...((defaultSchema.attributes && defaultSchema.attributes.input) || []),
      "checked",
      "disabled",
      "type",
    ],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "details",
    "summary",
    "kbd",
    "sub",
    "sup",
    "mark",
    "picture",
    "source",
    "video",
    "u",
  ],
};

// Hoisted to module scope so they keep stable identity across every
// ReadmeView render. New array literals on every render would cause
// ReactMarkdown to retraverse and re-create its component tree, which
// in turn unmounts and remounts every <img> — triggering a network
// fetch for each image on every parent re-render.
const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeRaw, [rehypeSanitize, SAFE_SCHEMA], rehypeSlug] as const;

// Build the ReactMarkdown components map. Hoisted out so the closure
// over (repo, codebase) is the only thing that drives identity — the
// memo key in ReadmeView is [repo, codebase], so two consecutive
// renders with the same repo/codebase reuse the same map.
function buildMarkdownComponents(repo: Repo, codebase: Codebase): Components {
  return {
    h1: ({ children, id }) => (
      <h1 id={id} className="text-3xl font-semibold tracking-tight text-neutral-900 mb-4 leading-tight">{children}</h1>
    ),
    h2: ({ children, id }) => (
      <h2 id={id} className="text-xl font-semibold text-neutral-900 mt-10 mb-3 pb-2 border-b border-neutral-200 leading-snug">{children}</h2>
    ),
    h3: ({ children, id }) => (
      <h3 id={id} className="text-lg font-semibold text-neutral-900 mt-8 mb-2">{children}</h3>
    ),
    h4: ({ children, id }) => (
      <h4 id={id} className="text-base font-semibold text-neutral-800 mt-6 mb-2">{children}</h4>
    ),
    h5: ({ children, id }) => (
      <h5 id={id} className="text-sm font-semibold text-neutral-800 mt-5 mb-2 uppercase tracking-wide">{children}</h5>
    ),
    h6: ({ children, id }) => (
      <h6 id={id} className="text-[12px] font-semibold text-neutral-700 mt-4 mb-1 uppercase tracking-wide">{children}</h6>
    ),
    p: ({ children, ...rest }) => {
      const align = (rest as { align?: string }).align;
      return (
        <p
          className="text-[14px] text-neutral-700 my-3 leading-[1.7]"
          style={align ? { textAlign: align as "left" | "center" | "right" } : undefined}
        >
          {children}
        </p>
      );
    },
    a: ({ children, href }) => {
      const ytId = extractYouTubeId(href);
      if (ytId) {
        const title = typeof children === "string" ? children : undefined;
        return <YouTubeEmbed id={ytId} title={title} />;
      }
      const finalHref = href?.startsWith("#")
        ? href
        : rewriteRepoUrl(href, repo, codebase, "blob");
      return (
        <a
          href={finalHref}
          target={finalHref && /^https?:\/\//.test(finalHref) ? "_blank" : undefined}
          rel="noreferrer"
          className="text-neutral-900 underline underline-offset-2 decoration-neutral-300 hover:decoration-neutral-900 transition-colors"
        >
          {children}
        </a>
      );
    },
    ul: ({ children, className }) => {
      const isTaskList = typeof className === "string" && className.includes("contains-task-list");
      return (
        <ul className={`my-3 text-[14px] text-neutral-700 space-y-1 ${isTaskList ? "list-none pl-1" : "list-disc pl-6"}`}>
          {children}
        </ul>
      );
    },
    ol: ({ children }) => (
      <ol className="list-decimal pl-6 my-3 text-[14px] text-neutral-700 space-y-1">{children}</ol>
    ),
    li: ({ children, className }) => {
      const isTask = typeof className === "string" && className.includes("task-list-item");
      return (
        <li className={`leading-[1.7] ${isTask ? "list-none flex items-start gap-2" : ""}`}>{children}</li>
      );
    },
    input: ({ type, checked }) => {
      if (type !== "checkbox") return null;
      return (
        <span
          className={`inline-flex items-center justify-center w-3.5 h-3.5 mt-1 border ${
            checked ? "bg-neutral-900 border-neutral-900 text-white" : "bg-white border-neutral-300"
          }`}
          aria-hidden
        >
          {checked ? "✓" : ""}
        </span>
      );
    },
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-neutral-300 pl-4 my-4 text-neutral-600 italic">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-8 border-neutral-200" />,
    code: ({ className, children }) => {
      const isBlock = typeof className === "string" && className.startsWith("language-");
      if (isBlock) {
        return (
          <code className={`font-mono text-[12.5px] block ${className}`}>
            {children}
          </code>
        );
      }
      return (
        <code className="font-mono text-[12.5px] bg-neutral-100 text-neutral-900 px-1 py-0.5 border border-neutral-200">
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="my-4 p-4 bg-neutral-50 border border-neutral-200 overflow-x-auto text-[12.5px] leading-[1.6]">
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="border-b border-neutral-300">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-neutral-200">{children}</tbody>,
    tr: ({ children }) => <tr>{children}</tr>,
    th: ({ children }) => (
      <th className="text-left px-3 py-2 font-semibold text-neutral-900">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 text-neutral-700 align-top">{children}</td>
    ),
    img: ({ src, alt, width, height, ...rest }) => {
      const finalSrc = rewriteRepoUrl(
        typeof src === "string" ? src : undefined,
        repo,
        codebase,
        "raw",
      );
      if (!finalSrc) return null;
      const align = (rest as { align?: string }).align;
      return (
        <img
          src={finalSrc}
          alt={alt ?? ""}
          width={typeof width === "string" || typeof width === "number" ? width : undefined}
          height={typeof height === "string" || typeof height === "number" ? height : undefined}
          className="my-4 max-w-full"
          loading="lazy"
          style={align === "right" ? { float: "right", marginLeft: 16 } : align === "left" ? { float: "left", marginRight: 16 } : undefined}
        />
      );
    },
    details: ({ children }) => (
      <details className="my-4 border border-neutral-200 px-3 py-2 [&>summary]:cursor-pointer">
        {children}
      </details>
    ),
    summary: ({ children }) => (
      <summary className="text-[13px] font-medium text-neutral-900 select-none">
        {children}
      </summary>
    ),
    kbd: ({ children }) => (
      <kbd className="font-mono text-[10.5px] bg-white text-neutral-700 px-1.5 py-0.5 border border-neutral-300 shadow-[0_1px_0_rgba(0,0,0,0.06)] rounded-sm">
        {children}
      </kbd>
    ),
    sub: ({ children }) => <sub className="text-[0.75em]">{children}</sub>,
    sup: ({ children }) => <sup className="text-[0.75em]">{children}</sup>,
    strong: ({ children }) => <strong className="font-semibold text-neutral-900">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    br: () => <br />,
  };
}

export function ReadmeView({ codebase, repo, onAsk, bridgeSend }: ReadmeViewProps) {
  const ctxMenu = useContextMenu();
  const articleRef = useRef<HTMLElement | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const synthesized = useMemo(
    () => (codebase.readme ? null : synthesizeReadme(codebase)),
    [codebase],
  );
  const md = codebase.readme ?? synthesized;
  const isSynth = !codebase.readme;

  // Identity-stable across renders unless repo or codebase change.
  // Without this the components map is a new object every render, and
  // ReactMarkdown re-creates every <img>/<a>/<code> in the tree —
  // which causes the browser to re-fetch images on every parent
  // re-render.
  const markdownComponents = useMemo(
    () => buildMarkdownComponents(repo, codebase),
    [repo, codebase],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const dispatch = async (target: AgentKey, text: string) => {
    const result: DispatchResult = await dispatchToAgent(
      target,
      { text, repo },
      { send: bridgeSend ?? null },
    );
    setToast(result.message);
  };

  const handleContextMenu = (e: ReactMouseEvent<HTMLElement>) => {
    // Capture the selection synchronously, before preventDefault or
    // the menu re-render has a chance to collapse it. Even when the
    // visual highlight gets cleared as focus moves to the menu, this
    // copy keeps the selected text usable for the agent actions.
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    const raw = sel?.toString().trim() ?? "";
    const trimmed = raw.length > 1500 ? `${raw.slice(0, 1500)}…` : raw;
    const hasSelection = trimmed.length > 0;

    e.preventDefault();
    e.stopPropagation();

    ctxMenu.open(e, [
      // Selection-only items
      ...(onAsk && hasSelection
        ? [
            {
              label: "Ask AI to explain",
              Icon: MessageCircleQuestion,
              onClick: () => onAsk(`Explain this excerpt from the README and where it lives in the codebase:\n\n"${trimmed}"`),
            },
            {
              label: "Send to Ask",
              Icon: Search,
              onClick: () => onAsk(trimmed),
            },
            { label: "", separator: true },
          ]
        : []),
      // Agent actions — only meaningful with a selection
      {
        label: "Send to Claude Code",
        Icon: Terminal,
        hint: "CLI",
        disabled: !hasSelection,
        onClick: () => { if (hasSelection) void dispatch("claude-code", trimmed); },
      },
      {
        label: "Send to Cursor",
        Icon: Send,
        hint: "deep link",
        disabled: !hasSelection,
        onClick: () => { if (hasSelection) void dispatch("cursor", trimmed); },
      },
      {
        label: "Send to Codex",
        Icon: Terminal,
        hint: "CLI",
        disabled: !hasSelection,
        onClick: () => { if (hasSelection) void dispatch("codex", trimmed); },
      },
      { label: "", separator: true },
      {
        label: "Copy as agent prompt",
        Icon: Wand,
        disabled: !hasSelection,
        onClick: () => { if (hasSelection) void dispatch("copy", trimmed); },
      },
      {
        label: hasSelection ? "Copy selection" : "Copy",
        Icon: Copy,
        shortcut: "⌘C",
        disabled: !hasSelection,
        onClick: () => { if (hasSelection) void dispatch("raw", trimmed); },
      },
      ...(onAsk && !hasSelection
        ? [
            { label: "", separator: true },
            {
              label: "Open Ask panel",
              Icon: MessageCircleQuestion,
              shortcut: "⌘J",
              onClick: () => onAsk(""),
            },
            {
              label: "Tip: highlight text first",
              Icon: Search,
              disabled: true,
              hint: "for agent actions",
              onClick: () => {},
            },
          ]
        : []),
    ]);
  };

  if (!md) {
    return (
      <div className="absolute inset-0 overflow-auto bg-white">
        <div className={PROSE_BASE}>
          <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-3 font-mono">
            nothing to summarise
          </div>
          <p className="text-sm text-neutral-500">Empty codebase — no files to describe.</p>
        </div>
      </div>
    );
  }

  const tag = repo.kind === "github" ? `${repo.owner}/${repo.repo}` : "synthetic codebase";
  const tagSuffix = isSynth ? " · auto-generated" : "";

  return (
    <div className="absolute inset-0 overflow-auto bg-white">
      <div className={PROSE_BASE}>
        <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-6 font-mono break-all">
          readme · {tag}{tagSuffix}
        </div>
        <article
          className="markdown-body"
          ref={articleRef}
          onContextMenu={handleContextMenu}
        >
          <ReactMarkdown
            remarkPlugins={REMARK_PLUGINS}
            rehypePlugins={REHYPE_PLUGINS as never}
            components={markdownComponents}
          >
            {md}
          </ReactMarkdown>
        </article>
      </div>
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-3 py-2 bg-neutral-900 text-white text-[11px] font-mono"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
