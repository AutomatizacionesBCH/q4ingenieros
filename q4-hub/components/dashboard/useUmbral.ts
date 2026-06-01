'use client'
import { useCallback, useEffect, useState } from 'react'

const KEY = 'q4:flujoUmbral'
const DEFAULT = 10_000_000
const EVENT = 'q4-umbral-change'

/**
 * Configurable cash-flow alert threshold, persisted per-browser in localStorage.
 * Shared across the hero chart and the alert panel via a custom window event so
 * an edit in one updates the other instantly (no server round-trip, no DB).
 * `mounted` guards against SSR hydration mismatch on the umbral value.
 */
export function useUmbral() {
  const [umbral, setUmbralState] = useState<number>(DEFAULT)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const read = () => {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null
      const n = raw != null ? Number(raw) : NaN
      // Accept 0 (a valid "alert only if cash goes negative" config); the write guard
      // also accepts >= 0, so a saved 0 must survive reloads.
      setUmbralState(Number.isFinite(n) && n >= 0 ? n : DEFAULT)
    }
    read()
    window.addEventListener(EVENT, read)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener(EVENT, read)
      window.removeEventListener('storage', read)
    }
  }, [])

  const setUmbral = useCallback((n: number) => {
    if (typeof window === 'undefined' || !Number.isFinite(n) || n < 0) return
    window.localStorage.setItem(KEY, String(Math.round(n)))
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return { umbral, setUmbral, mounted }
}
