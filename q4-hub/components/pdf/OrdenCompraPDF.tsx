import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

// Datos fijos de las empresas propias
const EMPRESA_DATA: Record<string, {
  razonSocial: string; rut: string; direccion: string; ciudad: string
  contacto: string; correo: string; telefono: string
}> = {
  Q4: {
    razonSocial: 'Q4 Ingenieros Limitada',
    rut: '77.505.289-9',
    direccion: 'Amanda Labarca 124, Oficina 201',
    ciudad: 'Santiago',
    contacto: 'Gabriela Arriagada',
    correo: 'garriagada@q4ingenieros.cl',
    telefono: '971594791',
  },
  Nobarzo: {
    razonSocial: 'Nobarzo SpA',
    rut: '76.000.001-1',
    direccion: 'Amanda Labarca 124, Oficina 201',
    ciudad: 'Santiago',
    contacto: 'Gabriela Arriagada',
    correo: 'gerencia@nobarzo.cl',
    telefono: '971594791',
  },
}

function resolveEmpresa(companyName: string) {
  if (companyName.toLowerCase().includes('nobarzo')) return EMPRESA_DATA.Nobarzo
  return EMPRESA_DATA.Q4
}

export type OCPDFData = {
  id: number
  createdAt: string
  description: string
  total: number
  retencion?: number | null
  projectNumber?: string | null
  solicitadoPor?: string | null
  gerencia?: string | null
  cotizacionNum?: string | null
  condicionPago?: string | null
  tipoMoneda: string
  status: string
  company: { name: string; rut: string }
  costCenter?: { code: string; name: string } | null
  provider?: {
    name: string; rut: string
    address?: string | null; city?: string | null
    contactName?: string | null; email?: string | null; phone?: string | null
  } | null
  logoBase64?: string
}

const NAVY = '#0F1A2E'
const HEADER_BG = '#2C3E50'
const LABEL_BG = '#1A2942'
const LIGHT = '#F0F2F6'
const BORDER = '#CBD5E1'
const ORANGE = '#E5501E'
const WHITE = '#FFFFFF'

