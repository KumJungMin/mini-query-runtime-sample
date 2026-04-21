import type { QueryState } from './types.js'

export function isQueryStale(state: QueryState): boolean {
  if (hasFetchedQuery(state)) {
    // 데이터가 마지막으로 가져온 시점에서 staleTime이 지났는지 확인
    return Date.now() - state.lastFetchedAt > state.staleTime
  } else {
    return true
  }
}

export function hasFetchedQuery(state: QueryState): boolean {
  return state.lastFetchedAt > 0
}