'use client'

import ReactMarkdown from 'react-markdown'
import type { Citation } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { CitationChip } from './CitationChip'

export interface MessageData {
  id: string
  role: 'user' | 'assistant'
  text: string
  citations: Array<{ index: number; citation: Citation }>
  done: boolean
}

export interface MessageProps {
  message: MessageData
  focusedFileId: number | null
  pathToFileId: Map<string, number>
  onCitationClick: (fileId: number, index: number) => void
}

export function Message({ message, focusedFileId, pathToFileId, onCitationClick }: MessageProps) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex flex-col gap-1.5 px-4 py-3', isUser ? 'bg-[color:var(--color-bg)]' : 'bg-transparent')}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
        {isUser ? 'You' : 'Narrator'}
      </div>
      <div
        className={cn(
          'prose prose-sm max-w-none text-[13px] leading-relaxed text-[color:var(--color-fg)]',
          '[&_p]:my-1.5 [&_ol]:my-1.5 [&_ul]:my-1.5 [&_li]:my-0.5 [&_strong]:font-semibold [&_code]:font-mono [&_code]:text-[12px] [&_code]:rounded [&_code]:bg-[color:var(--color-bg)] [&_code]:px-1 [&_code]:py-0.5',
        )}
      >
        {message.text.length > 0 ? (
          <ReactMarkdown>{message.text}</ReactMarkdown>
        ) : !message.done ? (
          <span className="text-[color:var(--color-muted)]">…</span>
        ) : null}
      </div>
      {message.citations.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {message.citations.map(({ index, citation }) => {
            const fileId = pathToFileId.get(citation.file_path)
            const isFocused = fileId !== undefined && fileId === focusedFileId
            return (
              <CitationChip
                key={`${message.id}-cite-${index}`}
                index={index}
                citation={citation}
                isFocused={isFocused}
                onClick={() => {
                  if (fileId !== undefined) onCitationClick(fileId, index)
                }}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
