'use client'

import type { Citation } from '@/lib/api/types'
import { shortName } from '@/components/graph/encoding'
import { cn } from '@/lib/utils'

export interface CitationChipProps {
  index: number
  citation: Citation
  isFocused: boolean
  onClick: () => void
}

export function CitationChip({ index, citation, isFocused, onClick }: CitationChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${citation.file_path}:${citation.start_line}-${citation.end_line}`}
      className={cn(
        'inline-flex items-center gap-1.5 border px-1.5 py-0.5 text-[10px] font-mono transition-colors',
        isFocused
          ? 'border-[color:var(--color-accent)] bg-[color:color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-[color:var(--color-accent)]'
          : 'border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-fg)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]',
      )}
    >
      <span
        className={cn(
          'grid size-3.5 place-items-center rounded-full text-[9px] font-semibold',
          isFocused ? 'bg-[color:var(--color-accent)] text-white' : 'bg-[color:var(--color-border)] text-[color:var(--color-fg)]',
        )}
      >
        {index}
      </span>
      <span className="truncate max-w-[180px]">
        {shortName(citation.file_path)}
        <span className="opacity-60">:L{citation.start_line}</span>
      </span>
    </button>
  )
}
