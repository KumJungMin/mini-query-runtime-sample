<script setup lang="ts">
import Badge from './Badge.vue'
import { monoStyle, panelStyle } from '../dashboard/styles'

defineProps<{
  debug: {
    status: string
    observers: number
    lastFetchedAtLabel: string
    freshnessLabel: 'unfetched' | 'fresh' | 'stale'
    hasPromise: boolean
    gcRemainingMs: number | null
    keyString: string
    cacheAlive: boolean
  }
}>()
</script>

<template>
  <div :style="panelStyle">
    <strong>State Debug Panel</strong>
    <div style="display: grid; gap: 6px; margin-top: 10px">
      <div><span :style="monoStyle">status:</span> {{ debug.status }}</div>
      <div><span :style="monoStyle">observers:</span> {{ debug.observers }}</div>
      <div><span :style="monoStyle">lastFetchedAt:</span> {{ debug.lastFetchedAtLabel }}</div>
      <div><span :style="monoStyle">isStale:</span> {{ debug.freshnessLabel === 'stale' ? 'true' : 'false' }}</div>
      <div><span :style="monoStyle">hasPromise:</span> {{ debug.hasPromise ? 'true' : 'false' }}</div>
      <div>
        <span :style="monoStyle">gcRemaining:</span>
        {{ debug.gcRemainingMs != null ? `${(debug.gcRemainingMs / 1000).toFixed(1)}s` : '-' }}
      </div>
      <div><span :style="monoStyle">queryKey:</span> {{ debug.keyString }}</div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap">
        <Badge :tone="debug.freshnessLabel === 'fresh' ? 'success' : 'warning'">
          {{ debug.freshnessLabel }}
        </Badge>
        <Badge :tone="debug.cacheAlive ? 'info' : 'neutral'">
          {{ debug.cacheAlive ? 'cache alive' : 'cache missing' }}
        </Badge>
      </div>
    </div>
  </div>
</template>
