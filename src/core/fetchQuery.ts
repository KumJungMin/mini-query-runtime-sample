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

  // Start the fetch and store the promise in the state to deduplicate
  const promise = fetcher()
    .then((data) => {
      state.data = data
      state.status = 'success'
      state.error = undefined
      state.lastFetchedAt = Date.now()
      state.promise = undefined
      return data
    })
    .catch((error: unknown) => {
      state.status = 'error'
      state.error = error
      state.promise = undefined
      throw error
    })

  state.promise = promise
  return promise
}
