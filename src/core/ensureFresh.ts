import { fetchQuery } from './fetchQuery.js'
import { revive } from './gc.js'
import type { QueryDefinition, QueryState } from './types.js'

function isStale(state: QueryState): boolean {
  if (state.lastFetchedAt === 0) {
    return true
  }

  return Date.now() - state.lastFetchedAt > state.staleTime
}

export async function ensureFresh<TData>(
  queryDefinition: QueryDefinition<TData>,
  state: QueryState<TData>
): Promise<TData | undefined> {
  // CASE1: If the data is already in memory, revive it to prevent GC from collecting it
  revive(state, queryDefinition.key)

  // CASE2: If there's an ongoing fetch, return the promise to deduplicate
  if (state.promise) {
    return state.promise
  }

  // CASE3: If the data is stale or not fetched yet, fetch it
  if (isStale(state)) {
    return fetchQuery(state, queryDefinition.fetcher)
  } else {
    return state.data
  }
}
