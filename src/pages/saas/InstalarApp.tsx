// /app — tela pra instalar o painel no celular do barbeiro.
// Mesmo esqueleto das telas do fluxo de assinatura (Entrar, Planos), mas o assunto é
// um só: botão de instalar no Android, passo a passo no iPhone, link pra mandar
// pro celular quando abriu no computador. O manifesto entra nesta rota via
// src/lib/pwaHead.ts (senão o Chrome nem oferece instalar).
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Copy } from 'lucide-react'
import { motion } from 'framer-motion'
import { useInstallApp } from '@/hooks/useInstallApp'
import { isStandaloneApp } from '@/lib/pwaHead'

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
const isAndroid = () => /Android/i.test(navigator.userAgent)
const isMobile = () => isIOS() || isAndroid()

const PASSOS_IPHONE = [
  'Abra esta página no Safari (no Chrome do iPhone não instala).',
  'Toque em Compartilhar, o quadrado com a seta pra cima.',
  'Role e toque em “Adicionar à Tela de Início”, depois em Adicionar.',
]

const PASSOS_ANDROID = [
  'Abra esta página no Chrome.',
  'Toque nos três pontinhos no canto de cima.',
  'Toque em “Instalar app” (ou “Adicionar à tela inicial”).',
]

const Passos = ({ titulo, itens }: { titulo: string; itens: string[] }) => (
  <div>
    <h2 className="text-white/45 text-xs font-semibold font-body tracking-wide uppercase mb-4">{titulo}</h2>
    <ol className="space-y-5">
      {itens.map((texto, i) => (
        <li key={texto} className="flex gap-4 items-baseline">
          <span className="font-heading text-4xl leading-none text-amber-400/80 w-7 shrink-0">{i + 1}</span>
          <p className="text-white/75 text-[15px] font-body leading-snug">{texto}</p>
        </li>
      ))}
    </ol>
  </div>
)

const InstalarApp = () => {
  const navigate = useNavigate()
  const { mode, install } = useInstallApp()
  const [copiado, setCopiado] = useState(false)
  const [recusou, setRecusou] = useState(false)

  const jaInstalado = isStandaloneApp()
  const endereco = `${window.location.origin}/app`

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(endereco)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      /* sem permissão de área de transferência: o endereço continua na tela */
    }
  }

  const instalar = async () => {
    const r = await install()
    if (r === 'dismissed') setRecusou(true)
  }

  const mostraIphone = isIOS() || !isMobile()
  const mostraAndroid = isAndroid() || !isMobile()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col overflow-x-hidden">
      <div className="border-b border-white/5 shrink-0">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/40 hover:text-white text-sm font-body transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Início
          </button>
          <span className="font-heading text-lg text-amber-400 tracking-wider">BARBERPRO</span>
          <Link to="/entrar" className="text-white/40 hover:text-white text-sm font-body transition-colors">
            Entrar
          </Link>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 lg:py-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-14 lg:gap-8 items-start">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl">
          <h1 className="font-heading text-5xl sm:text-6xl tracking-wide leading-[0.95] mb-5">
            A AGENDA NO BOLSO,
            <br />
            <span className="text-amber-400">SEM LOJA DE APP.</span>
          </h1>
          <p className="text-white/55 text-base font-body leading-relaxed mb-10">
            O painel da barbearia vira um ícone na tela do celular. Abre direto na agenda, e o
            cliente que marcou pelo site aparece ali na hora.
          </p>

          {jaInstalado ? (
            <div className="border-l-2 border-amber-500 pl-4">
              <p className="text-white text-sm font-body mb-3">Você já está usando o app instalado.</p>
              <Link
                to="/dashboard"
                className="inline-block px-6 py-3 rounded-xl bg-amber-500 text-[#0a0a0a] font-semibold font-body text-sm hover:bg-amber-400 transition-colors"
              >
                Abrir o painel
              </Link>
            </div>
          ) : mode === 'prompt' ? (
            <div>
              <button
                type="button"
                onClick={() => void instalar()}
                className="px-7 py-4 rounded-xl bg-amber-500 text-[#0a0a0a] font-semibold font-body text-sm tracking-wide hover:bg-amber-400 active:translate-y-px transition-all"
              >
                Instalar o BarberPro agora
              </button>
              {recusou && (
                <p className="mt-3 text-white/50 text-sm font-body">
                  Sem problema. Quando quiser, é só voltar nesta página.
                </p>
              )}
            </div>
          ) : !isMobile() ? (
            <div className="border-l-2 border-amber-500 pl-4 max-w-md">
              <p className="text-white text-sm font-body mb-1">Instala pelo celular.</p>
              <p className="text-white/50 text-sm font-body mb-3">
                Abra este endereço no navegador do celular (ou mande pra você no WhatsApp).
              </p>
              <div className="flex items-stretch gap-2">
                <code className="flex-1 min-w-0 truncate px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/8 text-amber-300 text-sm">
                  {endereco}
                </code>
                <button
                  type="button"
                  onClick={() => void copiar()}
                  className="px-3 rounded-lg bg-white/[0.06] border border-white/10 text-white/80 text-sm font-body hover:bg-white/[0.1] transition-colors flex items-center gap-1.5"
                >
                  {copiado ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiado ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-14 grid sm:grid-cols-2 gap-12">
            {mostraIphone && <Passos titulo="No iPhone" itens={PASSOS_IPHONE} />}
            {mostraAndroid && <Passos titulo="No Android" itens={PASSOS_ANDROID} />}
          </div>

          <p className="mt-12 text-white/40 text-xs font-body leading-relaxed max-w-md">
            Depois de instalar, abra o app, entre com seu login e ligue o sininho. O aviso de novo
            agendamento no celular é dos planos Pro e Premium. No iPhone ele só chega com o app
            instalado, e precisa do iOS 16.4 ou mais novo.
          </p>
        </motion.div>

        {/* Ícone grande vazando da coluna, torto de propósito */}
        <div className="relative hidden lg:block h-[420px]" aria-hidden>
          <img
            src="/icon-512.png"
            alt=""
            className="absolute -right-24 top-2 w-[360px] h-[360px] rounded-[72px] rotate-[8deg] shadow-[0_30px_80px_-20px_rgba(245,158,11,0.35)]"
          />
          <img
            src="/icon-192.png"
            alt=""
            className="absolute left-4 bottom-0 w-24 h-24 rounded-[22px] -rotate-6 opacity-70"
          />
        </div>
      </main>
    </div>
  )
}

export default InstalarApp
