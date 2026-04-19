import { API1_QUERY } from '@query/core'
import { useQuery } from '@query/react'
import { DebugPanel } from './DebugPanel'
import { LogPanel } from './LogPanel'
import {
  buttonRowStyle,
  buttonStyle,
  cardStyle,
  descriptionStyle,
  panelStyle,
  sectionTitleStyle
} from './styles'
import { useQueryDebugCard } from './useQueryDebugCard'

function ManualRefetchViewer() {
  const { data, error, isLoading, refetch } = useQuery(API1_QUERY)

  return (
    <div style={panelStyle}>
      <strong>Query Result</strong>
      <p>Status: {isLoading ? 'loading' : 'ready'}</p>
      <p>Request ID: {data?.requestId ?? '-'}</p>
      <p>Value: {data?.value ?? '-'}</p>
      <p>Fetched At: {data?.fetchedAt ?? '-'}</p>
      {error ? <p>Failed to fetch.</p> : null}
      <div style={buttonRowStyle}>
        <button style={buttonStyle} onClick={() => void refetch()}>
          Refetch
        </button>
      </div>
    </div>
  )
}

export function ManualRefetchCard() {
  const { debug, logs, addLog, clearLogs } = useQueryDebugCard(API1_QUERY)

  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>2. Manual Refetch</h2>
      <p style={descriptionStyle}>
        Manual refetch always triggers a new request. Watch the request id and
        random value change on each click.
      </p>
      <div style={buttonRowStyle}>
        <button style={buttonStyle} onClick={() => addLog('[UI] manual refetch button clicked')}>
          Log button click
        </button>
      </div>
      <ManualRefetchViewer />
      <DebugPanel debug={debug} />
      <LogPanel logs={logs} onClear={clearLogs} />
    </section>
  )
}
