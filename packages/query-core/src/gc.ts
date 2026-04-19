import type { QueryState } from './types.js'
import { getQueryKeyString, queryMap } from './queryStore.js'

type TimerHandleWithUnref = {
  unref: () => void
}

export function scheduleGC(state: QueryState, key: readonly unknown[]): void {
  const keyString = getQueryKeyString(key)

  cancelScheduledGC(state)

  if (state.cacheTime === Infinity) {
    state.gcTimeoutId = undefined
    state.gcScheduledAt = undefined
    state.gcExpiresAt = undefined
    return
  }

  state.gcScheduledAt = Date.now()
  state.gcExpiresAt = state.gcScheduledAt + state.cacheTime
  state.gcTimeoutId = setTimeout(() => {
    if (state.observers === 0) {
      queryMap.delete(keyString)
    }
  }, state.cacheTime)

  detachTimerIfPossible(state.gcTimeoutId)
}

export function cancelScheduledGC(state: QueryState): void {
  if (!state.gcTimeoutId) {
    state.gcScheduledAt = undefined
    state.gcExpiresAt = undefined
    return
  }

  clearTimeout(state.gcTimeoutId)
  state.gcTimeoutId = undefined
  state.gcScheduledAt = undefined
  state.gcExpiresAt = undefined
}

function detachTimerIfPossible(timeoutId: ReturnType<typeof setTimeout>): void {
  if (hasUnref(timeoutId)) {
    timeoutId.unref()
  }
}

function hasUnref(timeoutId: unknown): timeoutId is TimerHandleWithUnref {
  return (
    typeof timeoutId === 'object' &&
    timeoutId !== null &&
    'unref' in timeoutId &&
    typeof (timeoutId as TimerHandleWithUnref).unref === 'function'
  )
}

export function revive(state: QueryState, key: readonly unknown[]): void {
  cancelScheduledGC(state)
  scheduleGC(state, key)
}
