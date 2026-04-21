import type { QueryState } from './types.js'
import { getQueryKeyString, queryMap } from './queryStore.js'

/** 
 * scheduleGC 함수
 * - QueryState 객체를 받아서 GC를 예약하는 함수입니다.
 * - gcTime이 유한한 경우에는 gcTime 후에 GC가 실행되도록 예약합니다.
 * */ 
export function scheduleGC(state: QueryState): void {
  cancelScheduledGC(state)

  if (state.gcTime === Infinity) {
    state.gcTimeoutId = undefined
    state.gcScheduledAt = undefined
    state.gcExpiresAt = undefined
  } else {
    state.gcScheduledAt = Date.now()
    state.gcExpiresAt = state.gcScheduledAt + state.gcTime
    const keyString = getQueryKeyString(state.key)

    state.gcTimeoutId = setTimeout(() => {
      if (state.observers === 0) {
        queryMap.delete(keyString)
      }
    }, state.gcTime)
  }
}

export function cancelScheduledGC(state: QueryState): void {
  if (state.gcTimeoutId) clearTimeout(state.gcTimeoutId)

  state.gcTimeoutId = undefined
  state.gcScheduledAt = undefined
  state.gcExpiresAt = undefined
}
