export default function Loading() {
  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: '#0F1A2E' }}>
      <div className="w-24 h-3 rounded animate-pulse" style={{ background: '#1D2D47' }} />
      <div className="space-y-2">
        <div className="w-16 h-3 rounded animate-pulse" style={{ background: '#1D2D47' }} />
        <div className="w-80 h-6 rounded animate-pulse" style={{ background: '#1D2D47' }} />
        <div className="w-full max-w-lg h-4 rounded animate-pulse" style={{ background: '#162138' }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4 space-y-2 animate-pulse" style={{ background: '#162138' }}>
            <div className="w-20 h-2.5 rounded" style={{ background: '#1D2D47' }} />
            <div className="w-28 h-6 rounded" style={{ background: '#1D2D47' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
