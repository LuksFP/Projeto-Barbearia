import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Play } from 'lucide-react'

// Vídeos da landing, feitos no Remotion (~/videos/barberos-tutorial) com gravações reais do produto.
// Nenhum tem áudio, então tocam sozinhos enquanto estão na tela e pausam quando saem.

interface ClipeProps {
  /** Nome do arquivo em /public, sem extensão: usa `${nome}.mp4` e `${nome}.jpg`. */
  nome: string
  largura: number
  altura: number
  descricao: string
  className?: string
  /** Vídeo principal: mostra o botão de play na capa e os controles depois. */
  controles?: boolean
}

const Clipe = ({ nome, largura, altura, descricao, className = '', controles = false }: ClipeProps) => {
  const video = useRef<HTMLVideoElement>(null)
  const parado = useReducedMotion()
  const [tocando, setTocando] = useState(false)

  useEffect(() => {
    const el = video.current
    if (!el || parado) return

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          el.play().catch(() => {})
        } else {
          el.pause()
        }
      },
      { threshold: 0.4 },
    )
    observador.observe(el)
    return () => observador.disconnect()
  }, [parado])

  // quem pediu menos movimento não recebe autoplay, então precisa do controle pra tocar
  const mostrarControles = (controles && tocando) || (!controles && !!parado)

  return (
    <div className={`lp-clipe ${className}`}>
      <video
        ref={video}
        src={`/${nome}.mp4`}
        poster={`/${nome}.jpg`}
        width={largura}
        height={altura}
        muted
        loop
        playsInline
        controls={mostrarControles}
        preload={controles ? 'metadata' : 'none'}
        onPlay={() => setTocando(true)}
        aria-label={descricao}
      />
      {controles && !tocando && (
        <button type="button" className="lp-clipe__play" onClick={() => video.current?.play().catch(() => {})}>
          <span>
            <Play aria-hidden />
          </span>
          Assistir o tutorial
        </button>
      )}
    </div>
  )
}

export default Clipe
