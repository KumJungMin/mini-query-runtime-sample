<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    tone?: 'neutral' | 'success' | 'warning' | 'info'
  }>(),
  {
    tone: 'neutral'
  }
)

const style = computed(() => {
  const backgroundMap: Record<string, string> = {
    neutral: '#e5e7eb',
    success: '#d1fae5',
    warning: '#fef3c7',
    info: '#dbeafe'
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '4px 10px',
    fontSize: '0.85rem',
    background: backgroundMap[props.tone],
    color: '#111827'
  }
})
</script>

<template>
  <span :style="style"><slot /></span>
</template>
