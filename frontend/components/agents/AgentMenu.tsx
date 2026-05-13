'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, Send } from 'lucide-react'
import {
  AGENT_TARGETS,
  type AgentKey,
  type DispatchOptions,
  type PromptInput,
  dispatchToAgent,
} from '@/lib/agents/dispatch'
import { cn } from '@/lib/utils'

export interface AgentMenuProps {
  input: PromptInput
  /** Live editor bridge — passed through to dispatchToAgent. */
  send?: DispatchOptions['send']
  /** Surface dispatch result feedback (toast text). */
  onResult?: (message: string) => void
  size?: 'sm' | 'md'
  label?: string
}

export function AgentMenu({ input, send, onResult, size = 'sm', label = 'Send to…' }: AgentMenuProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<AgentKey | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape.
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

  const dispatch = useCallback(
    async (key: AgentKey) => {
      setBusy(key)
      try {
        const result = await dispatchToAgent(key, input, { send: send ?? null })
        onResult?.(result.message)
      } catch (e) {
        onResult?.(e instanceof Error ? e.message : 'dispatch failed')
      } finally {
        setBusy(null)
        setOpen(false)
      }
    },
    [input, send, onResult],
  )

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 border border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-0)] text-[color:var(--color-ink-7)] hover:border-[color:var(--color-ink-7)] hover:bg-[color:var(--color-ink-1)] transition-colors',
          size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-[12px]',
          open && 'border-[color:var(--color-ink-7)]',
        )}
      >
        <Send size={11} strokeWidth={1.75} />
        <span className="font-mono">{label}</span>
        <ChevronDown size={11} strokeWidth={1.75} className="opacity-60" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-[240px] border border-[color:var(--color-ink-3)] bg-[color:var(--color-ink-0)] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        >
          {AGENT_TARGETS.map((t) => {
            const isBusy = busy === t.key
            return (
              <button
                key={t.key}
                type="button"
                role="menuitem"
                disabled={busy !== null}
                onClick={() => void dispatch(t.key)}
                className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-[11px] hover:bg-[color:var(--color-ink-1)] disabled:opacity-50"
              >
                <span className="font-mono text-[color:var(--color-ink-8)]">{t.label}</span>
                {t.hint ? (
                  <span className="font-mono text-[10px] text-[color:var(--color-ink-5)]">
                    {isBusy ? '…' : t.hint}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
