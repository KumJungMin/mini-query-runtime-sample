import type { QueryDefinition, QueryState } from '@query/core'

export type DemoData = {
  requestId: number
  value: number
  fetchedAt: string
}

export type LogEntry = {
  id: number
  message: string
}

export type QueryDebugSnapshot<TData> = {
  keyString: string
  state?: QueryState<TData>
  isPresent: boolean
  status: string
  observers: number
  lastFetchedAtLabel: string
  freshnessLabel: 'unfetched' | 'fresh' | 'stale'
  hasPromise: boolean
  gcRemainingMs: number | null
  data?: TData
  cacheAlive: boolean
}

export type QueryDebugController<TData> = {
  debug: QueryDebugSnapshot<TData>
  logs: LogEntry[]
  addLog: (message: string) => void
  clearLogs: () => void
}

export type DemoQuery<TData> = QueryDefinition<TData>
