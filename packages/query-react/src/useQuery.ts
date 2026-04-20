import { useEffect, useSyncExternalStore } from 'react'
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

type QuerySnapshot<TData> = {
  data?: TData
  isLoading: boolean
  error?: unknown
}

function createSnapshot<TData>(state: QueryState<TData>): QuerySnapshot<TData> {
  return {
    data: state.data,
    isLoading: state.status === 'loading',
    error: state.error
  }
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

  useSyncExternalStore(
    (onStoreChange) => subscribeToQuery(state, onStoreChange),
    () => state.revision,
    () => state.revision
  )

  const snapshot = createSnapshot(state)

  useEffect(() => {
    mountQueryObserver(state)

    return () => {
      unmountQueryObserver(state)
    }
  }, [state])

  return {
    ...snapshot,
    refetch: () => fetchQuery(state)
  }
}
