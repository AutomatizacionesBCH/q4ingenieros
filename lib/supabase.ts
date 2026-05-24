import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Lazy Supabase client — created on first request, NOT at module load time.
 * This prevents Next.js from crashing during `npm run build` when env vars
 * are only available at runtime (EasyPanel injects them as runtime env, not
 * as Docker build args).
 */
let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (_client) return _client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars — set SUPABASE_URL and SUPABASE_SERVICE_KEY in EasyPanel.',
    )
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return _client
}
