/**
 * Design tokens — light mode central, dark sidebar.
 * Inspirado en el dashboard de Q4 Ingenieros.
 */

export const T = {
  // Sidebar (queda dark navy)
  sidebar: '#0F1A2E',
  sidebarBorder: 'rgba(255,255,255,0.07)',
  sidebarText: '#F0EDE8',
  sidebarDim: '#8A9BB8',
  sidebarMuted: '#5A7090',
  sidebarActive: 'rgba(229,80,30,0.13)',

  // Centro — light
  canvas:        '#F0F2F6',
  card:          '#FFFFFF',
  cardHover:     '#F8FAFC',
  border:        '#E2E8F0',
  borderStrong:  '#CBD5E1',

  textPrimary:   '#0F1A2E',
  textSec:       '#475569',
  textMuted:     '#94A3B8',

  // Accent
  orange:        '#E5501E',
  orangeFaint:   'rgba(229, 80, 30, 0.08)',
  orangeBorder:  'rgba(229, 80, 30, 0.22)',

  // Status colors
  success:       '#16A34A',
  successBg:     '#F0FDF4',
  successBorder: '#BBF7D0',
  warning:       '#CA8A04',
  warningBg:     '#FEFCE8',
  warningBorder: '#FDE68A',
  danger:        '#DC2626',
  dangerBg:      '#FEF2F2',
  dangerBorder:  '#FECACA',
  neutralBg:     '#F1F5F9',
  neutralBorder: '#E2E8F0',

  // Field bg (inputs)
  field:         '#FFFFFF',
  fieldFocus:    '#F8FAFC',
} as const

export const STATUS_COLOR: Record<string, { fg: string; bg: string; bd: string }> = {
  PAGADO:    { fg: T.success, bg: T.successBg, bd: T.successBorder },
  PENDIENTE: { fg: T.warning, bg: T.warningBg, bd: T.warningBorder },
  NULO:      { fg: T.textMuted, bg: T.neutralBg, bd: T.neutralBorder },
  ACTIVA:    { fg: T.success, bg: T.successBg, bd: T.successBorder },
  CERRADA:   { fg: T.textMuted, bg: T.neutralBg, bd: T.neutralBorder },
  CANCELADA: { fg: T.danger, bg: T.dangerBg, bd: T.dangerBorder },
  BORRADOR:  { fg: T.textMuted, bg: T.neutralBg, bd: T.neutralBorder },
  ENVIADA:   { fg: T.warning, bg: T.warningBg, bd: T.warningBorder },
  ACEPTADA:  { fg: T.success, bg: T.successBg, bd: T.successBorder },
  INGRESO:   { fg: T.success, bg: T.successBg, bd: T.successBorder },
  EGRESO:    { fg: T.danger, bg: T.dangerBg, bd: T.dangerBorder },
}
