import { notifyQueryListeners } from './queryStore.js'
import type { QueryState } from './types.js'

export async function fetchQuery<TData>(
  state: QueryState<TData>,
  fetcher: () => Promise<TData>
): Promise<TData> {
  if (state.promise) {
    return state.promise
  }

  state.status = 'loading'
  state.error = undefined

  const promise = Promise.resolve()
    .then(fetcher)
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
