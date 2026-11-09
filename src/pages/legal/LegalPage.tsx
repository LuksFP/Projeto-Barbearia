// Molde das páginas legais (/termos e /privacidade): índice fixo ao lado no
// desktop, texto em coluna de leitura, número da seção pendurado na margem.
import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import '@/styles/legal.css'

export const LEGAL_UPDATED_AT = '9 de novembro de 2026'
export const LEGAL_COMPANY = 'Nexio Softwares e Sistemas'
export const LEGAL_CONTACT_EMAIL = 'nexiosoftwareesistemas@gmail.com'

export interface LegalSection {
  id: string
  title: string
  body: ReactNode
}

interface Props {
  kicker: string
  title: string
  intro: ReactNode
  sections: LegalSection[]
  other: { to: string; label: string }
}

const LegalPage = ({ kicker, title, intro, sections, other }: Props) => {
  useEffect(() => {
    const prev = document.title
    document.title = `${title} · BarberOS`
    window.scrollTo(0, 0)
    return () => { document.title = prev }
  }, [title])

  return (
    <div className="legal">
      <header className="legal__topo">
        <Link to="/" className="legal__marca">BarberOS</Link>
        <Link to={other.to} className="legal__link">{other.label}</Link>
      </header>

      <div className="legal__grade">
        <div className="legal__cabeca">
          <p className="legal__kicker">{kicker}</p>
          <h1 className="legal__titulo">{title}</h1>
          <p className="legal__data">Atualizado em {LEGAL_UPDATED_AT}</p>
          <div className="legal__intro">{intro}</div>
        </div>

        <nav className="legal__indice" aria-label="Nesta página">
          <p className="legal__indice-rotulo">Nesta página</p>
          <ol>
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main className="legal__texto">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="legal__secao">
              <h2>
                <span className="legal__num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </h2>
              {s.body}
            </section>
          ))}

          <section className="legal__contato">
            <h2>Falar com a gente</h2>
            <p>
              Dúvida, pedido sobre seus dados ou reclamação:{' '}
              <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
              Respondemos em até 15 dias.
            </p>
          </section>
        </main>
      </div>

      <footer className="legal__rodape">
        <p>© 2026 BarberOS · {LEGAL_COMPANY}</p>
        <nav aria-label="Rodapé">
          <Link to="/termos">Termos de Uso</Link>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/planos">Planos</Link>
        </nav>
      </footer>
    </div>
  )
}

export default LegalPage
