import type { QueryListener, QueryState, QueryStateConfig } from './types.js'

export const queryMap = new Map<string, QueryState>()

export function getQueryKeyString(key: readonly unknown[]): string {
  return JSON.stringify(key)
}

/** 
 * getOrCreateState function
 * - If the state for the given key already exists in the queryMap, it returns that state.
 * - If it doesn't exist, it creates a new state with the provided configuration, stores it in the queryMap, and returns it.
 * */ 
export function getOrCreateState<TData>(
  key: readonly unknown[],
  config: QueryStateConfig
): QueryState<TData> {
  const keyStr = getQueryKeyString(key)
  const existingState = queryMap.get(keyStr)

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

  queryMap.set(keyStr, state)
  return state
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
