'use client'
import {
  ComposedChart, Line, ReferenceLine, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { T } from '@/lib/theme'
import { formatCLP } from '@/lib/fmt'
import { useUmbral } from './useUmbral'

type Week = { weekLabel: string; weekStartISO: string; ingreso: number; egreso: number; running: number }

function FlujoTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Week }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 11, boxShadow: '0 2px 8px rgba(15,26,46,0.12)' }}>
      <div style={{ color: T.textPrimary, fontWeight: 700, marginBottom: 4 }}>Semana del {d.weekLabel}</div>
      <div style={{ color: T.success }}>Ingresos: {formatCLP(d.ingreso)}</div>
      <div style={{ color: T.orange }}>Egresos: {formatCLP(d.egreso)}</div>
      <div style={{ color: T.textPrimary, fontWeight: 600, marginTop: 2 }}>Saldo proyectado: {formatCLP(d.running)}</div>
    </div>
  )
}

export function ProyeccionFlujoChart({ data }: { data: Week[] }) {
  const { umbral } = useUmbral()

  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      padding: 24, boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
    }}>
      <div style={{ color: T.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 4 }}>Flujo de caja proyectado</div>
      <div style={{ color: T.textSec, fontSize: 12, marginBottom: 16 }}>
        Saldo disponible proyectado · próximas 8 semanas
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis dataKey="weekLabel" tick={{ fill: T.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: T.textMuted, fontSize: 10 }} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(1)}M`} width={56} />
          <Tooltip content={<FlujoTooltip />} />
          <ReferenceLine y={umbral} stroke={T.danger} strokeDasharray="5 4"
            label={{ value: 'Umbral', position: 'insideTopRight', fill: T.danger, fontSize: 10 }} />
          <Line
            type="monotone"
            dataKey="running"
            stroke={T.orange}
            strokeWidth={2}
            dot={(props: { cx?: number; cy?: number; index?: number; payload?: Week }) => {
              const { cx, cy, index, payload } = props
              const below = (payload?.running ?? 0) < umbral
              return (
                <circle
                  key={`dot-${index}`}
                  cx={cx} cy={cy} r={4}
                  fill={below ? T.danger : T.orange}
                  stroke="#fff" strokeWidth={1.5}
                />
              )
            }}
            activeDot={{ r: 6 }}
            name="Saldo proyectado"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
