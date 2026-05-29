import { T } from '@/lib/theme'

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      overflow: 'hidden', boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
    }}>
      <div style={{
        padding: '12px 14px', background: T.cardHover, borderBottom: `1px solid ${T.border}`,
        height: 40,
      }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          padding: '11px 14px', borderBottom: `1px solid ${T.border}`,
          background: i % 2 === 0 ? T.card : T.cardHover,
          display: 'flex', gap: 12,
        }}>
          {Array.from({ length: 8 }).map((_, j) => (
            <div key={j} style={{
              flex: j === 3 ? 3 : 1,
              height: 14,
              background: 'linear-gradient(90deg, #F1F5F9 0%, #E2E8F0 50%, #F1F5F9 100%)',
              backgroundSize: '200% 100%',
              borderRadius: 4,
              animation: 'shimmer 1.4s ease infinite',
            }} />
          ))}
        </div>
      ))}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      ` }} />
    </div>
  )
}

export function CardSkeleton({ height = 80 }: { height?: number }) {
  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      padding: 16, height,
    }}>
      <div style={{
        height: 12, width: '40%', borderRadius: 4, marginBottom: 10,
        background: 'linear-gradient(90deg, #F1F5F9 0%, #E2E8F0 50%, #F1F5F9 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s ease infinite',
      }} />
      <div style={{
        height: 18, width: '60%', borderRadius: 4,
        background: 'linear-gradient(90deg, #F1F5F9 0%, #E2E8F0 50%, #F1F5F9 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s ease infinite',
      }} />
    </div>
  )
}
