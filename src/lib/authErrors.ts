export function getAuthErrorMessage(error: unknown): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Sem conexão com a internet. Verifique sua rede e tente novamente.'
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (
      message.includes('failed to fetch') ||
      message.includes('network error') ||
      message.includes('fetch failed') ||
      message.includes('net::err_tunnel_connection_failed')
    ) {
      return 'Não foi possível conectar ao Supabase. Verifique VPN, proxy, firewall ou a URL do projeto.'
    }

    if (message.includes('invalid login credentials')) {
      return 'Email ou senha incorretos.'
    }

    if (message.includes('too many requests') || message.includes('429')) {
      return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
    }

    return error.message
  }

  return 'Erro inesperado. Tente novamente.'
}
