import { headers } from 'next/headers'

/**
 * Detecta mobile en el servidor via User-Agent
 * para SSR correcto (sin flash de desktop layout).
 */
export async function isMobileServer(): Promise<boolean> {
  const h = await headers()
  const ua = h.get('user-agent') ?? ''
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)
}
