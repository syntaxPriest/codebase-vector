'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Plug, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const SNIPPETS = {
  claude: `{
  "mcpServers": {
    "codebase-vector": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}`,
  cursor: `{
  "mcpServers": {
    "codebase-vector": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}`,
} as const

type Snippet = keyof typeof SNIPPETS

export function McpInfo() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Snippet>('claude')
  const [copied, setCopied] = useState<Snippet | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const copy = async (which: Snippet) => {
    try {
      await navigator.clipboard.writeText(SNIPPETS[which])
      setCopied(which)
      setTimeout(() => setCopied(null), 1600)
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 border border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-0)] px-2 py-1 text-[10px] font-mono uppercase tracking-[0.15em] text-[color:var(--color-ink-5)] hover:border-[color:var(--color-ink-7)] hover:text-[color:var(--color-ink-8)]',
          open && 'border-[color:var(--color-ink-7)] text-[color:var(--color-ink-8)]',
        )}
        title="MCP endpoint info"
      >
        <Plug size={11} />
        mcp
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-[420px] border border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-0)] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between border-b border-[color:var(--color-ink-3)] px-3 py-2">
            <div className="text-[12px] font-medium">MCP server</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="close"
              className="text-[color:var(--color-ink-5)] hover:text-[color:var(--color-ink-8)]"
            >
              <X size={13} />
            </button>
          </div>
          <div className="px-3 py-3 text-[11.5px]">
            <p className="text-[color:var(--color-ink-7)] leading-relaxed">
              Codebase Vector exposes a Model Context Protocol endpoint at:
            </p>
            <div className="mt-2 flex items-center justify-between border border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-1)] px-2 py-1 font-mono text-[11px]">
              <span>http://localhost:3000/api/mcp</span>
              <button
                type="button"
                onClick={() => void copy(tab)}
                className="text-[color:var(--color-ink-5)] hover:text-[color:var(--color-ink-8)]"
                title="copy snippet"
              >
                {copied === tab ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>

            <div className="mt-3 flex gap-1 p-0.5 border border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-0)] w-fit">
              {(Object.keys(SNIPPETS) as Snippet[]).map((s) => {
                const active = tab === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTab(s)}
                    className={cn(
                      'px-2 py-0.5 text-[10px] tracking-wide transition-colors',
                      active
                        ? 'bg-[color:var(--color-ink-8)] text-[color:var(--color-ink-0)]'
                        : 'text-[color:var(--color-ink-5)] hover:text-[color:var(--color-ink-8)]',
                    )}
                  >
                    {s === 'claude' ? 'Claude Code' : 'Cursor'}
                  </button>
                )
              })}
            </div>

            <pre className="mt-2 bg-[color:var(--color-ink-1)] border border-[color:var(--color-ink-3)] px-3 py-2.5 text-[11px] font-mono text-[color:var(--color-ink-7)] whitespace-pre overflow-x-auto leading-[1.5]">
              {SNIPPETS[tab]}
            </pre>
            <p className="mt-2 text-[10px] text-[color:var(--color-ink-5)] font-mono">
              Add to {tab === 'claude' ? '~/.claude.json or .mcp.json' : '~/.cursor/mcp.json'} · tools: list_repos, get_graph, ask
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
