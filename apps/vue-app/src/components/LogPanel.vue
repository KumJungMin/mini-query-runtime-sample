<script setup lang="ts">
import { logListStyle, panelStyle } from '../dashboard/styles'

defineProps<{
  logs: Array<{ id: number; message: string }>
}>()

defineEmits<{
  clear: []
}>()
</script>

<template>
  <div :style="panelStyle">
    <div
      style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px"
    >
      <strong>Logs</strong>
      <button @click="$emit('clear')">Clear</button>
    </div>
    <p v-if="logs.length === 0" style="margin: 0">No logs yet.</p>
    <ol v-else :style="logListStyle">
      <li v-for="log in logs" :key="log.id">{{ log.message }}</li>
    </ol>
  </div>
</template>
