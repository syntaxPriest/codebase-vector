// Single typed API client. The FastAPI backend doesn't exist yet, so every
// call dispatches to the mock layer. When the real backend lands, the only
// change here is flipping `USE_MOCK` to false and wiring fetch().

import type {
  AskRequest,
  AskResult,
  ExplainEvent,
  ExplainRequest,
  GraphResponse,
  GraphScope,
  IndexJob,
  RepoSummary,
  SearchResponse,
} from './types'
import {
  mockAsk,
  mockExplain,
  mockGetGraph,
  mockListRepos,
  mockSearch,
  mockStartIndex,
} from './mock'

const USE_MOCK = true

export async function listRepos(): Promise<RepoSummary[]> {
  if (USE_MOCK) return mockListRepos()
  throw new Error('Real /repos not yet wired')
}

export async function getGraph(repoId: string, scope: GraphScope): Promise<GraphResponse> {
  if (USE_MOCK) return mockGetGraph(repoId, scope)
  throw new Error('Real /graph not yet wired')
}

export function startIndex(rootPath: string): AsyncGenerator<IndexJob> {
  if (USE_MOCK) return mockStartIndex(rootPath)
  throw new Error('Real /index not yet wired')
}

export async function search(repoId: string, query: string, k = 10): Promise<SearchResponse> {
  if (USE_MOCK) return mockSearch(repoId, query, k)
  throw new Error('Real /search not yet wired')
}

export function streamExplain(req: ExplainRequest): AsyncGenerator<ExplainEvent> {
  if (USE_MOCK) return mockExplain(req)
  throw new Error('Real /explain not yet wired')
}

export async function ask(req: AskRequest): Promise<AskResult> {
  if (USE_MOCK) return mockAsk(req)
  throw new Error('Real /ask not yet wired')
}
