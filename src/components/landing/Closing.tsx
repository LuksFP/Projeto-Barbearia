import { Link } from 'react-router-dom'
import { PERGUNTAS } from './content'
import { Piso } from './Ornamentos'
import { Acende, Botao, Carimbo } from './pieces'
import { useLandingCta } from './useLandingCta'

const Closing = () => {
  const { isLoggedIn, irParaPlano } = useLandingCta()

  return (
    <>
      <section className="lp-perguntas" aria-labelledby="lp-perguntas-titulo">
        <div className="lp-perguntas__lado">
          <h2 className="lp-h2" id="lp-perguntas-titulo">
            Antes de <em>sentar na cadeira.</em>
          </h2>
          <p className="lp-corpo">Respostas curtas pro que todo dono pergunta primeiro.</p>
        </div>

        <div className="lp-perguntas__lista">
          {PERGUNTAS.map((item, indice) => (
            <details key={item.pergunta} className="lp-pergunta" open={indice === 0}>
              <summary>
                <span>{item.pergunta}</span>
                <i aria-hidden />
              </summary>
              <p>{item.resposta}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-fim" id="amanha">
        <Carimbo id="amanha" />
        <Acende>
          <h2 className="lp-fim__titulo">
            Amanhã cedo, o caderno <em>fica na gaveta.</em>
          </h2>
          <div className="lp-fim__acoes">
            <Botao onClick={() => irParaPlano('pro')}>{isLoggedIn ? 'Abrir o painel' : 'Começar 2 dias grátis'}</Botao>
            <Link to="/demo/pro" className="lp-link lp-link--seta">
              Abrir a demonstração
            </Link>
          </div>
        </Acende>
        <Piso />
      </section>

      <footer className="lp-rodape">
        <div className="lp-rodape__linha">
          <p>© 2026 BarberOS</p>
          <nav aria-label="Rodapé">
            <a href="#planos" className="lp-link">
              Planos
            </a>
            <Link to="/demo/pro" className="lp-link">
              Demonstração
            </Link>
            <Link to="/entrar" className="lp-link">
              Entrar
            </Link>
          </nav>
        </div>
        <p className="lp-rodape__marca" aria-hidden>
          Barber<em>OS</em>
        </p>
      </footer>
    </>
  )
}

export default Closing
