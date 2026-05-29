import { TableSkeleton, CardSkeleton } from './Skeleton'
import { T } from '@/lib/theme'

/** Skeleton genérico para páginas de lista con KPIs arriba */
export function ListPageLoading({
  title,
  kpiCount = 4,
  tableRows = 10,
}: {
  title: string
  kpiCount?: number
  tableRows?: number
}) {
  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: T.textPrimary, fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {[80, 60, 120].map(w => (
            <div key={w} style={{
              width: w, height: 34, borderRadius: 8,
              background: 'linear-gradient(90deg, #E2E8F0 0%, #CBD5E1 50%, #E2E8F0 100%)',
              backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite',
            }} />
          ))}
        </div>
      </div>

      {/* Filtros skeleton */}
      <div style={{
        background: T.card, borderRadius: 10, border: `1px solid ${T.border}`,
        padding: '12px 16px', marginBottom: 16,
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        {[160, 160, 120, 160, 160, 160].map((w, i) => (
          <div key={i} style={{
            width: w, height: 34, borderRadius: 6,
            background: 'linear-gradient(90deg, #F1F5F9 0%, #E2E8F0 50%, #F1F5F9 100%)',
            backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite',
          }} />
        ))}
      </div>

      {/* KPI cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${kpiCount}, 1fr)`,
        gap: 14, marginBottom: 16,
      }}>
        {Array.from({ length: kpiCount }).map((_, i) => (
          <CardSkeleton key={i} height={76} />
        ))}
      </div>

      {/* Table */}
      <TableSkeleton rows={tableRows} />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      ` }} />
    </div>
  )
}

/** Skeleton para páginas simples sin KPIs */
export function SimplePageLoading({ title }: { title: string }) {
  return (
    <div style={{ padding: '24px 32px' }}>
      <h1 style={{ color: T.textPrimary, fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{title}</h1>
      <TableSkeleton rows={8} />
    </div>
  )
}

/** Skeleton para el dashboard principal */
export function DashboardPageLoading() {
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            background: '#162138', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px',
          }}>
            <div style={{ height: 11, width: '55%', borderRadius: 4, marginBottom: 10,
              background: 'linear-gradient(90deg,#1E3A5F 0%,#243d5c 50%,#1E3A5F 100%)',
              backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite' }} />
            <div style={{ height: 24, width: '70%', borderRadius: 4,
              background: 'linear-gradient(90deg,#1E3A5F 0%,#243d5c 50%,#1E3A5F 100%)',
              backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        <div style={{ background: '#162138', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', height: 260 }} />
        <div style={{ background: '#162138', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', height: 260 }} />
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      ` }} />
    </div>
  )
}
