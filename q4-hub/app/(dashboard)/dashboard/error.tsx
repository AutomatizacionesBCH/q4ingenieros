'use client'

export default function DashboardError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div style={{ padding: 40, color: '#0F1A2E' }}>
      <h2 style={{ color: '#DC2626', fontSize: 18, marginBottom: 16 }}>Error en Dashboard</h2>
      <pre style={{
        background: '#FFFFFF', padding: 20, borderRadius: 8,
        fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        border: '1px solid rgba(192,57,43,0.3)', maxWidth: 800,
      }}>
        {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
      {error.digest && (
        <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>Digest: {error.digest}</p>
      )}
    </div>
  )
}
