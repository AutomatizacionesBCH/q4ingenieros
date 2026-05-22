/**
 * app/page.tsx — Phase 1 validation page
 *
 * Server Component that calls the validate endpoint and displays
 * parsed stats vs. expected control figures from CLAUDE.md §6.
 */
import Image from 'next/image'
import type { ValidationResult } from '@/types/project'

async function getValidation(): Promise<ValidationResult | null> {
  try {
    // Server-side fetch — absolute URL required in App Router server components
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${base}/api/validate`, { cache: 'no-store' })
    return res.json()
  } catch {
    return null
  }
}

const LABELS: Record<string, string> = {
  total:     'Total proyectos',
  active:    'Activos',
  finalized: 'Finalizados',
  public:    'Públicos',
  private:   'Privados',
  noScope:   'Sin ámbito',
}

export default async function HomePage() {
  const validation = await getValidation()

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-8 gap-8">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <Image
          src="/logo.jpeg"
          alt="Q4 Ingenieros"
          width={80}
          height={80}
          className="rounded-lg"
          priority
        />
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            Q4 Ingenieros
          </h1>
          <p className="text-secondary text-sm">Dashboard — Fase 1 · Validación del Parser</p>
        </div>
      </div>

      {/* Validation card */}
      <div
        className="w-full max-w-lg rounded-xl border p-6 space-y-5"
        style={{
          background: '#162138',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        {validation === null ? (
          <div className="text-center text-danger py-8">
            Error al conectar con el parser. ¿Está corriendo el servidor?
          </div>
        ) : (
          <>
            {/* Status badge */}
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  background: validation.ok ? 'rgba(61,139,94,0.15)' : 'rgba(192,57,43,0.15)',
                  color: validation.ok ? '#3D8B5E' : '#C0392B',
                  border: `1px solid ${validation.ok ? 'rgba(61,139,94,0.3)' : 'rgba(192,57,43,0.3)'}`,
                }}
              >
                <span>{validation.ok ? '✓' : '✗'}</span>
                {validation.ok ? 'Parseo validado — cifras correctas' : 'Desajuste en cifras de control'}
              </span>
            </div>

            {/* Stats table */}
            <div className="space-y-1">
              {Object.entries(LABELS).map(([key, label]) => {
                const actual = validation.stats[key as keyof typeof validation.stats]
                const expected = validation.expected[key as keyof typeof validation.expected]
                const match = actual === expected
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2 px-3 rounded-lg text-sm"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <span className="text-secondary">{label}</span>
                    <div className="flex items-center gap-3 tabular">
                      <span
                        className="font-semibold"
                        style={{ color: match ? '#F0EDE8' : '#C0392B' }}
                      >
                        {actual}
                      </span>
                      <span className="text-muted text-xs">
                        / {expected} esperado
                      </span>
                      <span style={{ color: match ? '#3D8B5E' : '#C0392B' }}>
                        {match ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Mismatches */}
            {validation.mismatches.length > 0 && (
              <div
                className="rounded-lg p-3 text-xs space-y-1"
                style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)' }}
              >
                <p className="font-medium text-danger mb-1">Desajustes:</p>
                {validation.mismatches.map((m, i) => (
                  <p key={i} className="text-danger/80 font-mono">{m}</p>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* API links */}
      <div className="flex gap-4 text-xs text-muted">
        <a href="/api/validate" target="_blank" className="hover:text-secondary transition-colors">
          /api/validate ↗
        </a>
        <a href="/api/projects" target="_blank" className="hover:text-secondary transition-colors">
          /api/projects ↗
        </a>
      </div>
    </div>
  )
}
