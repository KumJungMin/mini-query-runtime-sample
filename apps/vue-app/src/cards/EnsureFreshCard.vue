<script setup lang="ts">
import {
  PRELOAD_EXAMPLE_QUERY,
  ensureFresh,
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
  addLog('[UI] preload with ensureFresh')
  const config = resolveQueryConfig(
    PRELOAD_EXAMPLE_QUERY.policy,
    PRELOAD_EXAMPLE_QUERY.config
  )
  const state = getOrCreateState(PRELOAD_EXAMPLE_QUERY.key, config)
  await ensureFresh(PRELOAD_EXAMPLE_QUERY, state)
  warmCacheReady.value = true
  addLog('[ensureFresh] preload complete, cache is warm')
}

function handleTogglePage() {
  addLog(`[UI] ${pageMounted.value ? 'hide' : 'show'} page`)
  pageMounted.value = !pageMounted.value
}
</script>

<template>
  <section :style="cardStyle">
    <h2 :style="titleStyle">4. ensureFresh Preload (Warm Cache)</h2>
    <p :style="descriptionStyle">
      Preload data first, then mount the page component. When the cache is warm
      and still fresh, the page can render data immediately without an initial
      loading state.
    </p>
    <div :style="buttonRowStyle">
      <button :style="buttonStyle" @click="handlePreload()">Preload (ensureFresh)</button>
      <button :style="buttonStyle" @click="handleTogglePage">
        {{ pageMounted ? 'Hide Page' : 'Go to Page' }}
      </button>
    </div>
    <div :style="badgeRowStyle">
      <Badge v-if="warmCacheReady && debug.freshnessLabel === 'fresh'" tone="success">
        warm cache
      </Badge>
      <Badge tone="info">staleTime: 5 seconds</Badge>
    </div>
    <PreloadedPage v-if="pageMounted" />
    <p v-else>Page is not mounted yet.</p>
    <DebugPanel :debug="debug" />
    <LogPanel :logs="logs" @clear="clearLogs" />
  </section>
</template>
