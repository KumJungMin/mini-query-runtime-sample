import { fetchQuery } from './fetchQuery.js'
import { isQueryStale } from './queryFreshness.js'
import { queryMap } from './queryStore.js'

let visibilityListenerCount = 0

export function acquireWindowFocusRefetch(): void {
  if (typeof document !== 'undefined') {
    visibilityListenerCount += 1
    if (visibilityListenerCount === 1) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
  }
}

export function releaseWindowFocusRefetch(): void {
  if (typeof document !== 'undefined' && visibilityListenerCount > 0) {
    visibilityListenerCount -= 1
    if (visibilityListenerCount === 0) {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }
}


function handleVisibilityChange(): void {
  if (document.visibilityState !== 'visible') {
    return
  }

  for (const state of queryMap.values()) {
    if (state.observers === 0) {
      continue
    }
    if (!state.refetchOnWindowFocus) {
      continue
    }
    if (!isQueryStale(state)) {
      continue
    }
    fetchQuery(state)
  }
}