'use client'
import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    window.location.href = '/dashboard'
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0F1A2E',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#162138', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: '40px 36px', width: 360,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Image src="/logo.jpeg" alt="Q4" width={52} height={52}
            style={{ borderRadius: 10, marginBottom: 12 }} />
          <div style={{ color: '#F0EDE8', fontSize: 18, fontWeight: 700 }}>Q4 Hub</div>
          <div style={{ color: '#5A7090', fontSize: 13, marginTop: 4 }}>Novarso · IDQ4</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ color: '#8A9BB8', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required style={{
                display: 'block', width: '100%', marginTop: 6,
                background: '#1D2D47', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '10px 12px', color: '#F0EDE8',
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ color: '#8A9BB8', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Contraseña
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required style={{
                display: 'block', width: '100%', marginTop: 6,
                background: '#1D2D47', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '10px 12px', color: '#F0EDE8',
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          {error && <div style={{ color: '#C0392B', fontSize: 13 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{
            marginTop: 8, background: loading ? '#5A7090' : '#E5501E',
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '12px 0', fontSize: 14, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
