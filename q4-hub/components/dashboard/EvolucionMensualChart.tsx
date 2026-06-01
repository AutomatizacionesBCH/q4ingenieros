'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { T } from '@/lib/theme'

type Month = { month: string; key: string; ingresos: number; egresos: number }

export function EvolucionMensualChart({ data, highlightMonth }: { data: Month[]; highlightMonth?: string }) {
  // Only dim other bars when the highlighted month is actually in range; otherwise a
  // selected month outside the 12-month window would grey out every bar.
  const hasHighlight = !!highlightMonth && data.some(d => d.key === highlightMonth)
  const dim = (key: string) => (hasHighlight && key !== highlightMonth ? 0.45 : 1)
  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      padding: 24, boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
    }}>
      <div style={{ color: T.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 4 }}>Evolución mensual</div>
      <div style={{ color: T.textSec, fontSize: 12, marginBottom: 16 }}>Últimos 12 meses · ingresos vs egresos</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis dataKey="month" tick={{ fill: T.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: T.textMuted, fontSize: 10 }} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(1)}M`} width={52} />
          <Tooltip
            contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textPrimary, fontSize: 12 }}
            labelStyle={{ color: T.textPrimary }}
            formatter={(v, name) => [`$ ${Math.round(Number(v ?? 0)).toLocaleString('es-CL')}`, name === 'ingresos' ? 'Ingresos' : 'Egresos']}
          />
          <Bar dataKey="ingresos" radius={[4, 4, 0, 0]} name="ingresos">
            {data.map(d => (
              <Cell key={`i-${d.key}`} fill={T.success} fillOpacity={dim(d.key)} />
            ))}
          </Bar>
          <Bar dataKey="egresos" radius={[4, 4, 0, 0]} name="egresos">
            {data.map(d => (
              <Cell key={`e-${d.key}`} fill={T.orange} fillOpacity={dim(d.key)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
