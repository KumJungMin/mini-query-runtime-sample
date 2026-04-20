import type {
  QueryDefinition,
  QueryListener,
  QueryState,
  QueryStateConfig
} from './types.js'

export const queryMap = new Map<string, QueryState>()

export function getQueryKeyString(key: readonly unknown[]): string {
  return JSON.stringify(key)
}

function createQueryFetcher<TQueryFnData, TData>(
  queryDefinition: QueryDefinition<TQueryFnData, TData>
): QueryStateConfig<TData>['fetcher'] {
  return async () => {
    const rawData = await queryDefinition.fetcher()

    if (queryDefinition.select) {
      return queryDefinition.select(rawData)
    }

    return rawData as TData
  }
}

export function getOrCreateState<TQueryFnData, TData>(
  queryDefinition: QueryDefinition<TQueryFnData, TData>,
  config: QueryStateConfig<TData>
): QueryState<TData> {
  const keyString = getQueryKeyString(queryDefinition.key)
  const existingState = queryMap.get(keyString)

  if (existingState) {
    existingState.staleTime = config.staleTime
    existingState.gcTime = config.gcTime
    existingState.fetcher = config.fetcher
    existingState.refetchOnMount = config.refetchOnMount
    existingState.refetchOnWindowFocus = config.refetchOnWindowFocus
    return existingState as QueryState<TData>
  }

  const state: QueryState<TData> = {
    key: queryDefinition.key,
    status: 'idle',
    lastFetchedAt: 0,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    observers: 0,
    fetcher: config.fetcher,
    refetchOnMount: config.refetchOnMount,
    refetchOnWindowFocus: config.refetchOnWindowFocus,
    listeners: new Set(),
    revision: 0
  }

  queryMap.set(keyString, state)
  return state
}

export function getExistingState<TData>(
  key: readonly unknown[]
): QueryState<TData> | undefined {
  return queryMap.get(getQueryKeyString(key)) as QueryState<TData> | undefined
}

export function notifyQueryListeners(state: QueryState): void {
  state.revision += 1

  for (const listener of state.listeners) {
    listener()
  }
}

export function subscribeToQuery(
  state: QueryState,
  listener: QueryListener
): () => void {
  state.listeners.add(listener)

  return () => {
    state.listeners.delete(listener)
  }
}

export function createQueryStateConfig<TQueryFnData, TData>(
  queryDefinition: QueryDefinition<TQueryFnData, TData>,
  config: Omit<QueryStateConfig<TData>, 'fetcher'>
): QueryStateConfig<TData> {
  return {
    ...config,
    fetcher: createQueryFetcher(queryDefinition)
  }
}
