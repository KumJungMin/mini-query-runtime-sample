import type { CSSProperties, PropsWithChildren } from 'react'

export function Badge({
  children,
  tone = 'neutral'
}: PropsWithChildren<{ tone?: 'neutral' | 'success' | 'warning' | 'info' }>) {
  const backgroundMap: Record<string, string> = {
    neutral: '#e5e7eb',
    success: '#d1fae5',
    warning: '#fef3c7',
    info: '#dbeafe'
  }

  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '4px 10px',
    fontSize: '0.85rem',
    background: backgroundMap[tone],
    color: '#111827'
  }

  return <span style={style}>{children}</span>
}
