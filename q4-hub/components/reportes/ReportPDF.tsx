import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page: { backgroundColor: '#fff', padding: 32, fontFamily: 'Helvetica', fontSize: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 18, borderBottom: '2pt solid #E5501E', paddingBottom: 12 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#0F1A2E' },
  subtitle: { fontSize: 9, color: '#64748B', marginTop: 2 },
  meta: { fontSize: 8, color: '#94A3B8', textAlign: 'right' },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#E5501E',
    textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  kpiGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kpiBox: { flex: 1, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 4,
    border: '1pt solid #E2E8F0' },
  kpiLabel: { fontSize: 7, color: '#64748B', textTransform: 'uppercase' },
  kpiValue: { fontSize: 11, color: '#0F1A2E', fontWeight: 'bold', marginTop: 3 },
  th: { backgroundColor: '#F8FAFC', padding: 5, color: '#475569', fontWeight: 'bold',
    fontSize: 7, textTransform: 'uppercase', borderBottom: '1pt solid #E2E8F0' },
  td: { padding: 5, color: '#0F1A2E', fontSize: 8, borderBottom: '0.5pt solid #E2E8F0' },
  row: { flexDirection: 'row' },
  footer: { position: 'absolute', bottom: 16, left: 32, right: 32,
    borderTop: '1pt solid #E2E8F0', paddingTop: 6,
    flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#94A3B8' },
})

export type ReportColumn = {
  key: string
  label: string
  flex?: number
  align?: 'left' | 'right' | 'center'
  format?: 'money' | 'date' | 'text'
}

export type ReportData = {
  title: string
  subtitle?: string
  kpis?: { label: string; value: string }[]
  columns: ReportColumn[]
  rows: Record<string, string | number | null | undefined>[]
  meta?: string
}

function fmt(v: unknown, kind?: 'money' | 'date' | 'text'): string {
  if (v == null || v === '') return '—'
  if (kind === 'money') return '$ ' + Math.round(Number(v)).toLocaleString('es-CL')
  if (kind === 'date') {
    const d = new Date(v as string)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  return String(v).slice(0, 60)
}

export function ReportPDF({ data }: { data: ReportData }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>{data.title}</Text>
            {data.subtitle && <Text style={s.subtitle}>{data.subtitle}</Text>}
          </View>
          <View>
            <Text style={s.meta}>Generado: {new Date().toLocaleString('es-CL')}</Text>
            <Text style={s.meta}>Q4 Hub · {data.rows.length} registros</Text>
          </View>
        </View>

        {data.kpis && data.kpis.length > 0 && (
          <View style={s.kpiGrid}>
            {data.kpis.map(k => (
              <View key={k.label} style={s.kpiBox}>
                <Text style={s.kpiLabel}>{k.label}</Text>
                <Text style={s.kpiValue}>{k.value}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.sectionTitle}>Detalle</Text>

        <View style={s.row}>
          {data.columns.map(c => (
            <View key={c.key} style={[s.th, { flex: c.flex ?? 1, textAlign: c.align ?? 'left' } as never]}>
              <Text style={{ textAlign: c.align ?? 'left' }}>{c.label}</Text>
            </View>
          ))}
        </View>

        {data.rows.map((r, i) => (
          <View key={i} style={[s.row, { backgroundColor: i % 2 === 0 ? '#fff' : '#F8FAFC' } as never]}>
            {data.columns.map(c => (
              <View key={c.key} style={[s.td, { flex: c.flex ?? 1 } as never]}>
                <Text style={{ textAlign: c.align ?? 'left' }}>{fmt(r[c.key], c.format)}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{data.meta ?? ''}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
