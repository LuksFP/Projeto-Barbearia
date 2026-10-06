import { Link } from 'react-router-dom'
import { PERGUNTAS } from './content'

const Closing = () => {
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
      </footer>
    </>
  )
}

export default Closing
