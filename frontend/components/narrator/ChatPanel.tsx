'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { streamExplain } from '@/lib/api/client'
import type { Citation, RepoSummary } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { Message, type MessageData } from './Message'

export interface AskPrompt {
  id: string
  text: string
}

export interface ChatPanelProps {
  repo: RepoSummary
  focusedFileId: number | null
  focusedPath: string | null
  selectedPaths: string[]
  pathToFileId: Map<string, number>
  askPrompt: AskPrompt | null
  onCitationsChange: (citations: Map<number, number>) => void
  onCitationFocus: (fileId: number) => void
}

const SEED_QUESTIONS = [
  'Explain this repo.',
  'Walk me through how a request flows.',
  'Where should I touch to add a new language?',
  'What are the load-bearing pieces?',
]

export function ChatPanel({
  repo,
  focusedFileId,
  focusedPath,
  selectedPaths,
  pathToFileId,
  askPrompt,
  onCitationsChange,
  onCitationFocus,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<MessageData[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const lastAskIdRef = useRef<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (trimmed.length === 0 || streaming) return
      const userId = `m-u-${Date.now()}`
      const asstId = `m-a-${Date.now() + 1}`
      const userMsg: MessageData = {
        id: userId,
        role: 'user',
        text: trimmed,
        citations: [],
        done: true,
      }
      const asstMsg: MessageData = {
        id: asstId,
        role: 'assistant',
        text: '',
        citations: [],
        done: false,
      }
      setMessages((prev) => [...prev, userMsg, asstMsg])
      setStreaming(true)
      // Clear any prior citation highlights when a new turn starts.
      onCitationsChange(new Map())

      const fileIdMap = new Map<number, number>()

      try {
        for await (const evt of streamExplain({
          repo_id: repo.repo_id,
          message: trimmed,
          focused_path: focusedPath,
          selected_paths: selectedPaths,
        })) {
          if (evt.type === 'token') {
            setMessages((prev) =>
              prev.map((m) => (m.id === asstId ? { ...m, text: m.text + evt.delta } : m)),
            )
          } else if (evt.type === 'citation') {
            const fileId = pathToFileId.get(evt.citation.file_path)
            if (fileId !== undefined && !fileIdMap.has(fileId)) {
              fileIdMap.set(fileId, evt.index)
              onCitationsChange(new Map(fileIdMap))
            }
            const cite: { index: number; citation: Citation } = {
              index: evt.index,
              citation: evt.citation,
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === asstId ? { ...m, citations: [...m.citations, cite] } : m,
              ),
            )
          } else if (evt.type === 'done') {
            setMessages((prev) =>
              prev.map((m) => (m.id === asstId ? { ...m, done: true } : m)),
            )
          } else if (evt.type === 'error') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === asstId
                  ? { ...m, text: `${m.text}\n\n*[narrator error: ${evt.error}]*`, done: true }
                  : m,
              ),
            )
          }
        }
      } finally {
        setStreaming(false)
      }
    },
    [
      repo.repo_id,
      focusedPath,
      selectedPaths,
      pathToFileId,
      onCitationsChange,
      streaming,
    ],
  )

  // External prompt (e.g. "Ask narrator about this" from the side panel).
  useEffect(() => {
    if (!askPrompt) return
    if (lastAskIdRef.current === askPrompt.id) return
    lastAskIdRef.current = askPrompt.id
    void send(askPrompt.text)
  }, [askPrompt, send])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (streaming) return
    const text = input
    setInput('')
    void send(text)
    inputRef.current?.focus()
  }

  const contextLabel = useMemo(() => {
    if (selectedPaths.length > 1) return `${selectedPaths.length} files selected`
    if (focusedPath) return focusedPath
    return null
  }, [focusedPath, selectedPaths])

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)]">
      <header className="flex items-center justify-between border-b border-[color:var(--color-ink-3)] px-4 py-3">
        <div>
          <div className="text-[10px] tracking-[0.2em] text-[color:var(--color-ink-5)] uppercase font-mono">
            narrator
          </div>
          <h2 className="mt-1 text-[13px] font-semibold tracking-tight text-[color:var(--color-ink-8)]">
            Grounded in <span className="font-mono font-normal">{repo.name}</span>
          </h2>
        </div>
        <Sparkles size={14} strokeWidth={1.75} className="text-[color:var(--color-ink-5)]" />
      </header>

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="px-4 py-4">
            <p className="text-[12px] text-[color:var(--color-muted)]">
              Ask anything. Suggested openers:
            </p>
            <div className="mt-2 flex flex-col gap-1">
              {SEED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void send(q)}
                  disabled={streaming}
                  className="border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-2.5 py-1.5 text-left text-[12px] text-[color:var(--color-fg)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[color:var(--color-border)]">
            {messages.map((m) => (
              <Message
                key={m.id}
                message={m}
                focusedFileId={focusedFileId}
                pathToFileId={pathToFileId}
                onCitationClick={(fileId) => onCitationFocus(fileId)}
              />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="border-t border-[color:var(--color-border)] p-3">
        {contextLabel ? (
          <div className="mb-2 truncate font-mono text-[10px] text-[color:var(--color-muted)]" title={contextLabel}>
            scope: {contextLabel}
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit(e)
              }
            }}
            placeholder="Ask the narrator…"
            rows={2}
            disabled={streaming}
            className={cn(
              'min-h-[40px] flex-1 resize-none border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-2.5 py-1.5 font-mono text-[12px] outline-none',
              'focus:border-[color:var(--color-accent)]',
              streaming && 'opacity-60',
            )}
          />
          <button
            type="submit"
            disabled={streaming || input.trim().length === 0}
            aria-label="Send"
            className="grid size-8 place-items-center bg-[color:var(--color-accent)] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </aside>
  )
}
