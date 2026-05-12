'use client'

import { FolderOpen, RotateCw, Search } from 'lucide-react'
import type { RepoSummary, Language } from '@/lib/api/types'
import { McpInfo } from '@/components/agents/McpInfo'
import { cn } from '@/lib/utils'

export interface TopBarProps {
  repo: RepoSummary | null
  languageFilter: Set<Language>
  folderFilter: Set<string>
  recentlyChanged: boolean
  availableLanguages: Language[]
  availableFolders: string[]
  onToggleLanguage: (lang: Language) => void
  onToggleFolder: (folder: string) => void
  onToggleRecentlyChanged: () => void
  onResetFilters: () => void
  onOpenRepo: () => void
  onOpenAsk: () => void
  bridgeStatus?: 'idle' | 'paired'
}

export function TopBar({
  repo,
  languageFilter,
  folderFilter,
  recentlyChanged,
  availableLanguages,
  availableFolders,
  onToggleLanguage,
  onToggleFolder,
  onToggleRecentlyChanged,
  onResetFilters,
  onOpenRepo,
  onOpenAsk,
  bridgeStatus,
}: TopBarProps) {
  const filtersActive =
    languageFilter.size > 0 || folderFilter.size > 0 || recentlyChanged

  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-0)] px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-6)]">
          codebase / vector
        </div>
        <div className="h-4 w-px bg-[color:var(--color-ink-3)]" />
        {repo ? (
          <div className="flex items-center gap-2 text-[12px]">
            <span className="font-mono font-medium text-[color:var(--color-ink-8)]">{repo.name}</span>
            <span className="font-mono text-[10px] tracking-wide text-[color:var(--color-ink-5)]">
              {repo.file_count} files · {repo.total_loc.toLocaleString()} loc
            </span>
          </div>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-5)]">
            no repo loaded
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {repo ? (
          <div className="flex items-center gap-1.5">
            <FilterMenu
              label="Language"
              options={availableLanguages.map((l) => ({ value: l, label: l }))}
              selected={new Set([...languageFilter] as string[])}
              onToggle={(v) => onToggleLanguage(v as Language)}
            />
            <FilterMenu
              label="Folder"
              options={availableFolders.map((f) => ({ value: f, label: f }))}
              selected={folderFilter}
              onToggle={onToggleFolder}
            />
            <button
              type="button"
              onClick={onToggleRecentlyChanged}
              className={cn(
                'border px-2.5 py-1 text-[11px] transition-colors',
                recentlyChanged
                  ? 'border-[color:var(--color-accent)] bg-[color:color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-[color:var(--color-accent)]'
                  : 'border-[color:var(--color-border)] text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]',
              )}
            >
              Recently changed
            </button>
            {filtersActive ? (
              <button
                type="button"
                onClick={onResetFilters}
                className="p-1 text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
                aria-label="Reset filters"
                title="Reset filters"
              >
                <RotateCw size={13} strokeWidth={1.75} />
              </button>
            ) : null}
          </div>
        ) : null}

        {repo ? (
          <button
            type="button"
            onClick={onOpenAsk}
            className="inline-flex items-center gap-1.5 border border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-0)] px-2.5 py-1 text-[11px] hover:border-[color:var(--color-ink-7)] hover:bg-[color:var(--color-ink-1)]"
            title="Ask the codebase (⌘K)"
          >
            <Search size={13} strokeWidth={1.75} />
            <span>Ask</span>
            <span className="font-mono text-[10px] text-[color:var(--color-ink-5)]">⌘K</span>
          </button>
        ) : null}

        <McpInfo />

        {bridgeStatus !== undefined ? (
          <BridgePill status={bridgeStatus} />
        ) : null}

        <button
          type="button"
          onClick={onOpenRepo}
          className="ml-1 inline-flex items-center gap-1.5 border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-2.5 py-1 text-[11px] hover:bg-[color:var(--color-bg)]"
        >
          <FolderOpen size={13} strokeWidth={1.75} />
          {repo ? 'Open another repo' : 'Open a repo'}
        </button>
      </div>
    </header>
  )
}

function BridgePill({ status }: { status: 'idle' | 'paired' }) {
  const paired = status === 'paired'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] font-mono uppercase tracking-[0.15em]',
        paired
          ? 'border-[color:var(--color-ink-7)] bg-[color:var(--color-ink-1)] text-[color:var(--color-ink-8)]'
          : 'border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-0)] text-[color:var(--color-ink-5)]',
      )}
      title={paired ? 'Paired with the VS Code extension' : 'Pair the workspace via the VS Code extension'}
    >
      <span
        aria-hidden
        className="inline-block size-1.5 rounded-full"
        style={{ background: paired ? 'var(--color-ink-8)' : 'var(--color-ink-5)' }}
      />
      {paired ? 'paired' : 'unpaired'}
    </span>
  )
}

function FilterMenu({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: Array<{ value: string; label: string }>
  selected: Set<string>
  onToggle: (value: string) => void
}) {
  return (
    <details className="group relative">
      <summary
        className={cn(
          'cursor-pointer select-none list-none border px-2.5 py-1 text-[11px] transition-colors',
          selected.size > 0
            ? 'border-[color:var(--color-accent)] bg-[color:color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-[color:var(--color-accent)]'
            : 'border-[color:var(--color-border)] text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]',
        )}
      >
        {label}
        {selected.size > 0 ? ` · ${selected.size}` : ''}
      </summary>
      <div className="absolute right-0 z-20 mt-1 max-h-72 w-[220px] overflow-y-auto border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-1 shadow-md">
        {options.length === 0 ? (
          <div className="px-2 py-1 text-[11px] text-[color:var(--color-muted)]">No options</div>
        ) : (
          options.map((o) => {
            const isOn = selected.has(o.value)
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onToggle(o.value)}
                className={cn(
                  'flex w-full items-center gap-2 px-2 py-1 text-left text-[11px]',
                  isOn ? 'bg-[color:color-mix(in_srgb,var(--color-accent)_10%,transparent)] text-[color:var(--color-accent)]' : 'hover:bg-[color:var(--color-bg)]',
                )}
              >
                <span
                  className={cn(
                    'inline-block size-3 border',
                    isOn ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)]' : 'border-[color:var(--color-border)]',
                  )}
                />
                <span className="truncate font-mono">{o.label}</span>
              </button>
            )
          })
        )}
      </div>
    </details>
  )
}
