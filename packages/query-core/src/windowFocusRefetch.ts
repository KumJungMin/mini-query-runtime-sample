import { fetchQuery } from './fetchQuery.js'
import { isQueryStale } from './queryFreshness.js'
import { queryMap } from './queryStore.js'

let focusListenerCount = 0

function handleWindowFocus(): void {
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

    void fetchQuery(state).catch(() => undefined)
  }
}

export function acquireWindowFocusRefetch(): void {
  if (typeof window === 'undefined') {
    return
  }

  focusListenerCount += 1

  if (focusListenerCount === 1) {
    window.addEventListener('focus', handleWindowFocus)
  }
}

export function releaseWindowFocusRefetch(): void {
  if (typeof window === 'undefined' || focusListenerCount === 0) {
    return
  }

  focusListenerCount -= 1

  if (focusListenerCount === 0) {
    window.removeEventListener('focus', handleWindowFocus)
  }
}
