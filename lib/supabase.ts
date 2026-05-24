import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client using the service role key.
 * - Bypasses Row Level Security (safe: only used in API routes, never in the browser)
 * - Env vars set in EasyPanel: SUPABASE_URL + SUPABASE_SERVICE_KEY
 */
export const supabase = createClient(
  process.env.SUPABASE_URL     ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? '',
  {
    auth: {
      persistSession:   false,
      autoRefreshToken: false,
    },
  },
)
