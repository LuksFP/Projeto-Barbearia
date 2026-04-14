// User Service — login público da barbearia
// Usa cliente Supabase separado (supabasePublic) para não conflitar com
// a sessão do dashboard SaaS (SaasAccountContext usa o cliente principal).
import { supabasePublic } from '@/lib/supabase-public'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export type UserRole = 'client' | 'admin' | 'subscription'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt?: string
}

export interface UserCredentials {
  email: string
  password: string
}

function mapUser(u: SupabaseUser): User {
  return {
    id: u.id,
    name: (u.user_metadata?.name as string | undefined) ?? u.email ?? '',
    email: u.email ?? '',
    role: ((u.user_metadata?.role as UserRole | undefined) ?? 'client'),
    createdAt: u.created_at,
  }
}

export const userService = {
  async getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabasePublic.auth.getSession()
    if (!session) return null
    return mapUser(session.user)
  },

  async login(credentials: UserCredentials): Promise<User | null> {
    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })
    if (error || !data.user) return null
    return mapUser(data.user)
  },

  async logout(): Promise<void> {
    await supabasePublic.auth.signOut()
  },

  // Admin — não disponível no cliente público
  async getAll(): Promise<User[]> {
    return []
  },

  async updateRole(_userId: string, _role: UserRole): Promise<User | null> {
    return null
  },

  async getById(_id: string): Promise<User | null> {
    return null
  },
}
