import { notifyQueryListeners } from './queryStore.js'
import type { QueryState } from './types.js'


/** 
 * fetchQuery 함수
 * - QueryState 객체를 받아서 데이터를 가져오는 함수입니다.
 * - 이미 fetch 중인 경우에는 기존의 Promise를 반환합니다.
 * - 상태가 변경될 때마다 query listeners에게 알립니다.
 * */ 
export async function fetchQuery<TData>(state: QueryState<TData>): Promise<TData> {
  if (state.promise) {
    return state.promise
  }

  state.status = 'loading'
  state.error = undefined

  const promise = Promise.resolve()
    .then(state.fetcher)
    .then((data) => {
      state.data = data
      state.status = 'success'
      state.error = undefined
      state.lastFetchedAt = Date.now()
      state.promise = undefined
      notifyQueryListeners(state)
      return data
    })
    .catch((error: unknown) => {
      state.status = 'error'
      state.error = error
      state.promise = undefined
      notifyQueryListeners(state)
      throw error
    })
  state.promise = promise
  notifyQueryListeners(state)
  return promise
}
