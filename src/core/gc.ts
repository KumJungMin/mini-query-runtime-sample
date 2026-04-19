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
  } else {
    // Schedule garbage collection after cacheTime has passed since the data became stale
    state.gcTimeoutId = setTimeout(() => {
      if (state.observers === 0) {
        queryMap.delete(keyString)
      }
    }, state.cacheTime)
    detachTimerIfPossible(state.gcTimeoutId)
  }
}

export function cancelScheduledGC(state: QueryState): void {
  if (!state.gcTimeoutId) {
    return
  }
  clearTimeout(state.gcTimeoutId)
  state.gcTimeoutId = undefined
}

/** 
 * detachTimerIfPossible function
 * Keep the GC timer scheduled, but do not let it keep the Node.js process alive.
 * */ 
function detachTimerIfPossible(timeoutId: ReturnType<typeof setTimeout>): void {
  if (hasUnref(timeoutId)) {
    timeoutId.unref() // Detach the timer so it won't keep the Node.js process alive
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

/** 
 * revive function
 * - This function is called when we want to "revive" a query state, 
 *   which means we want to prevent it from being garbage collected.
 * */ 
export function revive(state: QueryState, key: readonly unknown[]): void {
  cancelScheduledGC(state)
  scheduleGC(state, key)
}
