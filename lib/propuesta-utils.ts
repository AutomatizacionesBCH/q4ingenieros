/**
 * lib/propuesta-utils.ts
 * Shared types and helpers for Propuestas de Cierre + Órdenes de Compra.
 * Safe to import in both Server (route.ts) and Client (PropuestasModule.tsx).
 */

export type DocType = 'PCE' | 'OC'

export interface PropuestaItem {
  id:           string          // filename sin .pdf (usado como doc_id en overrides)
  docType:      DocType         // 'PCE' | 'OC'
  proyectoId:   number | null
  // PCE-specific
  version?:     string
  tipo?:        string          // PAV | VER | ROT | CCL | IMIV | PRY | ARQ | EST
  locCode?:     string
  codigo:       string          // "P-212" o "OC-1792"
  // OC-specific
  ocNumber?:    string          // "1792", "787-1"
  // Common
  contraparte:  string
  proyecto:     string
  especialista: string
  comuna:       string | null
  url:          string
}

const TIPO_LABEL: Record<string, string> = {
  PAV:  'Pavimentación',
  VER:  'Veredas',
  ROT:  'Rotura y Reposición',
  CCL:  'Ciclovía',
  IMIV: 'IMIV',
  PRY:  'Proyecto',
  ARQ:  'Arquitectura',
  EST:  'Estructural',
}

export function tipoLabel(code: string): string {
  return TIPO_LABEL[code.toUpperCase()] ?? code
}
