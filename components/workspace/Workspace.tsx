'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  GraphResponse,
  IndexJob,
  Language,
  RepoSummary,
} from '@/lib/api/types'
import { getGraph, startIndex } from '@/lib/api/client'
import { topLevelFolder, isRecentlyChanged } from '@/components/graph/encoding'
import { useSessionBridge } from '@/hooks/useSessionBridge'
import { isOpenFile, isSelection, PROTOCOL_VERSION } from '@/lib/session/protocol'

import { TopBar } from './TopBar'
import { EmptyState } from './EmptyState'
import { IndexingDialog } from './IndexingDialog'
import { GraphView } from '@/components/graph/GraphView'
import { SidePanel } from '@/components/sidepanel/SidePanel'
import { ChatPanel, type AskPrompt } from '@/components/narrator/ChatPanel'
import { AskPanel } from '@/components/ask/AskPanel'

type Stage =
  | { kind: 'empty' }
  | { kind: 'indexing'; job: IndexJob | null }
  | { kind: 'ready'; repo: RepoSummary; graph: GraphResponse }

interface Toast {
  id: number
  text: string
}

export function Workspace() {
  const [stage, setStage] = useState<Stage>({ kind: 'empty' })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [focusedFileId, setFocusedFileId] = useState<number | null>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set())

  const [languageFilter, setLanguageFilter] = useState<Set<Language>>(new Set())
  const [folderFilter, setFolderFilter] = useState<Set<string>>(new Set())
  const [recentlyChanged, setRecentlyChanged] = useState(false)

  const [citations, setCitations] = useState<Map<number, number>>(new Map())
  const [askPrompt, setAskPrompt] = useState<AskPrompt | null>(null)

  const [askOpen, setAskOpen] = useState(false)
  const [askPrefill, setAskPrefill] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  const bridge = useSessionBridge()

  const showToast = useCallback((text: string) => {
    setToast({ id: Date.now(), text })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const startIndexing = useCallback(async (rootPath: string) => {
    setStage({ kind: 'indexing', job: null })
    let finalJob: IndexJob | null = null
    for await (const job of startIndex(rootPath)) {
      finalJob = job
      setStage({ kind: 'indexing', job })
      if (job.status === 'complete') break
      if (job.status === 'failed') {
        setStage({ kind: 'empty' })
        return
      }
    }
    if (!finalJob || finalJob.status !== 'complete') return
    const graph = await getGraph(finalJob.repo_id, { kind: 'all', depth: 2 })
    setStage({ kind: 'ready', repo: graph.repo, graph })
    setDialogOpen(false)
    setFocusedFileId(null)
    setSelectedFileIds(new Set())
    setLanguageFilter(new Set())
    setFolderFilter(new Set())
    setRecentlyChanged(false)
    setCitations(new Map())
    setAskPrompt(null)
    setAskOpen(false)
  }, [])

  const onFocus = useCallback((fileId: number | null) => {
    setFocusedFileId(fileId)
  }, [])

  const onSelect = useCallback((fileId: number, additive: boolean) => {
    setSelectedFileIds((prev) => {
      const next = new Set(additive ? prev : [])
      if (next.has(fileId)) next.delete(fileId)
      else next.add(fileId)
      return next
    })
  }, [])

  const toggleLanguage = useCallback((lang: Language) => {
    setLanguageFilter((prev) => {
      const next = new Set(prev)
      if (next.has(lang)) next.delete(lang)
      else next.add(lang)
      return next
    })
  }, [])

  const toggleFolder = useCallback((folder: string) => {
    setFolderFilter((prev) => {
      const next = new Set(prev)
      if (next.has(folder)) next.delete(folder)
      else next.add(folder)
      return next
    })
  }, [])

  const onResetFilters = useCallback(() => {
    setLanguageFilter(new Set())
    setFolderFilter(new Set())
    setRecentlyChanged(false)
  }, [])

  // Esc clears focus + selection. ⌘K / Ctrl+K toggles the Ask palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (stage.kind !== 'ready') return
        e.preventDefault()
        setAskOpen((v) => !v)
        return
      }
      if (e.key === 'Escape') {
        if (askOpen) return // AskPanel handles its own Escape
        setFocusedFileId(null)
        setSelectedFileIds(new Set())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [askOpen, stage.kind])

  const repo = stage.kind === 'ready' ? stage.repo : null
  const fullGraph = stage.kind === 'ready' ? stage.graph : null

  const availableLanguages = useMemo<Language[]>(() => {
    if (!fullGraph) return []
    return fullGraph.repo.languages.map((l) => l.language)
  }, [fullGraph])

  const availableFolders = useMemo<string[]>(() => {
    if (!fullGraph) return []
    return [...new Set(fullGraph.files.map((f) => topLevelFolder(f.path)))].sort()
  }, [fullGraph])

  const filteredGraph = useMemo<GraphResponse | null>(() => {
    if (!fullGraph) return null
    if (languageFilter.size === 0 && folderFilter.size === 0 && !recentlyChanged) {
      return fullGraph
    }
    const historyByFile = new Map(fullGraph.history.map((h) => [h.file_id, h]))
    const keep = (f: typeof fullGraph.files[number]) => {
      if (languageFilter.size > 0 && !languageFilter.has(f.language)) return false
      if (folderFilter.size > 0 && !folderFilter.has(topLevelFolder(f.path))) return false
      if (recentlyChanged && !isRecentlyChanged(f, historyByFile.get(f.id))) return false
      return true
    }
    const files = fullGraph.files.filter(keep)
    const fileIds = new Set(files.map((f) => f.id))
    return {
      ...fullGraph,
      files,
      symbols: fullGraph.symbols.filter((s) => fileIds.has(s.file_id)),
      edges: fullGraph.edges.filter((e) => fileIds.has(e.source_id) && fileIds.has(e.target_id)),
      history: fullGraph.history.filter((h) => fileIds.has(h.file_id)),
    }
  }, [fullGraph, languageFilter, folderFilter, recentlyChanged])

  const pathToFileId = useMemo<Map<string, number>>(() => {
    if (!fullGraph) return new Map()
    return new Map(fullGraph.files.map((f) => [f.path, f.id]))
  }, [fullGraph])

  const focusedPath = useMemo<string | null>(() => {
    if (!fullGraph || focusedFileId === null) return null
    return fullGraph.files.find((f) => f.id === focusedFileId)?.path ?? null
  }, [fullGraph, focusedFileId])

  const selectedPaths = useMemo<string[]>(() => {
    if (!fullGraph) return []
    const ids = selectedFileIds
    return fullGraph.files.filter((f) => ids.has(f.id)).map((f) => f.path)
  }, [fullGraph, selectedFileIds])

  const onOpen = useCallback(() => setDialogOpen(true), [])

  const onAskNarrator = useCallback((path: string) => {
    setAskPrompt({ id: `ask-${Date.now()}`, text: `Explain ${path}.` })
  }, [])

  const onCitationsChange = useCallback((next: Map<number, number>) => {
    setCitations(next)
  }, [])

  const onCitationFocus = useCallback((fileId: number) => {
    setFocusedFileId(fileId)
  }, [])

  const onAskSelectPath = useCallback(
    (path: string) => {
      const id = pathToFileId.get(path)
      if (id === undefined) return
      setFocusedFileId(id)
    },
    [pathToFileId],
  )

  const onAskAddPaths = useCallback(
    (paths: string[]) => {
      setSelectedFileIds((prev) => {
        const next = new Set(prev)
        for (const p of paths) {
          const id = pathToFileId.get(p)
          if (id !== undefined) next.add(id)
        }
        return next
      })
    },
    [pathToFileId],
  )

  // Inbound editor → workspace events: focus the graph on whatever file
  // the user is looking at in VS Code, and feed selections to the Ask palette.
  useEffect(() => {
    if (!fullGraph) return
    const unsubscribe = bridge.subscribe((msg) => {
      if (isOpenFile(msg)) {
        const id = pathToFileId.get(msg.path)
        if (id !== undefined) setFocusedFileId(id)
      } else if (isSelection(msg)) {
        const id = pathToFileId.get(msg.path)
        if (id !== undefined) setFocusedFileId(id)
        const text = msg.text.trim()
        if (text.length === 0) return
        setAskPrefill(text.length > 200 ? `Explain this: ${text.slice(0, 200)}…` : `Explain this: ${text}`)
        setAskOpen(true)
      }
    })
    return unsubscribe
  }, [bridge, fullGraph, pathToFileId])

  // When the workspace finishes indexing, push repo info to the editor side
  // so the extension can resolve @-refs locally.
  useEffect(() => {
    if (!repo) return
    if (!bridge.paired) return
    bridge.send({
      v: PROTOCOL_VERSION,
      type: 'repo',
      repoId: repo.repo_id,
      name: repo.name,
      rootPath: repo.root_path,
    })
  }, [repo, bridge.paired, bridge])

  const bridgeStatus: 'idle' | 'paired' = bridge.paired ? 'paired' : 'idle'

  return (
    <div className="flex h-screen flex-col">
      <TopBar
        repo={repo}
        languageFilter={languageFilter}
        folderFilter={folderFilter}
        recentlyChanged={recentlyChanged}
        availableLanguages={availableLanguages}
        availableFolders={availableFolders}
        onToggleLanguage={toggleLanguage}
        onToggleFolder={toggleFolder}
        onToggleRecentlyChanged={() => setRecentlyChanged((r) => !r)}
        onResetFilters={onResetFilters}
        onOpenRepo={onOpen}
        onOpenAsk={() => setAskOpen(true)}
        bridgeStatus={bridgeStatus}
      />

      <div className="flex min-h-0 flex-1">
        {repo ? (
          <ChatPanel
            repo={repo}
            focusedFileId={focusedFileId}
            focusedPath={focusedPath}
            selectedPaths={selectedPaths}
            pathToFileId={pathToFileId}
            askPrompt={askPrompt}
            onCitationsChange={onCitationsChange}
            onCitationFocus={onCitationFocus}
          />
        ) : null}

        <main className="relative min-w-0 flex-1">
          {filteredGraph ? (
            <GraphView
              graph={filteredGraph}
              focusedFileId={focusedFileId}
              selectedFileIds={selectedFileIds}
              citations={citations}
              onFocus={onFocus}
              onSelect={onSelect}
            />
          ) : (
            <EmptyState onOpen={onOpen} />
          )}
        </main>

        {fullGraph && repo ? (
          <SidePanel
            repo={repo}
            graph={fullGraph}
            focusedFileId={focusedFileId}
            onClose={() => setFocusedFileId(null)}
            onAskNarrator={onAskNarrator}
            send={bridge.paired ? bridge.send : null}
            onToast={showToast}
          />
        ) : null}
      </div>

      {fullGraph && repo ? (
        <AskPanel
          repo={repo}
          graph={fullGraph}
          open={askOpen}
          onClose={() => {
            setAskOpen(false)
            setAskPrefill(null)
          }}
          prefill={askPrefill}
          onPrefillConsumed={() => setAskPrefill(null)}
          onSelectPath={onAskSelectPath}
          onAddPathsToContext={onAskAddPaths}
          send={bridge.paired ? bridge.send : null}
          onToast={showToast}
        />
      ) : null}

      <IndexingDialog
        open={dialogOpen}
        job={stage.kind === 'indexing' ? stage.job : null}
        busy={stage.kind === 'indexing'}
        onStart={startIndexing}
        onCancel={() => {
          if (stage.kind !== 'indexing') setDialogOpen(false)
        }}
      />

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 border border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-8)] px-3 py-2 text-[11px] font-mono text-[color:var(--color-ink-0)] shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
          {toast.text}
        </div>
      ) : null}
    </div>
  )
}