const st = StyleSheet.create({
  page: { backgroundColor: WHITE, fontFamily: 'Helvetica', fontSize: 9, color: NAVY },

  // Top header row
  topRow: { flexDirection: 'row', marginBottom: 6 },
  logoBox: { flex: 1, paddingRight: 8 },
  logo: { height: 48, objectFit: 'contain', objectPositionX: 'left' },
  logoFallback: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: NAVY },
  ocBox: { width: 210, border: `1pt solid ${BORDER}` },
  ocTitle: {
    backgroundColor: HEADER_BG, color: WHITE,
    fontFamily: 'Helvetica-Bold', fontSize: 10,
    textAlign: 'center', padding: '5 0',
  },
  ocGrid: { flexDirection: 'row' },
  ocLabel: {
    width: '40%', backgroundColor: LABEL_BG, color: WHITE,
    fontFamily: 'Helvetica-Bold', padding: '4 6', fontSize: 9,
  },
  ocValue: { flex: 1, padding: '4 6', fontSize: 9, color: NAVY },

  // Section blocks (empresa / proveedor)
  sectionHeader: {
    backgroundColor: HEADER_BG, color: WHITE,
    fontFamily: 'Helvetica-Bold', fontSize: 9,
    textAlign: 'center', padding: '4 0', marginTop: 6,
  },
  infoRow: { flexDirection: 'row', borderBottom: `0.5pt solid ${BORDER}` },
  infoLabel: {
    width: 90, backgroundColor: LABEL_BG, color: WHITE,
    fontFamily: 'Helvetica-Bold', padding: '3 6', fontSize: 8,
  },
  infoValue: { flex: 1, padding: '3 6', fontSize: 8, color: NAVY, backgroundColor: WHITE },

  // Meta bar (solicitado por, gerencia, ceco, etc.)
  metaRow: { flexDirection: 'row', marginTop: 8, border: `0.5pt solid ${BORDER}` },
  metaCell: { flex: 1, borderRight: `0.5pt solid ${BORDER}` },
  metaLabel: {
    backgroundColor: LABEL_BG, color: WHITE, fontFamily: 'Helvetica-Bold',
    fontSize: 7, padding: '3 5', textAlign: 'center',
  },
  metaValue: { padding: '4 5', fontSize: 8, color: NAVY, minHeight: 20 },
  metaCellLast: { flex: 1 },

  // Items table
  table: { marginTop: 10, border: `0.5pt solid ${BORDER}` },
  tableHead: { flexDirection: 'row', backgroundColor: LABEL_BG },
  thCode: { width: 55, color: WHITE, fontFamily: 'Helvetica-Bold', fontSize: 7, padding: '4 5', borderRight: `0.5pt solid ${BORDER}` },
  thDesc: { flex: 1, color: WHITE, fontFamily: 'Helvetica-Bold', fontSize: 7, padding: '4 5', borderRight: `0.5pt solid ${BORDER}` },
  thUm: { width: 32, color: WHITE, fontFamily: 'Helvetica-Bold', fontSize: 7, padding: '4 5', textAlign: 'center', borderRight: `0.5pt solid ${BORDER}` },
  thQty: { width: 45, color: WHITE, fontFamily: 'Helvetica-Bold', fontSize: 7, padding: '4 5', textAlign: 'right', borderRight: `0.5pt solid ${BORDER}` },
  thBruto: { width: 58, color: WHITE, fontFamily: 'Helvetica-Bold', fontSize: 7, padding: '4 5', textAlign: 'right', borderRight: `0.5pt solid ${BORDER}` },
  thRet: { width: 58, color: WHITE, fontFamily: 'Helvetica-Bold', fontSize: 7, padding: '4 5', textAlign: 'right', borderRight: `0.5pt solid ${BORDER}` },
  thLiq: { width: 58, color: WHITE, fontFamily: 'Helvetica-Bold', fontSize: 7, padding: '4 5', textAlign: 'right' },

  tableRow: { flexDirection: 'row', borderTop: `0.5pt solid ${BORDER}`, minHeight: 80 },
  tdCode: { width: 55, padding: '4 5', borderRight: `0.5pt solid ${BORDER}`, fontSize: 8 },
  tdDesc: { flex: 1, padding: '4 5', borderRight: `0.5pt solid ${BORDER}`, fontSize: 8 },
  tdUm: { width: 32, padding: '4 5', textAlign: 'center', borderRight: `0.5pt solid ${BORDER}`, fontSize: 8 },
  tdQty: { width: 45, padding: '4 5', textAlign: 'right', borderRight: `0.5pt solid ${BORDER}`, fontSize: 8 },
  tdBruto: { width: 58, padding: '4 5', textAlign: 'right', borderRight: `0.5pt solid ${BORDER}`, fontSize: 8 },
  tdRet: { width: 58, padding: '4 5', textAlign: 'right', borderRight: `0.5pt solid ${BORDER}`, fontSize: 8 },
  tdLiq: { width: 58, padding: '4 5', textAlign: 'right', fontSize: 8 },

  noteText: { fontSize: 7, color: ORANGE, fontFamily: 'Helvetica-Bold', marginTop: 6 },

  // Totals
  totalsArea: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  totalsBox: { width: 220, border: `0.5pt solid ${BORDER}` },
  totalRow: { flexDirection: 'row', borderBottom: `0.5pt solid ${BORDER}` },
  totalLabel: {
    flex: 1, backgroundColor: LABEL_BG, color: WHITE,
    fontFamily: 'Helvetica-Bold', fontSize: 8, padding: '3 6',
  },
  totalValue: { width: 60, padding: '3 6', fontSize: 8, textAlign: 'right', fontFamily: 'Helvetica-Bold' },

  // Footer
  footerRow: { flexDirection: 'row', marginTop: 28, justifyContent: 'flex-end' },
  signBox: { width: 160, alignItems: 'center' },
  signLine: { borderTop: `1pt solid ${NAVY}`, width: '100%', marginBottom: 4 },
  signLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'center' },
})

