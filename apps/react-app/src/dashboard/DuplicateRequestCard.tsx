import { useState } from 'react'
import { DEDUPE_EXAMPLE_QUERY } from '@query/core'
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
  sectionTitleStyle
} from './styles'
import { useQueryDebugCard } from './useQueryDebugCard'

function SharedConsumer({ title }: { title: string }) {
  const { data, isLoading } = useQuery(DEDUPE_EXAMPLE_QUERY)

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px' }}>
      <strong>{title}</strong>
      <p>{isLoading ? 'Waiting for shared request...' : `Value: ${data?.value ?? '-'}`}</p>
      <p>Request ID: {data?.requestId ?? '-'}</p>
    </div>
  )
}

export function DuplicateRequestCard() {
  const [mounted, setMounted] = useState(false)
  const { debug, logs, addLog, clearLogs } = useQueryDebugCard(DEDUPE_EXAMPLE_QUERY)

  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>1. Duplicate Request Prevention</h2>
      <p style={descriptionStyle}>
        Mount two components with the same query. Only one fetch should happen,
        and both components should render the same value.
      </p>
      <div style={buttonRowStyle}>
        <button
          style={buttonStyle}
          onClick={() => {
            addLog('[UI] mount two consumers')
            setMounted(true)
          }}
        >
          Mount Components
        </button>
        <button
          style={buttonStyle}
          onClick={() => {
            addLog('[UI] unmount both consumers')
            setMounted(false)
          }}
        >
          Unmount
        </button>
      </div>
      <div style={badgeRowStyle}>
        <Badge tone="info">Expected: one fetch log</Badge>
        <Badge tone="info">Expected: same value</Badge>
      </div>
      {mounted ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          <SharedConsumer title="TestA" />
          <SharedConsumer title="TestB" />
        </div>
      ) : (
        <p>Consumers are not mounted.</p>
      )}
      <DebugPanel debug={debug} />
      <LogPanel logs={logs} onClear={clearLogs} />
    </section>
  )
}
