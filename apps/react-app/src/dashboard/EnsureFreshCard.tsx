import {
  PRELOAD_EXAMPLE_QUERY,
  ensureFresh,
  getOrCreateState,
  resolveQueryConfig
} from '@query/core'
import { useQuery } from '@query/react'
import { useState } from 'react'
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

function PreloadedPage() {
  const { data, isLoading } = useQuery(PRELOAD_EXAMPLE_QUERY)

  return (
    <div style={panelStyle}>
      <strong>Page Component</strong>
      <p>{isLoading ? 'Loading...' : 'Instant data render'}</p>
      <p>Request ID: {data?.requestId ?? '-'}</p>
      <p>Value: {data?.value ?? '-'}</p>
      <p>Fetched At: {data?.fetchedAt ?? '-'}</p>
    </div>
  )
}

export function EnsureFreshCard() {
  const [pageMounted, setPageMounted] = useState(false)
  const [warmCacheReady, setWarmCacheReady] = useState(false)
  const { debug, logs, addLog, clearLogs } = useQueryDebugCard(PRELOAD_EXAMPLE_QUERY)

  async function handlePreload() {
    addLog('[UI] preload with ensureFresh')
    const config = resolveQueryConfig(
      PRELOAD_EXAMPLE_QUERY.policy,
      PRELOAD_EXAMPLE_QUERY.config
    )
    const state = getOrCreateState(PRELOAD_EXAMPLE_QUERY.key, config)
    await ensureFresh(PRELOAD_EXAMPLE_QUERY, state)
    setWarmCacheReady(true)
    addLog('[ensureFresh] preload complete, cache is warm')
  }

  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>4. ensureFresh Preload (Warm Cache)</h2>
      <p style={descriptionStyle}>
        Preload data first, then mount the page component. When the cache is
        warm and still fresh, the page can render data immediately without an
        initial loading state.
      </p>
      <div style={buttonRowStyle}>
        <button style={buttonStyle} onClick={() => void handlePreload()}>
          Preload (ensureFresh)
        </button>
        <button
          style={buttonStyle}
          onClick={() => {
            addLog(`[UI] ${pageMounted ? 'hide' : 'show'} page`)
            setPageMounted((value) => !value)
          }}
        >
          {pageMounted ? 'Hide Page' : 'Go to Page'}
        </button>
      </div>
      <div style={badgeRowStyle}>
        {warmCacheReady && debug.freshnessLabel === 'fresh' ? (
          <Badge tone="success">warm cache</Badge>
        ) : null}
        <Badge tone="info">staleTime: 5 seconds</Badge>
      </div>
      {pageMounted ? <PreloadedPage /> : <p>Page is not mounted yet.</p>}
      <DebugPanel debug={debug} />
      <LogPanel logs={logs} onClear={clearLogs} />
    </section>
  )
}
