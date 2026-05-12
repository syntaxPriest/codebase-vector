'use client'

import { FolderOpen } from 'lucide-react'

export function EmptyState({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="grid h-full place-items-center bg-[color:var(--color-ink-0)]">
      <div className="w-full max-w-md px-6 text-center">
        <div className="mb-3 text-[10px] tracking-[0.2em] text-[color:var(--color-ink-5)] uppercase font-mono">
          codebase / vector
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--color-ink-8)] mb-3">
          See any codebase as a graph.
        </h1>
        <p className="text-[13px] text-[color:var(--color-ink-5)] leading-relaxed mb-8">
          Point at a local repo. Files and folders become nodes; imports become
          edges. A senior engineer walks you through what you&rsquo;re looking at.
        </p>

        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-2 bg-[color:var(--color-ink-8)] px-4 py-2 text-[12px] font-medium text-[color:var(--color-ink-0)] hover:opacity-90 transition-opacity"
        >
          <FolderOpen size={13} strokeWidth={1.75} />
          Open a repo
        </button>

        <div className="mt-10 text-[10px] tracking-[0.2em] text-[color:var(--color-ink-4)] uppercase font-mono">
          local · ast-parsed · grounded narration
        </div>
      </div>
    </div>
  )
}
