// Botão "Instalar app" do PWA.
// - Android/Chrome/Edge: guarda o evento beforeinstallprompt e abre o diálogo nativo.
// - iPhone: não existe diálogo; mostramos o passo a passo (Compartilhar → Tela de Início).
// - Já instalado (aberto como app): some.
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)

export type InstallMode = 'prompt' | 'ios' | null

// O evento pode disparar antes do painel montar (ex.: carregou na landing).
let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach(l => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach(l => l())
  })
}

function currentMode(): InstallMode {
  if (isStandalone()) return null
  if (deferred) return 'prompt'
  if (isIOS()) return 'ios'
  return null
}

export function useInstallApp() {
  const [mode, setMode] = useState<InstallMode>(currentMode)

  useEffect(() => {
    const update = () => setMode(currentMode())
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])

  const install = async (): Promise<'accepted' | 'dismissed' | 'ios'> => {
    if (mode === 'ios' || !deferred) return 'ios'
    const ev = deferred
    await ev.prompt()
    const { outcome } = await ev.userChoice
    deferred = null
    setMode(currentMode())
    return outcome
  }

  return { mode, install }
}
