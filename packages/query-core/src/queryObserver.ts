import { fetchQuery } from './fetchQuery.js'
import { hasFetchedQuery, isQueryStale } from './queryFreshness.js'
import { cancelScheduledGC, scheduleGC } from './gc.js'
import type { QueryState } from './types.js'
import {
  acquireWindowFocusRefetch,
  releaseWindowFocusRefetch
} from './windowFocusRefetch.js'

export function mountQueryObserver<TData>(state: QueryState<TData>): void {
  state.observers += 1
  cancelScheduledGC(state)
  acquireWindowFocusRefetch()

  if (!hasFetchedQuery(state)) {
    void fetchQuery(state).catch(() => undefined)
    return
  }

  if (!state.refetchOnMount || !isQueryStale(state)) {
    return
  }

  void fetchQuery(state).catch(() => undefined)
}

export function unmountQueryObserver(state: QueryState): void {
  state.observers = Math.max(0, state.observers - 1)
  releaseWindowFocusRefetch()

  if (state.observers === 0) {
    scheduleGC(state)
  }
}
