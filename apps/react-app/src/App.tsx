import { DuplicateRequestCard } from './dashboard/DuplicateRequestCard'
import { EnsureFreshCard } from './dashboard/EnsureFreshCard'
import { GarbageCollectionCard } from './dashboard/GarbageCollectionCard'
import { ManualRefetchCard } from './dashboard/ManualRefetchCard'
import { StaleTimeCard } from './dashboard/StaleTimeCard'
import { appStyle, gridStyle, headerStyle } from './dashboard/styles'

export default function App() {
  return (
    <main style={appStyle}>
      <header style={headerStyle}>
        <h1>Query Runtime Visual Test Dashboard</h1>
        <p>
          This is a learning and debug tool for observing duplicate request
          prevention, staleTime, manual refetch, ensureFresh preload, and
          cache-time garbage collection.
        </p>
      </header>
      <section style={gridStyle}>
        <DuplicateRequestCard />
        <ManualRefetchCard />
        <StaleTimeCard />
        <EnsureFreshCard />
        <GarbageCollectionCard />
      </section>
    </main>
  )
}
