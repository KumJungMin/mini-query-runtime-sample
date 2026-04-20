export type QueryStatus = 'idle' | 'loading' | 'success' | 'error'

export type QueryPolicy = 'static' | 'normal' | 'background' | 'critical'

export type QueryListener = () => void

export type QueryExecutor<TData> = () => Promise<TData>

export type QueryState<TData = unknown> = {
  key: readonly unknown[]
  data?: TData
  status: QueryStatus
  error?: unknown
  lastFetchedAt: number
  staleTime: number
  observers: number
  promise?: Promise<TData>
  gcTime: number
  fetcher: QueryExecutor<TData>
  refetchOnMount: boolean
  refetchOnWindowFocus: boolean
  gcTimeoutId?: ReturnType<typeof setTimeout>
  gcScheduledAt?: number
  gcExpiresAt?: number
  listeners: Set<QueryListener>
  revision: number
}

export type QueryDefinition<TQueryFnData, TData = TQueryFnData> = {
  key: readonly unknown[]
  fetcher: () => Promise<TQueryFnData>
  select?: (data: TQueryFnData) => TData
  policy: QueryPolicy
  config?: Partial<QueryPolicyConfig>
}

export type QueryPolicyConfig = {
  staleTime: number
  gcTime: number
  refetchOnMount: boolean
  refetchOnWindowFocus: boolean
}

export type QueryStateConfig<TData> = Pick<
  QueryState<TData>,
  'staleTime' | 'gcTime' | 'fetcher' | 'refetchOnMount' | 'refetchOnWindowFocus'
>
