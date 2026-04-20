import { onMounted, onUnmounted, shallowRef } from 'vue'
import {
  createQueryStateConfig,
  fetchQuery,
  getOrCreateState,
  mountQueryObserver,
  resolveQueryConfig,
  subscribeToQuery
} from '@query/core'
import { unmountQueryObserver } from '@query/core'
import type { QueryDefinition, QueryState } from '@query/core'

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

export function useQuery<TQueryFnData, TData>(
  queryDefinition: QueryDefinition<TQueryFnData, TData>
) {
  const resolvedConfig = resolveQueryConfig(
    queryDefinition.policy,
    queryDefinition.config
  )
  const state = getOrCreateState(
    queryDefinition,
    createQueryStateConfig(queryDefinition, resolvedConfig)
  )

  const data = shallowRef<TData | undefined>(state.data)
  const isLoading = shallowRef(state.status === 'loading')
  const error = shallowRef<unknown>(state.error)

  const unsubscribe = subscribeToQuery(state, () => {
    syncStateToRefs(state, data, isLoading, error)
  })

  onMounted(() => {
    mountQueryObserver(state)
  })

  onUnmounted(() => {
    unsubscribe()
    unmountQueryObserver(state)
  })

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchQuery(state)
  }
}
