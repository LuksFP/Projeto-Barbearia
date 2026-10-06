import { useState, type CSSProperties } from 'react'
import { reais } from './DemoContext'

const RECEITA_EXEMPLO = 6400

/** Régua de comissão: arrasta o percentual e vê a parte do barbeiro e a parte da casa. */
const SimComissao = () => {
  const [percentual, setPercentual] = useState(40)
  const barbeiro = Math.round((RECEITA_EXEMPLO * percentual) / 100)
  const casa = RECEITA_EXEMPLO - barbeiro
  const posicao = ((percentual - 20) / 50) * 100

  return (
    <div className="lp-comissao" style={{ '--parte': `${percentual}%`, '--posicao': `${posicao}%` } as CSSProperties}>
      <label htmlFor="lp-comissao">
        Faça a conta <span>arraste a comissão</span>
      </label>
      <div className="lp-comissao__regua">
        <input
          id="lp-comissao"
          type="range"
          min={20}
          max={70}
          step={5}
          value={percentual}
          onChange={(evento) => setPercentual(Number(evento.target.value))}
          aria-valuetext={`${percentual}% de comissão`}
        />
        <output htmlFor="lp-comissao">{percentual}%</output>
      </div>

      <div className="lp-comissao__barra" aria-hidden>
        <i />
      </div>
      <dl>
        <div>
          <dt>Barbeiro</dt>
          <dd>{reais(barbeiro)}</dd>
        </div>
        <div>
          <dt>Casa</dt>
          <dd>{reais(casa)}</dd>
        </div>
      </dl>
      <p>Exemplo com um barbeiro que fez {reais(RECEITA_EXEMPLO)} no mês.</p>
    </div>
  )
}

export default SimComissao
