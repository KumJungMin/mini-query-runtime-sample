<script setup lang="ts">
import DuplicateRequestCard from './cards/DuplicateRequestCard.vue'
import EnsureFreshCard from './cards/EnsureFreshCard.vue'
import GarbageCollectionCard from './cards/GarbageCollectionCard.vue'
import ManualRefetchCard from './cards/ManualRefetchCard.vue'
import StaleTimeCard from './cards/StaleTimeCard.vue'
import { appStyle, gridStyle, headerStyle } from './dashboard/styles'
</script>

<template>
  <main :style="appStyle">
    <header :style="headerStyle">
      <h1>Query Runtime Visual Test Dashboard</h1>
      <p>
        This is a learning and debug tool for observing duplicate request
        prevention, staleTime, manual refetch, ensureFresh preload, and
        cache-time garbage collection.
      </p>
    </header>
    <section :style="gridStyle">
      <DuplicateRequestCard />
      <ManualRefetchCard />
      <StaleTimeCard />
      <EnsureFreshCard />
      <GarbageCollectionCard />
    </section>
  </main>
</template>