function fmt(n: number, moneda: string): string {
  if (moneda === 'UF') return n.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 })
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export function OrdenCompraPDF({ oc }: { oc: OCPDFData }) {
  const empresa = resolveEmpresa(oc.company.name)
  const liquido = oc.total - (oc.retencion ?? 0)
  const moneda = oc.tipoMoneda

  return (
    <Document>
      <Page size="A4" style={st.page} wrap={false}>
        {/* TOP ROW: Logo | OC Box */}
        <View style={st.topRow}>
          <View style={st.logoBox}>
            {oc.logoBase64 ? (
              <Image style={st.logo} src={`data:image/jpeg;base64,${oc.logoBase64}`} />
            ) : (
              <Text style={st.logoFallback}>GRUPO Q4</Text>
            )}
          </View>
          <View style={st.ocBox}>
            <Text style={st.ocTitle}>ORDEN DE COMPRA</Text>
            <View style={st.ocGrid}>
              <Text style={st.ocLabel}>Correlativo N°</Text>
              <Text style={st.ocValue}>{String(oc.id).padStart(4, '0')}</Text>
            </View>
            <View style={st.ocGrid}>
              <Text style={st.ocLabel}>Fecha</Text>
              <Text style={st.ocValue}>{fmtDate(oc.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* EMPRESA SOLICITANTE */}
        <Text style={st.sectionHeader}>EMPRESA SOLICITANTE</Text>
        {[
          ['RAZÓN SOCIAL', empresa.razonSocial],
          ['RUT', empresa.rut],
          ['DIRECCIÓN', empresa.direccion],
          ['CIUDAD', empresa.ciudad],
          ['CONTACTO', empresa.contacto],
          ['CORREO', empresa.correo],
          ['TELÉFONO', empresa.telefono],
        ].map(([label, value]) => (
          <View key={label} style={st.infoRow}>
            <Text style={st.infoLabel}>{label}</Text>
            <Text style={st.infoValue}>{value}</Text>
          </View>
        ))}

        {/* PROVEEDOR */}
        <Text style={st.sectionHeader}>PROVEEDOR</Text>
        {[
          ['RAZÓN SOCIAL', oc.provider?.name ?? '—'],
          ['RUT', oc.provider?.rut ?? '—'],
          ['DIRECCIÓN', oc.provider?.address ?? '—'],
          ['CIUDAD', oc.provider?.city ?? '—'],
          ['CONTACTO', oc.provider?.contactName ?? oc.provider?.name ?? '—'],
          ['CORREO', oc.provider?.email ?? '—'],
          ['TELÉFONO', oc.provider?.phone ?? '—'],
        ].map(([label, value]) => (
          <View key={label} style={st.infoRow}>
            <Text style={st.infoLabel}>{label}</Text>
            <Text style={st.infoValue}>{value}</Text>
          </View>
        ))}

        {/* META BAR */}
        <View style={st.metaRow}>
          {[
            { label: 'SOLICITADO POR', value: oc.solicitadoPor ?? '—' },
            { label: 'GERENCIA', value: oc.gerencia ?? '—' },
            { label: 'CENTRO DE COSTO', value: oc.costCenter ? `${oc.costCenter.name}` : '—' },
            { label: 'COTIZACIÓN N°', value: oc.cotizacionNum ?? '—' },
            { label: 'CONDICIÓN DE PAGO', value: oc.condicionPago ?? '—' },
            { label: 'TIPO MONEDA', value: moneda },
          ].map((cell, idx, arr) => (
            <View key={cell.label} style={idx < arr.length - 1 ? st.metaCell : st.metaCellLast}>
              <Text style={st.metaLabel}>{cell.label}</Text>
              <Text style={st.metaValue}>{cell.value}</Text>
            </View>
          ))}
        </View>

        {/* ITEMS TABLE */}
        <View style={st.table}>
          <View style={st.tableHead}>
            <Text style={st.thCode}>CÓDIGO</Text>
            <Text style={st.thDesc}>DESCRIPCIÓN PRODUCTO/SERVICIO</Text>
            <Text style={st.thUm}>UM</Text>
            <Text style={st.thQty}>CANTIDAD</Text>
            <Text style={st.thBruto}>BRUTO ({moneda})</Text>
            <Text style={st.thRet}>RETENCIÓN ({moneda})</Text>
            <Text style={st.thLiq}>LÍQUIDO ({moneda})</Text>
          </View>
          <View style={st.tableRow}>
            <Text style={st.tdCode}>{oc.projectNumber ?? ''}</Text>
            <View style={st.tdDesc}>
              <Text>{oc.description}</Text>
              <Text style={st.noteText}>
                {'\n'}SE RECIBEN LAS BOLETAS DE HONORARIOS Y/O FACTURAS A MÁS TARDAR EL DÍA MIÉRCOLES DE LA SEMANA DEL PAGO.
              </Text>
            </View>
            <Text style={st.tdUm}>un</Text>
            <Text style={st.tdQty}>1,0</Text>
            <Text style={st.tdBruto}>{fmt(oc.total, moneda)}</Text>
            <Text style={st.tdRet}>{fmt(oc.retencion ?? 0, moneda)}</Text>
            <Text style={st.tdLiq}>{fmt(liquido, moneda)}</Text>
          </View>
        </View>

        {/* TOTALS */}
        <View style={st.totalsArea}>
          <View style={st.totalsBox}>
            <View style={st.totalRow}>
              <Text style={st.totalLabel}>TOTAL BRUTO ({moneda})</Text>
              <Text style={st.totalValue}>{fmt(oc.total, moneda)}</Text>
            </View>
            <View style={st.totalRow}>
              <Text style={st.totalLabel}>RETENCIÓN ({moneda})</Text>
              <Text style={st.totalValue}>{fmt(oc.retencion ?? 0, moneda)}</Text>
            </View>
            <View style={{ ...st.totalRow, borderBottom: 'none' }}>
              <Text style={st.totalLabel}>TOTAL LÍQUIDO ({moneda})</Text>
              <Text style={st.totalValue}>{fmt(liquido, moneda)}</Text>
            </View>
          </View>
        </View>

        {/* SIGNATURE */}
        <View style={st.footerRow}>
          <View style={st.signBox}>
            <View style={{ height: 36 }} />
            <View style={st.signLine} />
            <Text style={st.signLabel}>AUTORIZADO POR:</Text>
            <Text style={{ ...st.signLabel, marginTop: 2 }}>GERENTE GENERAL</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
