'use client'
import { useEffect, useState } from 'react'

export function useUF() {
  const [uf, setUF] = useState<{ value: number; date: string } | null>(null)
  useEffect(() => {
    fetch('/api/uf').then(r => r.json()).then(d => { if (d.value) setUF(d) }).catch(() => {})
  }, [])
  return uf
}
