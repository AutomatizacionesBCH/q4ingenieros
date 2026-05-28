'use client'
import { useEffect, useState } from 'react'

export function useIsMobile() {
  const [is, setIs] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIs(mq.matches)
    const h = (e: MediaQueryListEvent) => setIs(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return is
}
