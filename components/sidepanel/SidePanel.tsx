'use client'

import { X } from 'lucide-react'
import type { GraphResponse, RepoSummary } from '@/lib/api/types'
import type { DispatchOptions } from '@/lib/agents/dispatch'
import { languageColor, shortName } from '@/components/graph/encoding'
import { AgentMenu } from '@/components/agents/AgentMenu'

export interface SidePanelProps {
  repo: RepoSummary
  graph: GraphResponse
  focusedFileId: number | null
  onClose: () => void
  onAskNarrator: (filePath: string) => void
  send?: DispatchOptions['send']
  onToast?: (message: string) => void
}

export function SidePanel({ repo, graph, focusedFileId, onClose, onAskNarrator, send, onToast }: SidePanelProps) {
  if (focusedFileId === null) return null
  const file = graph.files.find((f) => f.id === focusedFileId)
  if (!file) return null
  const symbols = graph.symbols.filter((s) => s.file_id === file.id)
  const history = graph.history.find((h) => h.file_id === file.id)
  const incoming = graph.edges.filter((e) => e.target_id === file.id && e.target_kind === 'file' && e.source_kind === 'file')
  const outgoing = graph.edges.filter((e) => e.source_id === file.id && e.source_kind === 'file' && e.target_kind === 'file')

  const importedBy = incoming
    .map((e) => graph.files.find((f) => f.id === e.source_id)?.path)
    .filter((p): p is string => Boolean(p))
  const imports = outgoing
    .map((e) => graph.files.find((f) => f.id === e.target_id)?.path)
    .filter((p): p is string => Boolean(p))

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)]">
      <header className="flex items-start justify-between gap-2 border-b border-[color:var(--color-ink-3)] px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] tracking-[0.2em] text-[color:var(--color-ink-5)] uppercase font-mono">
            file
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block size-2 rounded-full"
              style={{ background: languageColor(file.language) }}
            />
            <h2 className="truncate font-mono text-[13px] font-semibold tracking-tight text-[color:var(--color-ink-8)]">
              {shortName(file.path)}
            </h2>
          </div>
          <p className="mt-1 truncate font-mono text-[10px] text-[color:var(--color-ink-5)]" title={file.path}>
            {file.path}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="p-1 text-[color:var(--color-ink-5)] hover:text-[color:var(--color-ink-8)]"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 text-[12px]">
        <Section label="Stats">
          <Stat label="LOC" value={String(file.loc)} />
          <Stat label="Language" value={file.language} />
          {history ? (
            <>
              <Stat label="Commits (30d)" value={String(history.commits_30d)} />
              <Stat label="Commits (90d)" value={String(history.commits_90d)} />
              <Stat label="Authors (90d)" value={String(history.authors_90d)} />
            </>
          ) : null}
        </Section>

        {symbols.length > 0 ? (
          <Section label={`Symbols · ${symbols.length}`}>
            <ul className="space-y-1">
              {symbols.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 font-mono text-[11px]">
                  <span className="truncate">
                    <span className="text-[color:var(--color-muted)]">{s.kind} </span>
                    {s.name}
                  </span>
                  <span className="text-[color:var(--color-muted)]">L{s.start_line}–{s.end_line}</span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {imports.length > 0 ? (
          <Section label={`Imports · ${imports.length}`}>
            <PathList paths={imports} />
          </Section>
        ) : null}

        {importedBy.length > 0 ? (
          <Section label={`Imported by · ${importedBy.length}`}>
            <PathList paths={importedBy} />
          </Section>
        ) : null}
      </div>

      <div className="flex items-center gap-2 border-t border-[color:var(--color-border)] p-3">
        <button
          type="button"
          onClick={() => onAskNarrator(file.path)}
          className="flex-1 bg-[color:var(--color-ink-8)] px-3 py-2 text-[12px] font-medium text-[color:var(--color-ink-0)] transition-opacity hover:opacity-90"
        >
          Ask narrator
        </button>
        <AgentMenu
          input={{
            text: `${file.path} (${file.loc} loc, ${file.language})`,
            repo,
            refs: [file.path],
            intent: `Explain @${file.path} in the context of this codebase, then suggest concrete next steps.`,
          }}
          send={send}
          onResult={onToast}
          label="Agent"
        />
      </div>
    </aside>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-5)]">
        {label}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-[color:var(--color-muted)]">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}

function PathList({ paths }: { paths: string[] }) {
  return (
    <ul className="space-y-0.5">
      {paths.map((p) => (
        <li key={p} className="truncate font-mono text-[11px] text-[color:var(--color-fg)]" title={p}>
          {p}
        </li>
      ))}
    </ul>
  )
}
