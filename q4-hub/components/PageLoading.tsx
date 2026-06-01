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
  const block = (style: React.CSSProperties) => ({
    ...style,
    background: 'linear-gradient(90deg, #E2E8F0 0%, #CBD5E1 50%, #E2E8F0 100%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite',
  })
  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ color: T.textPrimary, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
      <div style={{ height: 14, width: 280, borderRadius: 4, marginBottom: 18, ...block({}) }} />

      {/* Filtros */}
      <div style={{ height: 75, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 20 }} />

      {/* HERO */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, height: 330 }} />
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, height: 330 }} />
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[0, 1, 2, 3].map(i => <CardSkeleton key={i} height={92} />)}
      </div>

      {/* Two rows of paired panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, height: 280 }} />
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, height: 280 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, height: 280 }} />
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, height: 280 }} />
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
