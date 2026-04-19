<script setup lang="ts">
import { computed, ref } from 'vue'
import Badge from '../components/Badge.vue'
import DebugPanel from '../components/DebugPanel.vue'
import LogPanel from '../components/LogPanel.vue'
import StaleViewer from './StaleViewer.vue'
import {
  badgeRowStyle,
  buttonRowStyle,
  buttonStyle,
  cardStyle,
  descriptionStyle,
  titleStyle
} from '../dashboard/styles'
import { STALE_TIME_EXAMPLE_QUERY } from '@query/core'
import { useQueryDebugCard } from '../composables/useQueryDebugCard'

const mounted = ref(false)
const { debug, logs, addLog, clearLogs } = useQueryDebugCard(STALE_TIME_EXAMPLE_QUERY)

const staleInSeconds = computed(() => {
  if (!debug.value.state?.lastFetchedAt) {
    return 5
  }

  const elapsedSeconds = Math.floor(
    (Date.now() - debug.value.state.lastFetchedAt) / 1000
  )

  return Math.max(0, 5 - elapsedSeconds)
})

function handleToggleMounted() {
  addLog(`[UI] ${mounted.value ? 'unmount' : 'mount'} stale-time consumer`)
  mounted.value = !mounted.value
}
</script>

<template>
  <section :style="cardStyle">
    <h2 :style="titleStyle">3. staleTime Behavior (5 seconds)</h2>
    <p :style="descriptionStyle">
      Mount the consumer, unmount it, and remount it within 5 seconds or after
      5 seconds. Within 5 seconds, the cached value is reused. After 5 seconds,
      the runtime fetches again.
    </p>
    <div :style="buttonRowStyle">
      <button :style="buttonStyle" @click="handleToggleMounted">
        {{ mounted ? 'Unmount consumer' : 'Mount consumer' }}
      </button>
    </div>
    <div :style="badgeRowStyle">
      <Badge :tone="debug.freshnessLabel === 'fresh' ? 'success' : 'warning'">
        {{ debug.freshnessLabel }}
      </Badge>
      <Badge tone="info">stale in: {{ staleInSeconds }}s</Badge>
    </div>
    <StaleViewer v-if="mounted" />
    <p v-else>Consumer is unmounted.</p>
    <DebugPanel :debug="debug" />
    <LogPanel :logs="logs" @clear="clearLogs" />
  </section>
</template>
