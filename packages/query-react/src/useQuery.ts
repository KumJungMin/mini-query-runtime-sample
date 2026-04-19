import { useEffect, useSyncExternalStore } from 'react'
import {
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

export function useQuery<TData>(queryDefinition: QueryDefinition<TData>) {
  const config = resolveQueryConfig(queryDefinition.policy, queryDefinition.config)
  const state = getOrCreateState<TData>(queryDefinition.key, config)

  useSyncExternalStore(
    (onStoreChange) => subscribeToQuery(state, onStoreChange),
    () => state.revision,
    () => state.revision
  )

  const snapshot = createSnapshot(state)

  useEffect(() => {
    mountQueryObserver(queryDefinition, state)

    return () => {
      unmountQueryObserver(state, queryDefinition.key)
    }
  }, [queryDefinition, state])

  return {
    ...snapshot,
    refetch: () => fetchQuery(state, queryDefinition.fetcher)
  }
}
