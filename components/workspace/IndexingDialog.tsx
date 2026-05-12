'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { IndexJob } from '@/lib/api/types'
import { cn } from '@/lib/utils'

export interface IndexingDialogProps {
  open: boolean
  initialPath?: string
  job: IndexJob | null
  busy: boolean
  onStart: (rootPath: string) => void
  onCancel: () => void
}

const STAGE_LABEL: Record<IndexJob['stage'], string> = {
  walk: 'walking files',
  parse: 'parsing with tree-sitter',
  resolve: 'resolving imports',
  graph: 'building structural graph',
  git: 'reading git history',
  chunk: 'chunking by symbol',
  embed: 'embedding chunks',
  store: 'writing vectors',
  ready: 'ready',
}

export function IndexingDialog({
  open,
  initialPath,
  job,
  busy,
  onStart,
  onCancel,
}: IndexingDialogProps) {
  const [path, setPath] = useState(initialPath ?? '~/work/codebase-vector')

  if (!open) return null
  const percent = job ? Math.round(job.progress * 100) : 0

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/15">
      <div
        className="w-[480px] border border-[color:var(--color-ink-4)] bg-[color:var(--color-ink-0)] p-5"
        style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.14)' }}
      >
        <div className="text-[10px] tracking-[0.2em] text-[color:var(--color-ink-5)] uppercase font-mono mb-3">
          new index
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-[color:var(--color-ink-8)]">
          Point at a local repository.
        </h2>
        <p className="mt-1.5 text-[12px] text-[color:var(--color-ink-5)] leading-relaxed">
          We&rsquo;ll walk it, parse with tree-sitter, and build the graph + embeddings
          locally. Nothing leaves your machine.
        </p>

        <label className="mt-5 block font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-5)]">
          local repo path
        </label>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          spellCheck={false}
          disabled={busy}
          className={cn(
            'mt-1.5 block w-full border border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-0)] px-3 py-2 font-mono text-[12px] text-[color:var(--color-ink-8)] outline-none',
            'focus:border-[color:var(--color-ink-7)]',
            busy && 'opacity-60',
          )}
        />
        <p className="mt-1.5 text-[10px] text-[color:var(--color-ink-5)] font-mono">
          mock mode · any path resolves to a canned project graph
        </p>

        {job ? (
          <div className="mt-5 border border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-1)] px-3 py-3">
            <div className="flex items-center gap-2.5">
              <Loader2 size={13} strokeWidth={1.5} className="animate-spin text-[color:var(--color-ink-5)]" />
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[color:var(--color-ink-5)]">
                {STAGE_LABEL[job.stage]}
              </span>
              <span className="ml-auto font-mono text-[10px] text-[color:var(--color-ink-5)]">
                {percent}%
              </span>
            </div>
            <div className="mt-2 h-[2px] overflow-hidden bg-[color:var(--color-ink-3)]">
              <div
                className="h-full bg-[color:var(--color-ink-8)] transition-[width] duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            {job.message ? (
              <p className="mt-2 truncate font-mono text-[10.5px] text-[color:var(--color-ink-6)]">
                {job.message}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-3 py-1.5 text-[11px] tracking-wide font-mono text-[color:var(--color-ink-5)] hover:text-[color:var(--color-ink-8)] disabled:opacity-40"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={() => onStart(path)}
            disabled={busy || path.trim().length === 0}
            className="bg-[color:var(--color-ink-8)] px-3 py-1.5 text-[11px] tracking-wide font-mono text-[color:var(--color-ink-0)] hover:opacity-90 disabled:opacity-40"
          >
            {busy ? 'indexing…' : '↵ index'}
          </button>
        </div>
      </div>
    </div>
  )
}
