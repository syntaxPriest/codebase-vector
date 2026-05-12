'use client'

import { useMemo, useEffect } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import type { GraphResponse } from '@/lib/api/types'
import { computeLayout } from './layout'
import { FileNode, type FileNodeData } from './FileNode'
import { FolderGroup, type FolderGroupData } from './FolderGroup'
import { RoughEdge, type RoughEdgeData } from './RoughEdge'

const nodeTypes = {
  file: FileNode,
  folder: FolderGroup,
}

const edgeTypes = {
  rough: RoughEdge,
}

export interface GraphViewProps {
  graph: GraphResponse
  focusedFileId: number | null
  selectedFileIds: Set<number>
  citations: Map<number, number> // fileId -> citation index
  onFocus: (fileId: number | null) => void
  onSelect: (fileId: number, additive: boolean) => void
}

export function GraphView(props: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  )
}

function GraphCanvas({
  graph,
  focusedFileId,
  selectedFileIds,
  citations,
  onFocus,
  onSelect,
}: GraphViewProps) {
  const { nodes, edges } = useMemo(
    () => buildFlow(graph, focusedFileId, selectedFileIds, citations),
    [graph, focusedFileId, selectedFileIds, citations],
  )

  const rf = useReactFlow()
  // Re-fit when the graph changes (e.g., after a new index completes).
  useEffect(() => {
    const id = window.requestAnimationFrame(() => rf.fitView({ padding: 0.18, duration: 400 }))
    return () => window.cancelAnimationFrame(id)
  }, [graph.repo.repo_id, rf])

  // Center on the focused node when it changes.
  useEffect(() => {
    if (focusedFileId === null) return
    const node = rf.getNode(`file-${focusedFileId}`)
    if (!node) return
    rf.setCenter(
      (node.position.x + (node.measured?.width ?? 200) / 2) +
        (node.parentId ? (rf.getNode(node.parentId)?.position.x ?? 0) : 0),
      (node.position.y + (node.measured?.height ?? 60) / 2) +
        (node.parentId ? (rf.getNode(node.parentId)?.position.y ?? 0) : 0),
      { zoom: Math.max(rf.getZoom(), 0.9), duration: 350 },
    )
  }, [focusedFileId, rf])

  const onNodeClick: NodeMouseHandler = (event, node) => {
    if (node.type !== 'file') return
    const fileId = Number((node.data as FileNodeData).file.id)
    const additive = event.metaKey || event.ctrlKey
    if (additive) onSelect(fileId, true)
    else onFocus(fileId)
  }

  const onPaneClick = () => onFocus(null)

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      minZoom={0.25}
      maxZoom={1.6}
      fitView
      fitViewOptions={{ padding: 0.18 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
      panOnScroll
      selectionOnDrag={false}
    >
      <Background gap={16} size={1} color="color-mix(in srgb, var(--color-muted) 14%, transparent)" />
      <Controls position="bottom-left" showInteractive={false} />
    </ReactFlow>
  )
}

function buildFlow(
  graph: GraphResponse,
  focusedFileId: number | null,
  selectedFileIds: Set<number>,
  citations: Map<number, number>,
): { nodes: Node[]; edges: Edge[] } {
  const layout = computeLayout(graph.files, graph.edges)
  const historyByFile = new Map(graph.history.map((h) => [h.file_id, h]))
  const fileById = new Map(graph.files.map((f) => [f.id, f]))

  const nodes: Node[] = []

  for (const folder of layout.folders) {
    nodes.push({
      id: `folder-${folder.folder}`,
      type: 'folder',
      position: { x: folder.x, y: folder.y },
      width: folder.width,
      height: folder.height,
      data: {
        folder: folder.folder,
        fileCount: folder.fileCount,
      } satisfies FolderGroupData,
      draggable: false,
      selectable: false,
      style: { width: folder.width, height: folder.height },
    })
  }

  for (const fp of layout.files) {
    const file = fileById.get(fp.fileId)
    if (!file) continue
    nodes.push({
      id: `file-${fp.fileId}`,
      type: 'file',
      parentId: `folder-${fp.parentFolder}`,
      extent: 'parent',
      position: { x: fp.x, y: fp.y },
      width: fp.width,
      height: fp.height,
      data: {
        file,
        history: historyByFile.get(fp.fileId),
        isFocused: focusedFileId === fp.fileId,
        isSelected: selectedFileIds.has(fp.fileId),
        citationIndex: citations.get(fp.fileId) ?? null,
      } satisfies FileNodeData,
      draggable: false,
      selectable: false,
      style: { width: fp.width, height: fp.height },
    })
  }

  const edges: Edge[] = graph.edges
    .filter((e) => e.edge_kind === 'import' && e.source_kind === 'file' && e.target_kind === 'file')
    .map((e) => {
      const sourceFocused = e.source_id === focusedFileId || selectedFileIds.has(e.source_id)
      const targetFocused = e.target_id === focusedFileId || selectedFileIds.has(e.target_id)
      const highlighted = sourceFocused || targetFocused
      const dimmed = focusedFileId !== null && !highlighted
      return {
        id: `edge-${e.id}`,
        source: `file-${e.source_id}`,
        target: `file-${e.target_id}`,
        type: 'rough',
        data: { highlighted, dimmed, weight: e.weight } satisfies RoughEdgeData,
        markerEnd: { type: MarkerType.ArrowClosed, color: highlighted ? 'var(--color-ink-8)' : 'var(--color-ink-5)' },
      } satisfies Edge
    })

  return { nodes, edges }
}
