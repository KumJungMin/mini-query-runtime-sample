<script setup lang="ts">
import { GC_EXAMPLE_QUERY } from '@query/core'
import { useQuery } from '@query/vue'
import { panelStyle } from '../dashboard/styles'

const { data, isLoading } = useQuery(GC_EXAMPLE_QUERY)
</script>

<template>
  <div :style="panelStyle">
    <strong>GC Test Consumer</strong>
    <p>{{ isLoading ? 'Loading...' : 'Ready' }}</p>
    <p>Request ID: {{ data?.requestId ?? '-' }}</p>
    <p>Value: {{ data?.value ?? '-' }}</p>
    <p>Fetched At: {{ data?.fetchedAt ?? '-' }}</p>
  </div>
</template>
