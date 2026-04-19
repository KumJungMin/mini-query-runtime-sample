<script setup lang="ts">
import { PRELOAD_EXAMPLE_QUERY } from '@query/core'
import { useQuery } from '@query/vue'
import { panelStyle } from '../dashboard/styles'

const { data, isLoading } = useQuery(PRELOAD_EXAMPLE_QUERY)
</script>

<template>
  <div :style="panelStyle">
    <strong>Page Component</strong>
    <p>{{ isLoading ? 'Loading...' : 'Instant data render' }}</p>
    <p>Request ID: {{ data?.requestId ?? '-' }}</p>
    <p>Value: {{ data?.value ?? '-' }}</p>
    <p>Fetched At: {{ data?.fetchedAt ?? '-' }}</p>
  </div>
</template>
