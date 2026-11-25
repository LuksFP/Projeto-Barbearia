import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Relogio } from './DayClock'
import { useLandingCta } from './useLandingCta'

const LandingNav = () => {
  const { isLoggedIn, irParaPlano } = useLandingCta()
  const [rolou, setRolou] = useState(false)

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 24)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  return (
    <header className={`lp-nav ${rolou ? 'lp-nav--rolou' : ''}`}>
      <Link to="/" className="lp-marca" aria-label="BarberOS, início">
        Barber<em>OS</em>
      </Link>

      <Relogio />

      <nav className="lp-nav__links" aria-label="Principal">
        <a href="#planos" className="lp-link lp-nav__planos">
          Planos
        </a>
        {!isLoggedIn && (
          <Link to="/entrar" className="lp-link">
            Entrar
          </Link>
        )}
        <button type="button" className="lp-nav__cta" onClick={() => irParaPlano('pro')}>
          {isLoggedIn ? 'Abrir o painel' : 'Começar'}
        </button>
      </nav>
    </header>
  )
}

export default LandingNav
