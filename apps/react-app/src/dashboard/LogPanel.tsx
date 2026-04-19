import { panelStyle, logListStyle } from './styles'
import type { LogEntry } from './types'

export function LogPanel({
  logs,
  onClear
}: {
  logs: LogEntry[]
  onClear: () => void
}) {
  return (
    <div style={panelStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}
      >
        <strong>Logs</strong>
        <button onClick={onClear}>Clear</button>
      </div>
      {logs.length === 0 ? <p style={{ margin: 0 }}>No logs yet.</p> : null}
      {logs.length > 0 ? (
        <ol style={logListStyle}>
          {logs.map((log) => (
            <li key={log.id}>{log.message}</li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}
