'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { T } from '@/lib/theme'

type Week = { week: string; ingresos: number; egresos: number }

export function EvolucionSemanalChart({ data }: { data: Week[] }) {
  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      padding: 24, boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
    }}>
      <div style={{ color: T.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 4 }}>Evolución semanal</div>
      <div style={{ color: T.textSec, fontSize: 12, marginBottom: 16 }}>Últimas 8 semanas · ingresos vs egresos</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis dataKey="week" tick={{ fill: T.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: T.textMuted, fontSize: 10 }} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(1)}M`} width={52} />
          <Tooltip
            contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textPrimary, fontSize: 12 }}
            labelStyle={{ color: T.textPrimary }}
            formatter={(v, name) => [`$ ${Math.round(Number(v ?? 0)).toLocaleString('es-CL')}`, name === 'ingresos' ? 'Ingresos' : 'Egresos']}
            labelFormatter={(l) => `Semana del ${l}`}
          />
          <Bar dataKey="ingresos" fill={T.success} radius={[4, 4, 0, 0]} name="ingresos" />
          <Bar dataKey="egresos" fill={T.orange} radius={[4, 4, 0, 0]} name="egresos" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
