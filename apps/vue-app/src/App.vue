<script setup lang="ts">
import DuplicateRequestCard from './cards/DuplicateRequestCard.vue'
import GarbageCollectionCard from './cards/GarbageCollectionCard.vue'
import ManualRefetchCard from './cards/ManualRefetchCard.vue'
import PreloadRefetchCard from './cards/PreloadRefetchCard.vue'
import StaleTimeCard from './cards/StaleTimeCard.vue'
import { appStyle, gridStyle, headerStyle } from './dashboard/styles'
</script>

<template>
  <main :style="appStyle">
    <header :style="headerStyle">
      <h1>Query Runtime Visual Test Dashboard</h1>
      <p>
        This is a learning and debug tool for observing duplicate request
        prevention, staleTime, manual refetch, refetch-on-mount,
        refetch-on-focus, warm-cache preload, and gcTime-based garbage
        collection.
      </p>
    </header>
    <section :style="gridStyle">
      <DuplicateRequestCard />
      <ManualRefetchCard />
      <StaleTimeCard />
      <PreloadRefetchCard />
      <GarbageCollectionCard />
    </section>
  </main>
</template>
