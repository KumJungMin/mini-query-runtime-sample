import type { QueryState } from './types.js'
import { getQueryKeyString, queryMap } from './queryStore.js'

type TimerWithUnref = {
  unref: () => void
}

export function scheduleGC(state: QueryState, key: readonly unknown[]): void {
  const keyString = getQueryKeyString(key)

  if (state.gcTimeoutId) {
    clearTimeout(state.gcTimeoutId)
  }

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

/** 
 * detachTimerIfPossible function
 * Keep the GC timer scheduled, but do not let it keep the Node.js process alive.
 * */ 
function detachTimerIfPossible(timeoutId: ReturnType<typeof setTimeout>): void {
  if (hasUnref(timeoutId)) {
    timeoutId.unref() // Detach the timer so it won't keep the Node.js process alive
  }
}

function hasUnref(timeoutId: unknown): timeoutId is TimerWithUnref {
  return (
    typeof timeoutId === 'object' &&
    timeoutId !== null &&
    'unref' in timeoutId &&
    typeof (timeoutId as TimerWithUnref).unref === 'function'
  )
}

/** 
 * revive function
 * - This function is called when we want to "revive" a query state, 
 *   which means we want to prevent it from being garbage collected.
 * */ 
export function revive(state: QueryState, key: readonly unknown[]): void {
  if (state.gcTimeoutId) {
    clearTimeout(state.gcTimeoutId)
    state.gcTimeoutId = undefined
  }

  scheduleGC(state, key)
}
