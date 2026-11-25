import { Link } from 'react-router-dom'
import { Acende, Botao } from './pieces'
import { useLandingCta } from './useLandingCta'

interface Passo {
  titulo: string
  texto: string
  extra?: 'conta' | 'app'
}

// Ordem de quem acabou de assinar: conta, app no celular, aviso, equipe.
const PASSOS: Passo[] = [
  {
    titulo: 'Crie a conta',
    texto: 'Escolha o plano e cadastre a barbearia. São 2 dias grátis com acesso ao painel, sem cadastrar cartão.',
    extra: 'conta',
  },
  {
    titulo: 'Baixe o app',
    texto:
      'Não passa por loja. No Android, abra a página do app no Chrome e toque em Instalar. No iPhone, abra no Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.',
    extra: 'app',
  },
  {
    titulo: 'Entre e ligue o sino',
    texto:
      'Abra o app, faça o login e ligue o sininho. Cada horário marcado pelo site vira aviso no celular. O aviso é dos planos Pro e Premium, e no iPhone precisa do iOS 16.4 ou mais novo.',
  },
  {
    titulo: 'Monte a casa',
    texto:
      'Cadastre barbeiros e serviços. O admin define o expediente de cada barbeiro, por exemplo quem só começa às 10h. Depois é mandar o link do seu site pros clientes.',
  },
]

/** Passo a passo de quem acabou de assinar: do cadastro até o primeiro aviso no celular. */
const ComoComecar = () => {
  const { isLoggedIn, irParaPlano } = useLandingCta()

  return (
    <section className="lp-comecar" id="como-comecar" aria-labelledby="lp-comecar-titulo">
      <Acende className="lp-comecar__lado">
        <p className="lp-comecar__rotulo">Depois de escolher o plano</p>
        <h2 className="lp-h2" id="lp-comecar-titulo">
          Criou a conta, <em>baixa o app.</em>
        </h2>
        <p className="lp-corpo">
          O resto você faz pelo celular, de dentro da barbearia. São quatro passos e o primeiro leva uns dois minutos.
        </p>
      </Acende>

      <ol className="lp-comecar__passos">
        {PASSOS.map((passo, indice) => (
          <li key={passo.titulo} className="lp-passo">
            <span className="lp-passo__n" aria-hidden>
              {String(indice + 1).padStart(2, '0')}
            </span>
            <div>
              <h3>{passo.titulo}</h3>
              <p>{passo.texto}</p>
              {passo.extra === 'conta' && (
                <Botao onClick={() => irParaPlano('pro')} className="lp-passo__botao">
                  {isLoggedIn ? 'Abrir o painel' : 'Criar a conta'}
                </Botao>
              )}
              {passo.extra === 'app' && (
                <Link to="/app" className="lp-link lp-link--seta lp-passo__link">
                  Abrir a página do app
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default ComoComecar
