<script setup lang="ts">
import { STALE_TIME_EXAMPLE_QUERY } from '@query/core'
import { useQuery } from '@query/vue'
import { panelStyle } from '../dashboard/styles'

const { data, isLoading } = useQuery(STALE_TIME_EXAMPLE_QUERY)
</script>

<template>
  <div :style="panelStyle">
    <strong>Mounted Consumer</strong>
    <p>{{ isLoading ? 'Loading...' : 'Loaded' }}</p>
    <p>Request ID: {{ data?.requestId ?? '-' }}</p>
    <p>Fetched At: {{ data?.fetchedAt ?? '-' }}</p>
  </div>
</template>
