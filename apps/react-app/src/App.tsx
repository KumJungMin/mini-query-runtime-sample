import { DuplicateRequestCard } from './dashboard/DuplicateRequestCard'
import { GarbageCollectionCard } from './dashboard/GarbageCollectionCard'
import { ManualRefetchCard } from './dashboard/ManualRefetchCard'
import { PreloadRefetchCard } from './dashboard/PreloadRefetchCard'
import { StaleTimeCard } from './dashboard/StaleTimeCard'
import { appStyle, gridStyle, headerStyle } from './dashboard/styles'

export default function App() {
  return (
    <main style={appStyle}>
      <header style={headerStyle}>
        <h1>Query Runtime Visual Test Dashboard</h1>
        <p>
          This is a learning and debug tool for observing duplicate request
          prevention, staleTime, manual refetch, refetch-on-mount,
          refetch-on-focus, warm-cache preload, and gcTime-based garbage
          collection.
        </p>
      </header>
      <section style={gridStyle}>
        <DuplicateRequestCard />
        <ManualRefetchCard />
        <StaleTimeCard />
        <PreloadRefetchCard />
        <GarbageCollectionCard />
      </section>
    </main>
  )
}
