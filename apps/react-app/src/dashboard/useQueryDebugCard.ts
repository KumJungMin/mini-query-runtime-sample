import {
  getExistingState,
  getQueryKeyString,
  isQueryStale,
  subscribeToQuery
} from '@query/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  DemoQuery,
  LogEntry,
  QueryDebugController,
  QueryDebugSnapshot
} from './types'

type DebugTransitionSnapshot = {
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
  queryDefinition: DemoQuery<TData>
): QueryDebugController<TData> {
  const [, setTick] = useState(0)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const previousSnapshotRef = useRef<DebugTransitionSnapshot>({
    isPresent: false,
    hasPromise: false,
    requestId: null,
    value: null,
    gcExpiresAt: null
  })

  const addLog = useCallback((message: string) => {
    setLogs((currentLogs) => [createLogEntry(message), ...currentLogs].slice(0, 16))
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  useEffect(() => {
    let currentState = getExistingState<TData>(queryDefinition.key)
    let unsubscribe =
      currentState &&
      subscribeToQuery(currentState, () => {
        setTick((value) => value + 1)
      })

    const syncStateSubscription = () => {
      const nextState = getExistingState<TData>(queryDefinition.key)

      if (nextState === currentState) {
        return
      }

      if (unsubscribe) {
        unsubscribe()
      }

      currentState = nextState
      unsubscribe =
        currentState &&
        subscribeToQuery(currentState, () => {
          setTick((value) => value + 1)
        })

      setTick((value) => value + 1)
    }

    const intervalId = window.setInterval(() => {
      syncStateSubscription()
      setTick((value) => value + 1)
    }, 250)

    return () => {
      window.clearInterval(intervalId)

      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [queryDefinition])

  const state = getExistingState<TData>(queryDefinition.key)
  const keyString = getQueryKeyString(queryDefinition.key)
  const gcRemainingMs =
    state?.gcExpiresAt != null
      ? Math.max(state.gcExpiresAt - Date.now(), 0)
      : null

  const debug: QueryDebugSnapshot<TData> = {
    keyString,
    state,
    isPresent: state != null,
    status: state?.status ?? 'idle',
    observers: state?.observers ?? 0,
    lastFetchedAtLabel: state?.lastFetchedAt
      ? new Date(state.lastFetchedAt).toLocaleTimeString()
      : '-',
    freshnessLabel:
      state == null || state.lastFetchedAt === 0
        ? 'unfetched'
        : isQueryStale(state)
          ? 'stale'
          : 'fresh',
    hasPromise: Boolean(state?.promise),
    gcRemainingMs,
    data: state?.data,
    cacheAlive: state != null
  }

  useEffect(() => {
    const requestId =
      typeof debug.data?.requestId === 'number' ? debug.data.requestId : null
    const value = typeof debug.data?.value === 'number' ? debug.data.value : null
    const currentSnapshot: DebugTransitionSnapshot = {
      isPresent: debug.isPresent,
      hasPromise: debug.hasPromise,
      requestId,
      value,
      gcExpiresAt: debug.state?.gcExpiresAt ?? null
    }
    const previousSnapshot = previousSnapshotRef.current

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
      debug.state?.gcTime != null
    ) {
      addLog(`[GC] scheduled for ${(debug.state.gcTime / 1000).toFixed(0)} sec`)
    }

    if (previousSnapshot.isPresent && !currentSnapshot.isPresent) {
      addLog('[GC] cache deleted')
    }

    previousSnapshotRef.current = currentSnapshot
  }, [
    addLog,
    debug.data?.requestId,
    debug.data?.value,
    debug.hasPromise,
    debug.isPresent,
    debug.state?.gcTime,
    debug.state?.gcExpiresAt
  ])

  return {
    debug,
    logs,
    addLog,
    clearLogs
  }
}
