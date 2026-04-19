import { onMounted, onUnmounted, shallowRef } from 'vue'
import { fetchQuery } from '../core/fetchQuery.js'
import { policyMap } from '../core/policies.js'
import { mountQueryObserver, unmountQueryObserver } from '../core/queryObserver.js'
import { getOrCreateState, subscribeToQuery } from '../core/queryStore.js'
import type { QueryDefinition, QueryState } from '../core/types.js'

function syncStateToRefs<TData>(
  state: QueryState<TData>,
  data: { value: TData | undefined },
  isLoading: { value: boolean },
  error: { value: unknown }
): void {
  data.value = state.data
  isLoading.value = state.status === 'loading'
  error.value = state.error
}

export function useQuery<TData>(queryDefinition: QueryDefinition<TData>) {
  const config = policyMap[queryDefinition.policy]
  const state = getOrCreateState<TData>(queryDefinition.key, config)

  const data = shallowRef<TData | undefined>(state.data)
  const isLoading = shallowRef(state.status === 'loading')
  const error = shallowRef<unknown>(state.error)

  const unsubscribe = subscribeToQuery(state, () => {
    syncStateToRefs(state, data, isLoading, error)
  })

  onMounted(() => {
    mountQueryObserver(queryDefinition, state)
  })

  onUnmounted(() => {
    unsubscribe()
    unmountQueryObserver(state, queryDefinition.key)
  })

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchQuery(state, queryDefinition.fetcher)
  }
}
