import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page: { backgroundColor: '#fff', padding: 48, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, borderBottom: '2pt solid #E5501E', paddingBottom: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0F1A2E' },
  subtitle: { fontSize: 10, color: '#475569', marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#E5501E', textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 8, marginTop: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 9, color: '#475569', width: '40%' },
  value: { fontSize: 9, color: '#0F1A2E', width: '58%' },
  totalBox: { backgroundColor: '#0F1A2E', padding: '10 16', borderRadius: 4, marginTop: 16,
    flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 12, color: '#F0EDE8', fontWeight: 'bold' },
  totalValue: { fontSize: 14, color: '#E5501E', fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, borderTop: '1pt solid #E8E8E8',
    paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#475569' },
})

interface Props {
  propuesta: {
    id: number
    description: string
    costCenter?: { code: string; name: string } | null
    provider?: { name: string; rut: string } | null
    content: Record<string, unknown>
    createdAt: string
  }
  empresa: string
}

export function PropuestaCierrePDF({ propuesta, empresa }: Props) {
  const items = (propuesta.content.items as Array<{ descripcion: string; monto: number }>) ?? []
  const total = items.reduce((s, i) => s + i.monto, 0)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Propuesta de Cierre</Text>
            <Text style={s.subtitle}>{empresa} · {new Date(propuesta.createdAt).toLocaleDateString('es-CL')}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Información General</Text>
        <View style={s.row}>
          <Text style={s.label}>Centro de Costo</Text>
          <Text style={s.value}>{propuesta.costCenter?.code} — {propuesta.costCenter?.name ?? '—'}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Proveedor</Text>
          <Text style={s.value}>{propuesta.provider?.name ?? '—'}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>RUT Proveedor</Text>
          <Text style={s.value}>{propuesta.provider?.rut ?? '—'}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Descripción</Text>
          <Text style={s.value}>{propuesta.description}</Text>
        </View>

        <Text style={s.sectionTitle}>Detalle de Ítems</Text>
        {items.map((item, i) => (
          <View key={i} style={s.row}>
            <Text style={s.label}>{item.descripcion}</Text>
            <Text style={[s.value, { textAlign: 'right' }]}>
              $ {Math.round(item.monto).toLocaleString('es-CL')}
            </Text>
          </View>
        ))}

        <View style={s.totalBox}>
          <Text style={s.totalLabel}>TOTAL</Text>
          <Text style={s.totalValue}>$ {Math.round(total).toLocaleString('es-CL')}</Text>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>PC-{String(propuesta.id).padStart(4, '0')} · {empresa}</Text>
          <Text style={s.footerText}>Generado por Q4 Hub</Text>
        </View>
      </Page>
    </Document>
  )
}
