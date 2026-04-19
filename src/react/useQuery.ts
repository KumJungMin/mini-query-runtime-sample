import { useEffect, useSyncExternalStore } from 'react'
import { fetchQuery } from '../core/fetchQuery.js'
import { policyMap } from '../core/policies.js'
import { mountQueryObserver, unmountQueryObserver } from '../core/queryObserver.js'
import { getOrCreateState, subscribeToQuery } from '../core/queryStore.js'
import type { QueryDefinition, QueryState } from '../core/types.js'

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
  const config = policyMap[queryDefinition.policy]
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
