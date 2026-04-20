import { useState } from 'react'
import { GC_EXAMPLE_QUERY } from '@query/core'
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

function CacheViewer() {
  const { data, isLoading } = useQuery(GC_EXAMPLE_QUERY)

  return (
    <div style={panelStyle}>
      <strong>GC Test Consumer</strong>
      <p>{isLoading ? 'Loading...' : 'Ready'}</p>
      <p>Request ID: {data?.requestId ?? '-'}</p>
      <p>Value: {data?.value ?? '-'}</p>
      <p>Fetched At: {data?.fetchedAt ?? '-'}</p>
    </div>
  )
}

export function GarbageCollectionCard() {
  const [mounted, setMounted] = useState(false)
  const { debug, logs, addLog, clearLogs } = useQueryDebugCard(GC_EXAMPLE_QUERY)

  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>5. gcTime + Garbage Collection</h2>
      <p style={descriptionStyle}>
        Unmount the consumer to start GC. Remount before the countdown ends to
        reuse cache. Remount after deletion to force a new fetch.
      </p>
      <div style={buttonRowStyle}>
        <button
          style={buttonStyle}
          onClick={() => {
            addLog(`[UI] ${mounted ? 'unmount' : 'mount'} GC consumer`)
            setMounted((value) => !value)
          }}
        >
          {mounted ? 'Unmount' : 'Remount'}
        </button>
      </div>
      <div style={badgeRowStyle}>
        <Badge tone="info">
          GC in: {debug.gcRemainingMs != null ? `${(debug.gcRemainingMs / 1000).toFixed(1)} sec` : '-'}
        </Badge>
        {!debug.isPresent ? <Badge tone="warning">cache deleted</Badge> : null}
      </div>
      {mounted ? <CacheViewer /> : <p>Consumer is unmounted.</p>}
      <DebugPanel debug={debug} />
      <LogPanel logs={logs} onClear={clearLogs} />
    </section>
  )
}
