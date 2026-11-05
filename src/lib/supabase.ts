import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios')
}

// "Manter conectado" na tela de entrar. Ligado (padrão): a sessão fica no
// localStorage e sobrevive a fechar o navegador. Desligado: vai pro
// sessionStorage e some quando a aba/navegador fecha.
const REMEMBER_KEY = 'barberos:manter-conectado'

export function rememberSession(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== '0'
  } catch {
    return true
  }
}

export function setRememberSession(remember: boolean): void {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
  } catch {
    /* modo privado sem storage: segue com o padrão */
  }
}

const authStorage = {
  getItem: (k: string): string | null => {
    try {
      return localStorage.getItem(k) ?? sessionStorage.getItem(k)
    } catch {
      return null
    }
  },
  setItem: (k: string, v: string): void => {
    try {
      if (rememberSession()) {
        localStorage.setItem(k, v)
        sessionStorage.removeItem(k)
      } else {
        sessionStorage.setItem(k, v)
        localStorage.removeItem(k)
      }
    } catch {
      /* sem storage */
    }
  },
  removeItem: (k: string): void => {
    try {
      localStorage.removeItem(k)
      sessionStorage.removeItem(k)
    } catch {
      /* sem storage */
    }
  },
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: authStorage,
  },
})
