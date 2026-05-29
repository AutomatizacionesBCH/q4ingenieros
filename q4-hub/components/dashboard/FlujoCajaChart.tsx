'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { T } from '@/lib/theme'

type MonthData = { month: string; ingresos: number; egresos: number }

export function FlujoCajaChart() {
  const [data, setData] = useState<MonthData[]>([])

  useEffect(() => {
    fetch('/api/dashboard/flujo-mensual')
      .then(r => r.json()).then(setData).catch(() => {})
  }, [])

  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      padding: 24, boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
    }}>
      <div style={{ color: T.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 20 }}>Flujo de Caja Mensual</div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis dataKey="month" tick={{ fill: T.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: T.textMuted, fontSize: 10 }} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(1)}M`} />
          <Tooltip
            contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textPrimary }}
            labelStyle={{ color: T.textPrimary }}
            formatter={(v) => [`$ ${Math.round(Number(v ?? 0)).toLocaleString('es-CL')}`, '']}
          />
          <Bar dataKey="ingresos" fill={T.success} radius={[4, 4, 0, 0]} name="Ingresos" />
          <Bar dataKey="egresos" fill={T.orange} radius={[4, 4, 0, 0]} name="Egresos" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
