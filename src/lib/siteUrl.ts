// Endereço público do site da barbearia, no domínio em que o app está rodando
// (hoje o da Vercel). Nunca escrever um domínio fixo na tela: "barberos.io"
// aparecia no painel e nos planos sem existir.

export function siteHost(): string {
  return typeof window === 'undefined' ? '' : window.location.host
}

export function publicSiteUrl(slug: string): string {
  return `${typeof window === 'undefined' ? '' : window.location.origin}/b/${slug}`
}

/** Para mostrar na tela: sem https://. */
export function publicSiteLabel(slug: string): string {
  return `${siteHost()}/b/${slug}`
}
