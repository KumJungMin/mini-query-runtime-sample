<script setup lang="ts">
import { API1_QUERY } from '@query/core'
import { useQuery } from '@query/vue'
import DebugPanel from '../components/DebugPanel.vue'
import LogPanel from '../components/LogPanel.vue'
import {
  buttonRowStyle,
  buttonStyle,
  cardStyle,
  descriptionStyle,
  panelStyle,
  titleStyle
} from '../dashboard/styles'
import { useQueryDebugCard } from '../composables/useQueryDebugCard'

const { data, error, isLoading, refetch } = useQuery(API1_QUERY)
const { debug, logs, addLog, clearLogs } = useQueryDebugCard(API1_QUERY)

function handleRefetch() {
  addLog('[UI] manual refetch button clicked')
  refetch()
}
</script>

<template>
  <section :style="cardStyle">
    <h2 :style="titleStyle">2. Manual Refetch</h2>
    <p :style="descriptionStyle">
      Manual refetch always triggers a new request. Watch the request id and
      random value change on each click.
    </p>
    <div :style="panelStyle">
      <strong>Query Result</strong>
      <p>Status: {{ isLoading ? 'loading' : 'ready' }}</p>
      <p>Request ID: {{ data?.requestId ?? '-' }}</p>
      <p>Value: {{ data?.value ?? '-' }}</p>
      <p>Fetched At: {{ data?.fetchedAt ?? '-' }}</p>
      <p v-if="error">Failed to fetch.</p>
      <div :style="buttonRowStyle">
        <button :style="buttonStyle" @click="handleRefetch">Refetch</button>
      </div>
    </div>
    <DebugPanel :debug="debug" />
    <LogPanel :logs="logs" @clear="clearLogs" />
  </section>
</template>
