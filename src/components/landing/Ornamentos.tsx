import type { ReactNode } from 'react'

// Ferramentas de barbeiro desenhadas pra landing (traço único, herdam a cor do texto).
// Feitas à mão em vez de ícone de biblioteca pra página ter a própria caligrafia.

type Ferramenta = 'tesoura' | 'navalha' | 'pente'

const DESENHOS: Record<Ferramenta, ReactNode> = {
  tesoura: (
    <>
      <circle cx="17" cy="49" r="8" />
      <circle cx="47" cy="49" r="8" />
      <path d="M22 43 45 6l3.5 3.5L27 46" />
      <path d="M42 43 19 6l-3.5 3.5L37 46" />
      <circle cx="32" cy="28" r="1.4" fill="currentColor" />
    </>
  ),
  navalha: (
    <>
      <path d="M6 19h33a5 5 0 0 1 5 5v8H11a5 5 0 0 1-5-5z" />
      <path d="M12 26h24" strokeDasharray="1 4" />
      <circle cx="44" cy="28" r="2.2" />
      <path d="m46 30 12 15a4 4 0 0 1-1.6 6.2l-3 1.1a4 4 0 0 1-4.8-1.6L39 34" />
    </>
  ),
  pente: (
    <>
      <path d="M6 18h52v9H6z" />
      <path d="M10 27v19M14 27v19M18 27v19M22 27v19M26 27v19M30 27v19M35 27v15M40 27v15M45 27v15M50 27v15M55 27v15" />
    </>
  ),
}

export const Icone = ({ tipo, className = '' }: { tipo: Ferramenta; className?: string }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`lp-icone ${className}`}
    aria-hidden
  >
    {DESENHOS[tipo]}
  </svg>
)

/** Filete de letreiro: fio, ferramenta, fio. */
export const Filete = ({ tipo = 'tesoura' }: { tipo?: Ferramenta }) => (
  <div className="lp-filete" aria-hidden>
    <i />
    <Icone tipo={tipo} />
    <i />
  </div>
)

/** Selo de vitrine: o texto gira devagar em volta da tesoura. */
export const Selo = ({ className = '' }: { className?: string }) => (
  <div className={`lp-selo-vitrine ${className}`} aria-hidden>
    <svg viewBox="0 0 200 200">
      <defs>
        <path id="lp-selo-volta" d="M100,100 m-73,0 a73,73 0 1,1 146,0 a73,73 0 1,1 -146,0" />
      </defs>
      <circle cx="100" cy="100" r="97" className="lp-selo-vitrine__fundo" />
      <circle cx="100" cy="100" r="91" className="lp-selo-vitrine__aro" />
      <circle cx="100" cy="100" r="55" className="lp-selo-vitrine__aro" />
      <g className="lp-selo-vitrine__gira">
        <text textLength="452" lengthAdjust="spacing">
          <textPath href="#lp-selo-volta">AGENDA ✦ SITE ✦ CLUBE ✦ CAIXA ✦ LEMBRETE ✦</textPath>
        </text>
      </g>
    </svg>
    <Icone tipo="tesoura" />
  </div>
)

/** Toldo listrado com barrado recortado, como o da fachada. */
export const Toldo = () => (
  <div className="lp-toldo" aria-hidden>
    <div />
  </div>
)

/** Piso xadrez em perspectiva, sumindo no escuro. */
export const Piso = () => (
  <div className="lp-piso" aria-hidden>
    <div />
  </div>
)

export type { Ferramenta }
