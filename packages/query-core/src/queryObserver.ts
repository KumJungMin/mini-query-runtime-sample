import { isQueryStale } from './ensureFresh.js'
import { fetchQuery } from './fetchQuery.js'
import { cancelScheduledGC, scheduleGC } from './gc.js'
import { resolveQueryConfig } from './policies.js'
import type { QueryDefinition, QueryState } from './types.js'

export function mountQueryObserver<TData>(
  queryDefinition: QueryDefinition<TData>,
  state: QueryState<TData>
): void {
  state.observers += 1
  cancelScheduledGC(state)

  const config = resolveQueryConfig(queryDefinition.policy, queryDefinition.config)

  if (!config.autoRefetch || !isQueryStale(state)) {
    return
  }

  void fetchQuery(state, queryDefinition.fetcher).catch(() => undefined)
}

export function unmountQueryObserver(
  state: QueryState,
  key: readonly unknown[]
): void {
  state.observers = Math.max(0, state.observers - 1)

  if (state.observers === 0) {
    scheduleGC(state, key)
  }
}
