'use client'

export default function DashboardError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div style={{ padding: 40, color: '#F0EDE8' }}>
      <h2 style={{ color: '#C0392B', fontSize: 18, marginBottom: 16 }}>Error en Dashboard</h2>
      <pre style={{
        background: '#162138', padding: 20, borderRadius: 8,
        fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        border: '1px solid rgba(192,57,43,0.3)', maxWidth: 800,
      }}>
        {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
      {error.digest && (
        <p style={{ color: '#5A7090', fontSize: 12, marginTop: 8 }}>Digest: {error.digest}</p>
      )}
    </div>
  )
}
