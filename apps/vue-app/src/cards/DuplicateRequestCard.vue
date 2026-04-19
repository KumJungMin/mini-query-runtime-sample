<script setup lang="ts">
import { ref } from 'vue'
import { DEDUPE_EXAMPLE_QUERY } from '@query/core'
import Badge from '../components/Badge.vue'
import DebugPanel from '../components/DebugPanel.vue'
import LogPanel from '../components/LogPanel.vue'
import DedupeConsumer from './DedupeConsumer.vue'
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
const { debug, logs, addLog, clearLogs } = useQueryDebugCard(DEDUPE_EXAMPLE_QUERY)

function handleMount() {
  addLog('[UI] mount two consumers')
  mounted.value = true
}

function handleUnmount() {
  addLog('[UI] unmount both consumers')
  mounted.value = false
}
</script>

<template>
  <section :style="cardStyle">
    <h2 :style="titleStyle">1. Duplicate Request Prevention</h2>
    <p :style="descriptionStyle">
      Mount two components with the same query. Only one fetch should happen,
      and both components should render the same value.
    </p>
    <div :style="buttonRowStyle">
      <button :style="buttonStyle" @click="handleMount">Mount Components</button>
      <button :style="buttonStyle" @click="handleUnmount">Unmount</button>
    </div>
    <div :style="badgeRowStyle">
      <Badge tone="info">Expected: one fetch log</Badge>
      <Badge tone="info">Expected: same value</Badge>
    </div>
    <div v-if="mounted" style="display: grid; gap: 12px">
      <DedupeConsumer title="TestA" />
      <DedupeConsumer title="TestB" />
    </div>
    <p v-else>Consumers are not mounted.</p>
    <DebugPanel :debug="debug" />
    <LogPanel :logs="logs" @clear="clearLogs" />
  </section>
</template>
