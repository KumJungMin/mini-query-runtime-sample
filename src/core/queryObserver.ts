import { isQueryStale } from './ensureFresh.js'
import { fetchQuery } from './fetchQuery.js'
import { cancelScheduledGC, scheduleGC } from './gc.js'
import { policyMap } from './policies.js'
import type { QueryDefinition, QueryState } from './types.js'

/** 
 * mountQueryObserver function
 * - This function is called when a component starts observing a query. 
 * - It increments the observer count and cancels any scheduled garbage collection for the query.
 * - If the policy requires auto-refetching and the data is stale, it triggers a fetch to refresh the data.
 * */ 
export function mountQueryObserver<TData>(
  queryDefinition: QueryDefinition<TData>,
  state: QueryState<TData>
): void {
  state.observers += 1
  cancelScheduledGC(state)

  const config = policyMap[queryDefinition.policy]

  if (!config.autoRefetch || !isQueryStale(state)) {
    return
  }
  fetchQuery(state, queryDefinition.fetcher).catch(() => undefined)
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
