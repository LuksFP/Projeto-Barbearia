import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Cliente separado para o contexto público (clientes das barbearias que fazem login
// no site landing, NÃO os donos de barbearia que usam o dashboard SaaS).
//
// storageKey diferente = sessão isolada da sessão do dashboard.
// Isso evita que um logout de cliente derrube a sessão do dono no dashboard.
export const supabasePublic = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'barberos_public_auth',
  },
})
