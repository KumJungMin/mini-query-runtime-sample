import type { QueryState } from './types.js'

export function hasFetchedQuery(state: QueryState): boolean {
  return state.lastFetchedAt > 0
}

export function isQueryStale(state: QueryState): boolean {
  if (!hasFetchedQuery(state)) {
    return true
  }

  return Date.now() - state.lastFetchedAt > state.staleTime
}
