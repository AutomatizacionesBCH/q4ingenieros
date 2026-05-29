'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

type Row = { mes: string; ingresos: number; egresos: number }

export function FlujoCecoChart({ cecoId }: { cecoId: number }) {
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/flujo-ceco/${cecoId}`)
      .then(r => r.json())
      .then((d: Row[]) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [cecoId])

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.08)', padding: 24, height: 360 }}>
      <div style={{
        color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 14,
      }}>Flujo mensual</div>
      {loading ? (
        <div style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', paddingTop: 80 }}>Cargando…</div>
      ) : data.length === 0 ? (
        <div style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', paddingTop: 80 }}>
          Sin movimientos registrados
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="mes" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(1)}M`} />
            <Tooltip
              contentStyle={{ background: '#F8FAFC', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              labelStyle={{ color: '#0F1A2E' }}
              formatter={(v) => [`$ ${Math.round(Number(v ?? 0)).toLocaleString('es-CL')}`, '']}
            />
            <Legend wrapperStyle={{ color: '#475569', fontSize: 11 }} />
            <Bar dataKey="ingresos" fill="#16A34A" radius={[4, 4, 0, 0]} name="Ingresos" />
            <Bar dataKey="egresos" fill="#E5501E" radius={[4, 4, 0, 0]} name="Egresos" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
