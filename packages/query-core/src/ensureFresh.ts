import { fetchQuery } from './fetchQuery.js'
import { revive } from './gc.js'
import type { QueryDefinition, QueryState } from './types.js'

export function isQueryStale(state: QueryState): boolean {
  if (state.lastFetchedAt === 0) {
    return true
  }

  return Date.now() - state.lastFetchedAt > state.staleTime
}

export async function ensureFresh<TData>(
  queryDefinition: QueryDefinition<TData>,
  state: QueryState<TData>
): Promise<TData | undefined> {
  revive(state, queryDefinition.key)

  if (state.promise) {
    return state.promise
  }

  if (!isQueryStale(state)) {
    return state.data
  }

  return fetchQuery(state, queryDefinition.fetcher)
}
