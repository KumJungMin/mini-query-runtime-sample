import {
  getExistingState,
  getQueryKeyString,
  isQueryStale,
  subscribeToQuery
} from '@query/core'
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import type { QueryDefinition, QueryState } from '@query/core'

type LogEntry = {
  id: number
  message: string
}

type DebugSnapshot<TData> = {
  keyString: string
  state?: QueryState<TData>
  isPresent: boolean
  status: string
  observers: number
  lastFetchedAtLabel: string
  freshnessLabel: 'unfetched' | 'fresh' | 'stale'
  hasPromise: boolean
  gcRemainingMs: number | null
  data?: TData
  cacheAlive: boolean
}

type TransitionSnapshot = {
  isPresent: boolean
  hasPromise: boolean
  requestId: number | null
  value: number | null
  gcExpiresAt: number | null
}

function createLogEntry(message: string): LogEntry {
  return {
    id: Date.now() + Math.random(),
    message: `[${new Date().toLocaleTimeString()}] ${message}`
  }
}

export function useQueryDebugCard<TData extends { requestId?: number; value?: number }>(
  queryDefinition: QueryDefinition<TData>
) {
  const logs = ref<LogEntry[]>([])
  const tick = ref(0)
  const state = shallowRef<QueryState<TData> | undefined>(
    getExistingState<TData>(queryDefinition.key)
  )

  let intervalId: number | undefined
  let unsubscribe: (() => void) | undefined
  let previousSnapshot: TransitionSnapshot = {
    isPresent: false,
    hasPromise: false,
    requestId: null,
    value: null,
    gcExpiresAt: null
  }

  function addLog(message: string) {
    logs.value = [createLogEntry(message), ...logs.value].slice(0, 16)
  }

  function clearLogs() {
    logs.value = []
  }

  function syncSubscription() {
    const nextState = getExistingState<TData>(queryDefinition.key)

    if (nextState === state.value) {
      return
    }

    unsubscribe?.()
    unsubscribe = undefined
    state.value = nextState

    if (state.value) {
      unsubscribe = subscribeToQuery(state.value, () => {
        state.value = getExistingState<TData>(queryDefinition.key)
        tick.value += 1
      })
    }

    tick.value += 1
  }

  onMounted(() => {
    syncSubscription()

    intervalId = window.setInterval(() => {
      syncSubscription()
      state.value = getExistingState<TData>(queryDefinition.key)
      tick.value += 1
    }, 250)
  })

  onUnmounted(() => {
    unsubscribe?.()

    if (intervalId != null) {
      window.clearInterval(intervalId)
    }
  })

  const debug = computed<DebugSnapshot<TData>>(() => {
    tick.value

    const currentState = state.value
    const gcRemainingMs =
      currentState?.gcExpiresAt != null
        ? Math.max(currentState.gcExpiresAt - Date.now(), 0)
        : null

    return {
      keyString: getQueryKeyString(queryDefinition.key),
      state: currentState,
      isPresent: currentState != null,
      status: currentState?.status ?? 'idle',
      observers: currentState?.observers ?? 0,
      lastFetchedAtLabel: currentState?.lastFetchedAt
        ? new Date(currentState.lastFetchedAt).toLocaleTimeString()
        : '-',
      freshnessLabel:
        currentState == null || currentState.lastFetchedAt === 0
          ? 'unfetched'
          : isQueryStale(currentState)
            ? 'stale'
            : 'fresh',
      hasPromise: Boolean(currentState?.promise),
      gcRemainingMs,
      data: currentState?.data,
      cacheAlive: currentState != null
    }
  })

  watch(
    debug,
    (currentDebug) => {
      const requestId =
        typeof currentDebug.data?.requestId === 'number'
          ? currentDebug.data.requestId
          : null
      const value =
        typeof currentDebug.data?.value === 'number' ? currentDebug.data.value : null
      const currentSnapshot: TransitionSnapshot = {
        isPresent: currentDebug.isPresent,
        hasPromise: currentDebug.hasPromise,
        requestId,
        value,
        gcExpiresAt: currentDebug.state?.gcExpiresAt ?? null
      }

      if (!previousSnapshot.hasPromise && currentSnapshot.hasPromise) {
        addLog('[FETCH] request')
      }

      if (
        currentSnapshot.requestId != null &&
        previousSnapshot.requestId !== currentSnapshot.requestId
      ) {
        addLog(
          `[FETCH] response: request #${currentSnapshot.requestId}, value ${currentSnapshot.value?.toFixed(4) ?? '-'}`
        )
      }

      if (
        previousSnapshot.gcExpiresAt == null &&
        currentSnapshot.gcExpiresAt != null &&
        currentDebug.state?.cacheTime
      ) {
        addLog(`[GC] scheduled for ${(currentDebug.state.cacheTime / 1000).toFixed(0)} sec`)
      }

      if (previousSnapshot.isPresent && !currentSnapshot.isPresent) {
        addLog('[GC] cache deleted')
      }

      previousSnapshot = currentSnapshot
    },
    { immediate: true }
  )

  return {
    debug,
    logs,
    addLog,
    clearLogs
  }
}
