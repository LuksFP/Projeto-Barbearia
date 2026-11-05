// "Instalar app" no menu do painel. Some quando o BarberOS já está instalado
// ou quando o navegador não oferece instalação.
import { Download } from 'lucide-react'
import { useInstallApp } from '@/hooks/useInstallApp'
import { toast } from '@/hooks/use-toast'

const InstallAppButton = () => {
  const { mode, install } = useInstallApp()
  if (!mode) return null

  const onClick = async () => {
    const result = await install()
    if (result === 'ios') {
      toast({
        title: 'Instalar no iPhone',
        description:
          'Toque em Compartilhar (quadrado com seta) → “Adicionar à Tela de Início”. Abrindo por lá, os avisos chegam com o app fechado.',
      })
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      className="w-full flex items-center gap-2 px-3 py-2 mb-1 rounded-lg text-sm font-body text-left bg-amber-500/[0.10] border border-amber-500/25 text-amber-300 hover:bg-amber-500/[0.16] transition-colors"
    >
      <Download className="w-4 h-4 shrink-0" />
      Instalar app no celular
    </button>
  )
}

export default InstallAppButton
