import { panelStyle, monoStyle } from './styles'
import { Badge } from './Badge'
import type { QueryDebugSnapshot } from './types'

export function DebugPanel<TData>({
  debug
}: {
  debug: QueryDebugSnapshot<TData>
}) {
  const gcSeconds =
    debug.gcRemainingMs != null ? (debug.gcRemainingMs / 1000).toFixed(1) : '-'

  return (
    <div style={panelStyle}>
      <strong>State Debug Panel</strong>
      <div style={{ display: 'grid', gap: '6px', marginTop: '10px' }}>
        <div>
          <span style={monoStyle}>status:</span> {debug.status}
        </div>
        <div>
          <span style={monoStyle}>observers:</span> {debug.observers}
        </div>
        <div>
          <span style={monoStyle}>lastFetchedAt:</span> {debug.lastFetchedAtLabel}
        </div>
        <div>
          <span style={monoStyle}>isStale:</span> {debug.freshnessLabel === 'stale' ? 'true' : 'false'}
        </div>
        <div>
          <span style={monoStyle}>hasPromise:</span> {debug.hasPromise ? 'true' : 'false'}
        </div>
        <div>
          <span style={monoStyle}>gcRemaining:</span> {gcSeconds}s
        </div>
        <div>
          <span style={monoStyle}>queryKey:</span> {debug.keyString}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Badge tone={debug.freshnessLabel === 'fresh' ? 'success' : 'warning'}>
            {debug.freshnessLabel}
          </Badge>
          <Badge tone={debug.cacheAlive ? 'info' : 'neutral'}>
            {debug.cacheAlive ? 'cache alive' : 'cache missing'}
          </Badge>
        </div>
      </div>
    </div>
  )
}
