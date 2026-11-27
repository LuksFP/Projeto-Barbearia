// Guarda da demo (sem banco): um JSON por chave no localStorage.
export const demoRead = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch { return fallback }
}
export const demoWrite = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignora */ }
}
