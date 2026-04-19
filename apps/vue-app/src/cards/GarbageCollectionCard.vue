<script setup lang="ts">
import { computed, ref } from 'vue'
import { GC_EXAMPLE_QUERY } from '@query/core'
import Badge from '../components/Badge.vue'
import DebugPanel from '../components/DebugPanel.vue'
import LogPanel from '../components/LogPanel.vue'
import GcViewer from './GcViewer.vue'
import {
  badgeRowStyle,
  buttonRowStyle,
  buttonStyle,
  cardStyle,
  descriptionStyle,
  titleStyle
} from '../dashboard/styles'
import { useQueryDebugCard } from '../composables/useQueryDebugCard'

const mounted = ref(false)
const { debug, logs, addLog, clearLogs } = useQueryDebugCard(GC_EXAMPLE_QUERY)

const gcLabel = computed(() => {
  return debug.value.gcRemainingMs != null
    ? `${(debug.value.gcRemainingMs / 1000).toFixed(1)} sec`
    : '-'
})

function handleToggleMounted() {
  addLog(`[UI] ${mounted.value ? 'unmount' : 'mount'} GC consumer`)
  mounted.value = !mounted.value
}
</script>

<template>
  <section :style="cardStyle">
    <h2 :style="titleStyle">5. cacheTime + Garbage Collection</h2>
    <p :style="descriptionStyle">
      Unmount the consumer to start GC. Remount before the countdown ends to
      reuse cache. Remount after deletion to force a new fetch.
    </p>
    <div :style="buttonRowStyle">
      <button :style="buttonStyle" @click="handleToggleMounted">
        {{ mounted ? 'Unmount' : 'Remount' }}
      </button>
    </div>
    <div :style="badgeRowStyle">
      <Badge tone="info">GC in: {{ gcLabel }}</Badge>
      <Badge v-if="!debug.isPresent" tone="warning">cache deleted</Badge>
    </div>
    <GcViewer v-if="mounted" />
    <p v-else>Consumer is unmounted.</p>
    <DebugPanel :debug="debug" />
    <LogPanel :logs="logs" @clear="clearLogs" />
  </section>
</template>
