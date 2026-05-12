'use client'

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import ReactMarkdown from 'react-markdown'
import {
  AlertCircle,
  BookOpen,
  Check,
  Copy,
  Folder as FolderIcon,
  Layers,
  Loader2,
  Network,
  Plus,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react'
import { ask } from '@/lib/api/client'
import type {
  AskFile,
  AskMode,
  AskResult,
  GraphResponse,
  RepoSummary,
} from '@/lib/api/types'
import type { DispatchOptions } from '@/lib/agents/dispatch'
import { topLevelFolder, languageColor } from '@/components/graph/encoding'
import { AgentMenu } from '@/components/agents/AgentMenu'
import { cn } from '@/lib/utils'

interface ModeDef {
  key: AskMode
  label: string
  Icon: LucideIcon
  hint: string
}

const MODES: ModeDef[] = [
  { key: 'explain', label: 'explain', Icon: BookOpen, hint: 'concise summary + key files' },
  { key: 'trace',   label: 'trace',   Icon: Network,  hint: 'follow the import/call graph between files' },
  { key: 'deep',    label: 'deep',    Icon: Layers,   hint: 'comprehensive walkthrough, more files' },
]

const ROLE_LABEL: Record<AskFile['role'], string> = {
  'entry-point':  'entry',
  implementation: 'impl',
  config:         'config',
  data:           'data',
  ui:             'ui',
  test:           'test',
  support:        'support',
}

export interface AskPanelProps {
  repo: RepoSummary
  graph: GraphResponse
  open: boolean
  onClose: () => void
  /** Pre-fill the input. Cleared after first read. */
  prefill?: string | null
  onPrefillConsumed?: () => void
  /** Focus a file's node in the graph. */
  onSelectPath: (path: string) => void
  /** Push paths into the workspace's selection (context tray). */
  onAddPathsToContext?: (paths: string[]) => void
  /** Live editor bridge for the AgentMenu. */
  send?: DispatchOptions['send']
  /** Surface a toast (dispatch result, etc.). */
  onToast?: (message: string) => void
}

export function AskPanel({
  repo,
  graph,
  open,
  onClose,
  prefill,
  onPrefillConsumed,
  onSelectPath,
  onAddPathsToContext,
  send,
  onToast,
}: AskPanelProps) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<AskMode>('explain')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AskResult | null>(null)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [copiedRefs, setCopiedRefs] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const consumedPrefill = useRef<string | null>(null)

  // Reset transient panel state on the open transition.
  useEffect(() => {
    if (!open) {
      consumedPrefill.current = null
      return
    }
    setError(null)
    setLoading(false)
    setResult(null)
    setCopiedPrompt(false)
    setCopiedRefs(false)
    if (!prefill) setQuery('')
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Apply an incoming prefill exactly once per (open session, prefill value).
  useEffect(() => {
    if (!open || !prefill) return
    if (consumedPrefill.current === prefill) return
    setQuery(prefill)
    consumedPrefill.current = prefill
    onPrefillConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill])

  const pathIndex = useMemo(() => {
    const map = new Map<string, number>()
    for (const f of graph.files) map.set(f.path, f.id)
    return map
  }, [graph])

  const folderIndex = useMemo(() => {
    const set = new Set<string>()
    for (const f of graph.files) set.add(topLevelFolder(f.path))
    return set
  }, [graph])

  const fileByPath = useMemo(() => {
    const map = new Map<string, GraphResponse['files'][number]>()
    for (const f of graph.files) map.set(f.path, f)
    return map
  }, [graph])

  const submit = useCallback(async () => {
    const q = query.trim()
    if (!q || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await ask({ repo_id: repo.repo_id, query: q, mode })
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ask failed')
    } finally {
      setLoading(false)
    }
  }, [query, mode, loading, repo.repo_id])

  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void submit()
    }
  }

  const goToFile = (path: string) => {
    if (!pathIndex.has(path)) return
    onSelectPath(path)
    onClose()
  }

  const copy = async (text: string, which: 'prompt' | 'refs') => {
    try {
      await navigator.clipboard.writeText(text)
      if (which === 'prompt') {
        setCopiedPrompt(true)
        setTimeout(() => setCopiedPrompt(false), 1600)
      } else {
        setCopiedRefs(true)
        setTimeout(() => setCopiedRefs(false), 1600)
      }
    } catch {
      onToast?.('couldn’t access clipboard')
    }
  }

  const addAllToContext = () => {
    if (!result || !onAddPathsToContext) return
    onAddPathsToContext(result.files.map((f) => f.path))
    onToast?.(`added ${result.files.length} file${result.files.length === 1 ? '' : 's'} to context`)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/15 flex items-start justify-center pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="bg-[color:var(--color-ink-0)] border border-[color:var(--color-ink-4)] w-[760px] max-w-[calc(100vw-32px)] max-h-[84vh] flex flex-col"
        style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.14)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-2 px-3 border-b border-[color:var(--color-ink-3)]">
          <Search size={14} strokeWidth={1.75} className="text-[color:var(--color-ink-5)] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="ask about a feature, e.g. how does the narrator work"
            disabled={loading}
            spellCheck={false}
            className="flex-1 px-1 py-3 text-[13px] outline-none text-[color:var(--color-ink-8)] placeholder:text-[color:var(--color-ink-5)] disabled:bg-transparent disabled:cursor-not-allowed"
          />
          <button
            onClick={() => void submit()}
            disabled={loading || !query.trim()}
            className="px-3 py-1 text-[11px] tracking-wide bg-[color:var(--color-ink-8)] text-[color:var(--color-ink-0)] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity flex items-center gap-1.5"
          >
            {loading
              ? <Loader2 size={11} strokeWidth={1.75} className="animate-spin" />
              : <span>↵ ask</span>}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-[color:var(--color-ink-5)] hover:text-[color:var(--color-ink-8)] transition-colors"
            aria-label="close"
          >
            <X size={13} strokeWidth={1.75} />
          </button>
        </div>

        {/* Mode selector */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-1)]">
          <span className="text-[10px] tracking-[0.2em] text-[color:var(--color-ink-5)] uppercase font-mono">
            mode
          </span>
          <div className="flex items-center gap-1 p-0.5 border border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-0)]">
            {MODES.map(({ key, label, Icon, hint }) => {
              const active = mode === key
              return (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  disabled={loading}
                  title={hint}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 text-[10px] tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    active
                      ? 'bg-[color:var(--color-ink-8)] text-[color:var(--color-ink-0)]'
                      : 'text-[color:var(--color-ink-5)] hover:text-[color:var(--color-ink-8)] hover:bg-[color:var(--color-ink-1)]',
                  )}
                  aria-pressed={active}
                >
                  <Icon size={11} strokeWidth={1.75} />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
          <span className="text-[10px] text-[color:var(--color-ink-5)] truncate">
            {MODES.find((m) => m.key === mode)?.hint}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {!result && !error && !loading ? (
            <div className="px-4 py-8 text-center text-[12px] text-[color:var(--color-ink-5)] font-mono">
              ask about a feature, file, or pattern · ↵ to send
            </div>
          ) : null}

          {loading ? (
            <div className="px-4 py-12 text-center">
              <Loader2 size={18} strokeWidth={1.5} className="animate-spin mx-auto text-[color:var(--color-ink-5)] mb-3" />
              <div className="text-[10px] tracking-[0.2em] text-[color:var(--color-ink-5)] uppercase font-mono">
                analysing
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="px-4 py-6">
              <div className="flex items-start gap-2 text-[12px] text-[color:var(--color-ink-7)]">
                <AlertCircle size={13} strokeWidth={1.75} className="text-[color:var(--color-ink-5)] mt-0.5 flex-shrink-0" />
                <div className="font-mono break-all">{error}</div>
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="px-5 py-4 space-y-5">
              <div className="flex items-center justify-between text-[10px] tracking-[0.2em] text-[color:var(--color-ink-5)] uppercase font-mono">
                <span>
                  {result.ai ? 'claude' : 'keyword search'} ·{' '}
                  {result.files.length} {result.files.length === 1 ? 'file' : 'files'}
                  {result.folders.length > 0 ? ` · ${result.folders.length} folders` : ''}
                  {result.edges.length > 0 ? ` · ${result.edges.length} edges` : ''}
                </span>
                {!result.ai ? <span title="mock backend">mock</span> : null}
              </div>

              {result.summary ? (
                <div className="text-[15px] text-[color:var(--color-ink-8)] font-medium leading-snug">
                  {result.summary}
                </div>
              ) : null}

              {result.explanation ? (
                <div className="text-[13px] text-[color:var(--color-ink-7)] leading-[1.7]">
                  <ReactMarkdown
                    components={{
                      p:  ({ children }) => <p className="my-2">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
                      a:  ({ children, href }) => (
                        <a href={href} target="_blank" rel="noreferrer"
                           className="text-[color:var(--color-ink-8)] underline underline-offset-2 decoration-[color:var(--color-ink-4)] hover:decoration-[color:var(--color-ink-8)]">
                          {children}
                        </a>
                      ),
                      code: ({ className, children }) => {
                        const isBlock = typeof className === 'string' && className.startsWith('language-')
                        if (isBlock) {
                          return <code className={cn('font-mono text-[12px] block', className)}>{children}</code>
                        }
                        const text = String(children).replace(/^@/, '')
                        const hit = pathIndex.has(text)
                        return (
                          <code
                            onClick={hit ? () => goToFile(text) : undefined}
                            className={cn(
                              'font-mono text-[11.5px] bg-[color:var(--color-ink-1)] text-[color:var(--color-ink-8)] px-1 py-0.5 border border-[color:var(--color-ink-3)]',
                              hit && 'cursor-pointer hover:bg-[color:var(--color-ink-2)]',
                            )}
                          >
                            {children}
                          </code>
                        )
                      },
                      em: ({ children }) => <em className="italic text-[color:var(--color-ink-5)]">{children}</em>,
                      strong: ({ children }) => <strong className="font-semibold text-[color:var(--color-ink-8)]">{children}</strong>,
                    }}
                  >
                    {result.explanation}
                  </ReactMarkdown>
                </div>
              ) : null}

              {result.files.length > 0 ? (
                <Section title={`files · ${result.files.length}`}>
                  <div className="space-y-1">
                    {result.files.map((f) => {
                      const file = fileByPath.get(f.path)
                      return (
                        <button
                          key={f.path}
                          disabled={!file}
                          onClick={() => goToFile(f.path)}
                          className={cn(
                            'w-full text-left border transition-colors',
                            file
                              ? 'border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-0)] hover:border-[color:var(--color-ink-7)] hover:bg-[color:var(--color-ink-1)]'
                              : 'border-transparent text-[color:var(--color-ink-5)] cursor-not-allowed',
                          )}
                        >
                          <div className="flex items-start gap-2 px-2 py-1.5">
                            <RoleBadge role={f.role} />
                            {file ? (
                              <span
                                className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                                style={{ background: languageColor(file.language) }}
                              />
                            ) : null}
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-[11.5px] text-[color:var(--color-ink-8)] truncate">
                                <span className="text-[color:var(--color-ink-5)]">@</span>{f.path}
                              </div>
                              {f.note ? (
                                <div className="text-[11px] text-[color:var(--color-ink-6)] mt-0.5 leading-snug">{f.note}</div>
                              ) : null}
                            </div>
                            {file ? (
                              <span className="text-[10px] text-[color:var(--color-ink-5)] font-mono mt-1 flex-shrink-0">
                                {file.loc} loc
                              </span>
                            ) : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </Section>
              ) : null}

              {result.folders.length > 0 ? (
                <Section title={`folders · ${result.folders.length}`}>
                  <div className="space-y-1">
                    {result.folders.map((fl) => {
                      const known = folderIndex.has(fl.name)
                      return (
                        <div
                          key={fl.name}
                          className="w-full flex items-center gap-2 px-2 py-1 border border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-0)] text-left"
                        >
                          <FolderIcon
                            size={11}
                            strokeWidth={1.5}
                            className={cn('flex-shrink-0', known ? 'text-[color:var(--color-ink-7)]' : 'text-[color:var(--color-ink-5)]')}
                          />
                          <span className="font-mono text-[11.5px] text-[color:var(--color-ink-8)]">{fl.name}</span>
                          {fl.note ? (
                            <span className="text-[10px] text-[color:var(--color-ink-5)] ml-1 truncate">{fl.note}</span>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </Section>
              ) : null}

              {result.edges.length > 0 ? (
                <Section title={`connections · ${result.edges.length}`}>
                  <div className="space-y-0.5 font-mono text-[11px]">
                    {result.edges.map((edge, i) => (
                      <div key={i} className="flex items-center gap-1 text-[color:var(--color-ink-7)]">
                        <button
                          onClick={() => goToFile(edge.from)}
                          className="hover:text-[color:var(--color-ink-8)] hover:underline truncate"
                        >
                          @{edge.from}
                        </button>
                        <span className="text-[color:var(--color-ink-5)]">→</span>
                        <button
                          onClick={() => goToFile(edge.to)}
                          className="hover:text-[color:var(--color-ink-8)] hover:underline truncate"
                        >
                          @{edge.to}
                        </button>
                        {edge.reason ? (
                          <span className="text-[10px] text-[color:var(--color-ink-5)] ml-1">· {edge.reason}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}

              {result.agentPrompt ? (
                <Section title="for coding agents">
                  <pre className="bg-[color:var(--color-ink-1)] border border-[color:var(--color-ink-3)] px-3 py-2.5 text-[11.5px] font-mono text-[color:var(--color-ink-7)] whitespace-pre-wrap leading-[1.6] max-h-[260px] overflow-y-auto">
                    {result.agentPrompt}
                  </pre>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => copy(result.agentPrompt, 'prompt')}
                      className="flex items-center gap-1.5 px-2 py-1 border border-[color:var(--color-ink-3)] hover:border-[color:var(--color-ink-7)] hover:bg-[color:var(--color-ink-1)] text-[11px] transition-colors"
                    >
                      {copiedPrompt
                        ? <Check size={11} strokeWidth={1.75} />
                        : <Copy size={11} strokeWidth={1.75} className="text-[color:var(--color-ink-5)]" />}
                      <span className="font-mono">{copiedPrompt ? 'copied' : 'copy prompt'}</span>
                    </button>
                    <button
                      onClick={() => copy(result.files.map((f) => `@${f.path}`).join(' '), 'refs')}
                      className="flex items-center gap-1.5 px-2 py-1 border border-[color:var(--color-ink-3)] hover:border-[color:var(--color-ink-7)] hover:bg-[color:var(--color-ink-1)] text-[11px] transition-colors"
                    >
                      {copiedRefs
                        ? <Check size={11} strokeWidth={1.75} />
                        : <Copy size={11} strokeWidth={1.75} className="text-[color:var(--color-ink-5)]" />}
                      <span className="font-mono">{copiedRefs ? 'copied' : 'copy @refs'}</span>
                    </button>
                    {onAddPathsToContext && result.files.length > 0 ? (
                      <button
                        onClick={addAllToContext}
                        className="flex items-center gap-1.5 px-2 py-1 border border-[color:var(--color-ink-3)] hover:border-[color:var(--color-ink-7)] hover:bg-[color:var(--color-ink-1)] text-[11px] transition-colors"
                      >
                        <Plus size={11} strokeWidth={1.75} className="text-[color:var(--color-ink-5)]" />
                        <span className="font-mono">add files to context tray</span>
                      </button>
                    ) : null}
                    <div className="ml-auto">
                      <AgentMenu
                        input={{
                          text: result.agentPrompt,
                          repo,
                          refs: result.files.map((f) => f.path),
                          intent: 'Use the references above to ground your answer in this codebase.',
                        }}
                        send={send}
                        onResult={onToast}
                        label="Send to agent"
                      />
                    </div>
                  </div>
                </Section>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="px-3 py-1.5 border-t border-[color:var(--color-ink-3)] flex items-center justify-between text-[10px] text-[color:var(--color-ink-5)] font-mono">
          <span>↵ ask · esc · close · click @paths to inspect</span>
          <span>
            ⌘K · {mode}
            {result ? ` · ${result.ai ? 'ai' : 'mock'}` : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[color:var(--color-ink-3)] pt-3">
      <div className="text-[10px] tracking-[0.2em] text-[color:var(--color-ink-5)] uppercase mb-2 font-mono">
        {title}
      </div>
      {children}
    </div>
  )
}

function RoleBadge({ role }: { role: AskFile['role'] }) {
  return (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] tracking-[0.1em] uppercase font-mono border border-[color:var(--color-ink-3)] text-[color:var(--color-ink-6)] flex-shrink-0 mt-1">
      {ROLE_LABEL[role]}
    </span>
  )
}
