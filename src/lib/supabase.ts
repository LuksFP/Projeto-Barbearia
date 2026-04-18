import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const saasAuthStorageKey = 'barberos_saas_auth'
const legacyProjectRef = new URL(url).hostname.split('.')[0]
const legacyAuthStorageKey = `sb-${legacyProjectRef}-auth-token`
const noOpLock = async <T>(_name: string, _acquireTimeout: number, fn: () => Promise<T>) => await fn()

if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios')
}

const authStorage = {
  getItem: (key: string) => {
    const persistentValue = localStorage.getItem(key)
    if (persistentValue) return persistentValue

    const sessionValue = sessionStorage.getItem(key)
    if (sessionValue) {
      localStorage.setItem(key, sessionValue)
      return sessionValue
    }

    if (key === saasAuthStorageKey) {
      const legacyPersistentValue = localStorage.getItem(legacyAuthStorageKey)
      if (legacyPersistentValue) {
        localStorage.setItem(key, legacyPersistentValue)
        sessionStorage.setItem(key, legacyPersistentValue)
        return legacyPersistentValue
      }

      const legacySessionValue = sessionStorage.getItem(legacyAuthStorageKey)
      if (legacySessionValue) {
        localStorage.setItem(key, legacySessionValue)
        sessionStorage.setItem(key, legacySessionValue)
        return legacySessionValue
      }
    }

    return null
  },
  setItem: (key: string, value: string) => {
    localStorage.setItem(key, value)
    sessionStorage.setItem(key, value)
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
    if (key === saasAuthStorageKey) {
      localStorage.removeItem(legacyAuthStorageKey)
      sessionStorage.removeItem(legacyAuthStorageKey)
    }
  },
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: saasAuthStorageKey,
    storage: authStorage,
    lock: noOpLock,
  },
})
