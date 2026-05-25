/**
 * lib/propuesta-utils.ts
 * Shared types and helpers for Propuestas de Cierre.
 * Safe to import in both Server (route.ts) and Client (PropuestasModule.tsx).
 */

export interface PropuestaItem {
  id:          string
  proyectoId:  number | null
  version:     string
  tipo:        string
  locCode:     string
  contraparte: string
  proyecto:    string
  especialista:string
  comuna:      string | null
  codigo:      string
  fecha:       string | null
  url:         string
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
