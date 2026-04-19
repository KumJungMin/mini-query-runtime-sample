<script setup lang="ts">
import { DEDUPE_EXAMPLE_QUERY } from '@query/core'
import { useQuery } from '@query/vue'

defineProps<{
  title: string
}>()

const { data, isLoading } = useQuery(DEDUPE_EXAMPLE_QUERY)

const consumerStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '12px'
}
</script>

<template>
  <div :style="consumerStyle">
    <strong>{{ title }}</strong>
    <p>{{ isLoading ? 'Waiting for shared request...' : `Value: ${data?.value ?? '-'}` }}</p>
    <p>Request ID: {{ data?.requestId ?? '-' }}</p>
  </div>
</template>
