import type { QueryListener, QueryState, QueryStateConfig } from './types.js'

export const queryMap = new Map<string, QueryState>()

export function getQueryKeyString(key: readonly unknown[]): string {
  return JSON.stringify(key)
}

export function getOrCreateState<TData>(
  key: readonly unknown[],
  config: QueryStateConfig
): QueryState<TData> {
  const keyString = getQueryKeyString(key)
  const existingState = queryMap.get(keyString)

  if (existingState) {
    existingState.staleTime = config.staleTime
    existingState.cacheTime = config.cacheTime
    return existingState as QueryState<TData>
  }

  const state: QueryState<TData> = {
    status: 'idle',
    lastFetchedAt: 0,
    staleTime: config.staleTime,
    cacheTime: config.cacheTime,
    observers: 0,
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
