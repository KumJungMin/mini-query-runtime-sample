<script setup lang="ts">
import {
  createQueryStateConfig,
  fetchQuery,
  PRELOAD_EXAMPLE_QUERY,
  getOrCreateState,
  resolveQueryConfig
} from '@query/core'
import { ref } from 'vue'
import Badge from '../components/Badge.vue'
import DebugPanel from '../components/DebugPanel.vue'
import LogPanel from '../components/LogPanel.vue'
import PreloadedPage from './PreloadedPage.vue'
import {
  badgeRowStyle,
  buttonRowStyle,
  buttonStyle,
  cardStyle,
  descriptionStyle,
  titleStyle
} from '../dashboard/styles'
import { useQueryDebugCard } from '../composables/useQueryDebugCard'

const pageMounted = ref(false)
const warmCacheReady = ref(false)
const { debug, logs, addLog, clearLogs } = useQueryDebugCard(PRELOAD_EXAMPLE_QUERY)

async function handlePreload() {
  addLog('[UI] preload with refetch')
  const resolvedConfig = resolveQueryConfig(
    PRELOAD_EXAMPLE_QUERY.policy,
    PRELOAD_EXAMPLE_QUERY.config
  )
  const state = getOrCreateState(
    PRELOAD_EXAMPLE_QUERY,
    createQueryStateConfig(PRELOAD_EXAMPLE_QUERY, resolvedConfig)
  )
  const refetch = () => fetchQuery(state)

  await refetch()
  warmCacheReady.value = true
  addLog('[refetch] preload complete, cache is warm')
}

function handleTogglePage() {
  addLog(`[UI] ${pageMounted.value ? 'hide' : 'show'} page`)
  pageMounted.value = !pageMounted.value
}
</script>

<template>
  <section :style="cardStyle">
    <h2 :style="titleStyle">4. Refetch Preload (Warm Cache)</h2>
    <p :style="descriptionStyle">
      Preload data first, then mount the page component. When the cache is warm
      and still fresh, the page can render data immediately without an initial
      loading state. If the cache becomes stale before mount, refetchOnMount
      triggers the next request automatically.
    </p>
    <div :style="buttonRowStyle">
      <button :style="buttonStyle" @click="handlePreload()">Preload (refetch)</button>
      <button :style="buttonStyle" @click="handleTogglePage">
        {{ pageMounted ? 'Hide Page' : 'Go to Page' }}
      </button>
    </div>
    <div :style="badgeRowStyle">
      <Badge v-if="warmCacheReady && debug.freshnessLabel === 'fresh'" tone="success">
        warm cache
      </Badge>
      <Badge tone="info">staleTime: 5 seconds</Badge>
      <Badge tone="info">refetchOnMount: true</Badge>
    </div>
    <PreloadedPage v-if="pageMounted" />
    <p v-else>Page is not mounted yet.</p>
    <DebugPanel :debug="debug" />
    <LogPanel :logs="logs" @clear="clearLogs" />
  </section>
</template>
