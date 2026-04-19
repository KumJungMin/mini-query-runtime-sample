import { useState } from 'react'
import { STALE_TIME_EXAMPLE_QUERY } from '@query/core'
import { useQuery } from '@query/react'
import { Badge } from './Badge'
import { DebugPanel } from './DebugPanel'
import { LogPanel } from './LogPanel'
import {
  badgeRowStyle,
  buttonRowStyle,
  buttonStyle,
  cardStyle,
  descriptionStyle,
  panelStyle,
  sectionTitleStyle
} from './styles'
import { useQueryDebugCard } from './useQueryDebugCard'

function StaleViewer() {
  const { data, isLoading } = useQuery(STALE_TIME_EXAMPLE_QUERY)

  return (
    <div style={panelStyle}>
      <strong>Mounted Consumer</strong>
      <p>{isLoading ? 'Loading...' : 'Loaded'}</p>
      <p>Request ID: {data?.requestId ?? '-'}</p>
      <p>Fetched At: {data?.fetchedAt ?? '-'}</p>
    </div>
  )
}

export function StaleTimeCard() {
  const [mounted, setMounted] = useState(false)
  const { debug, logs, addLog, clearLogs } = useQueryDebugCard(STALE_TIME_EXAMPLE_QUERY)

  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>3. staleTime Behavior (5 seconds)</h2>
      <p style={descriptionStyle}>
        Mount the consumer, unmount it, and remount it within 5 seconds or after
        5 seconds. Within 5 seconds, the cached value is reused. After 5 seconds,
        the runtime fetches again.
      </p>
      <div style={buttonRowStyle}>
        <button
          style={buttonStyle}
          onClick={() => {
            addLog(`[UI] ${mounted ? 'unmount' : 'mount'} stale-time consumer`)
            setMounted((value) => !value)
          }}
        >
          {mounted ? 'Unmount consumer' : 'Mount consumer'}
        </button>
      </div>
      <div style={badgeRowStyle}>
        <Badge tone={debug.freshnessLabel === 'fresh' ? 'success' : 'warning'}>
          {debug.freshnessLabel}
        </Badge>
        <Badge tone="info">
          stale in: {debug.state?.lastFetchedAt ? Math.max(0, 5 - Math.floor((Date.now() - debug.state.lastFetchedAt) / 1000)) : 5}
          s
        </Badge>
      </div>
      {mounted ? <StaleViewer /> : <p>Consumer is unmounted.</p>}
      <DebugPanel debug={debug} />
      <LogPanel logs={logs} onClear={clearLogs} />
    </section>
  )
}
