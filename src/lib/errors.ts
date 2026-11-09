// Erro do Supabase não é `instanceof Error` (PostgrestError é objeto puro), então
// ler a mensagem precisa de narrowing. Um lugar só pra isso.

/** Texto do erro, venha de `throw new Error` ou do PostgREST. '' se não tiver. */
export function errorText(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message)
  return ''
}

/** As travas de plano do banco recusam com HINT 'plan_limit' e uma mensagem já
 *  escrita pra pessoa ("…vem no plano Pro."). null se não for isso — 23514 sozinho
 *  não serve, porque CHECK comum também usa e a mensagem é técnica. */
export function planLimitMessage(err: unknown): string | null {
  const hint = err && typeof err === 'object' && 'hint' in err ? (err as { hint: unknown }).hint : null
  return hint === 'plan_limit' ? errorText(err) || null : null
}
