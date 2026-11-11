// Telefone na tela. O banco guarda só dígitos (migração 20261110200000):
// a ficha do cliente é uma só por número, não importa como foi digitado.

/** Só os dígitos; vazio se não tiver nenhum. */
export const phoneDigits = (phone: string | null | undefined): string => (phone ?? '').replace(/\D/g, '')

/** "13990000003" → "(13) 99000-0003"; "1332345678" → "(13) 3234-5678".
 *  Com DDI 55 na frente tira o 55. O que não parece número brasileiro volta como veio. */
export function formatPhoneBR(phone: string | null | undefined): string {
  if (!phone) return ''
  // DDI explícito que não é o Brasil: não tenta encaixar na máscara
  if (/^\s*\+/.test(phone) && !/^\s*\+\s*55/.test(phone)) return phone
  let d = phoneDigits(phone)
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return phone
}
