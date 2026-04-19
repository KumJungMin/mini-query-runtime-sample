import type { CSSProperties } from 'react'

export const appStyle: CSSProperties = {
  minHeight: '100vh',
  background: '#f7f7f7',
  padding: '24px',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: '#1f2937'
}

export const headerStyle: CSSProperties = {
  marginBottom: '24px'
}

export const gridStyle: CSSProperties = {
  display: 'grid',
  gap: '16px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  alignItems: 'start'
}

export const cardStyle: CSSProperties = {
  background: '#fff',
  padding: '16px',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  display: 'grid',
  gap: '12px'
}

export const buttonRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px'
}

export const buttonStyle: CSSProperties = {
  border: '1px solid #d1d5db',
  background: '#fff',
  borderRadius: '10px',
  padding: '8px 12px',
  cursor: 'pointer'
}

export const subtleButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: '#f9fafb'
}

export const badgeRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px'
}

export const panelStyle: CSSProperties = {
  background: '#f9fafb',
  borderRadius: '10px',
  padding: '12px'
}

export const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '1.1rem'
}

export const descriptionStyle: CSSProperties = {
  margin: 0,
  color: '#4b5563',
  lineHeight: 1.5
}

export const logListStyle: CSSProperties = {
  margin: 0,
  paddingLeft: '18px',
  display: 'grid',
  gap: '6px',
  fontSize: '0.9rem'
}

export const monoStyle: CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
}
