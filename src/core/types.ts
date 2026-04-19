export type QueryStatus = 'idle' | 'loading' | 'success' | 'error'

export type QueryPolicy = 'static' | 'normal' | 'background' | 'critical'

export type QueryListener = () => void

export type QueryState<TData = unknown> = {
  data?: TData
  status: QueryStatus
  error?: unknown
  lastFetchedAt: number
  staleTime: number
  observers: number
  promise?: Promise<TData>
  cacheTime: number
  gcTimeoutId?: ReturnType<typeof setTimeout>
  listeners: Set<QueryListener>
  revision: number
}

export type QueryDefinition<TData> = {
  key: readonly unknown[]
  fetcher: () => Promise<TData>
  policy: QueryPolicy
}

export type QueryPolicyConfig = {
  staleTime: number
  cacheTime: number
  autoRefetch: boolean
}

export type QueryStateConfig = Pick<QueryState, 'staleTime' | 'cacheTime'>
