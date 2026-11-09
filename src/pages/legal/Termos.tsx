import { Link } from 'react-router-dom'
import LegalPage, { LEGAL_COMPANY, type LegalSection } from './LegalPage'

const sections: LegalSection[] = [
  {
    id: 'servico',
    title: 'O que é o BarberOS',
    body: (
      <>
        <p>
          O BarberOS é um sistema para barbearias: agenda, site de agendamento online, cadastro de clientes,
          equipe, serviços, lembretes, financeiro e, dependendo do plano, clube de assinatura e loja de produtos.
          Ele é fornecido pela {LEGAL_COMPANY}.
        </p>
        <p>
          Ao criar uma conta ou usar o painel, você concorda com estes termos. Se estiver cadastrando a barbearia
          em nome de uma empresa, você declara que pode aceitá-los por ela.
        </p>
      </>
    ),
  },
  {
    id: 'conta',
    title: 'Sua conta e sua equipe',
    body: (
      <>
        <p>
          Você é responsável pelos dados de cadastro, pela senha e por quem você convida para a equipe. Cada
          pessoa da equipe acessa o painel com o próprio login e só vê a barbearia em que foi incluída.
        </p>
        <p>Se perceber acesso que não reconhece, troque a senha e fale com a gente.</p>
      </>
    ),
  },
  {
    id: 'planos',
    title: 'Teste grátis e planos',
    body: (
      <>
        <p>
          Toda conta nova tem <strong>2 dias grátis</strong>, sem cadastrar cartão. Depois disso, o painel só
          continua liberado com um plano pago. Os planos, preços e o que cada um inclui estão na{' '}
          <Link to="/planos">página de planos</Link>.
        </p>
        <p>
          Se um preço mudar, avisamos no painel antes de a nova cobrança acontecer. A mudança não vale para o mês
          que você já pagou.
        </p>
      </>
    ),
  },
  {
    id: 'pagamento',
    title: 'Pagamento',
    body: (
      <>
        <p>
          A assinatura é mensal e cobrada no cartão de crédito, de forma recorrente, pela Stripe. Os dados do
          cartão ficam com a Stripe; o BarberOS não vê nem guarda o número do cartão.
        </p>
        <p>
          Se uma cobrança falhar, a Stripe tenta de novo e o painel continua liberado por{' '}
          <strong>3 dias</strong>. Passado esse prazo sem pagamento, o painel fica bloqueado até a assinatura ser
          regularizada. Nada é apagado por causa do bloqueio.
        </p>
      </>
    ),
  },
  {
    id: 'cancelamento',
    title: 'Cancelamento e reembolso',
    body: (
      <>
        <p>
          Você pode cancelar quando quiser, sem multa, em <strong>Painel › Assinatura</strong>. O acesso continua
          até o fim do mês já pago e a cobrança seguinte não acontece.
        </p>
        <p>
          Se você desistir em até <strong>7 dias</strong> depois do primeiro pagamento, devolvemos o valor
          integral (direito de arrependimento, art. 49 do Código de Defesa do Consumidor). Fora desse prazo, o mês
          em andamento não é devolvido de forma proporcional.
        </p>
      </>
    ),
  },
  {
    id: 'clientes',
    title: 'Agendamentos dos seus clientes',
    body: (
      <>
        <p>
          O BarberOS não cobra nada do cliente da barbearia. O agendamento pelo site é uma reserva gratuita, e
          serviços e produtos reservados são pagos direto na barbearia.
        </p>
        <p>
          Preço, atendimento, atraso, falta e cancelamento com o cliente são combinados entre a barbearia e ele. O
          BarberOS é a ferramenta, não parte desse acordo.
        </p>
      </>
    ),
  },
  {
    id: 'uso',
    title: 'O que não pode',
    body: (
      <ul>
        <li>Usar o sistema para mandar mensagens em massa que a pessoa não pediu.</li>
        <li>Cadastrar dados de pessoas sem ter motivo legítimo para isso.</li>
        <li>Tentar acessar dados de outra barbearia ou burlar travas de segurança e de plano.</li>
        <li>Usar o site da barbearia para vender algo ilegal ou enganar clientes.</li>
      </ul>
    ),
  },
  {
    id: 'dados',
    title: 'Os dados são da barbearia',
    body: (
      <>
        <p>
          Clientes, agenda, serviços e números cadastrados pertencem à barbearia. Usamos esses dados só para fazer
          o sistema funcionar. Como tratamos dados pessoais está na{' '}
          <Link to="/privacidade">Política de Privacidade</Link>.
        </p>
        <p>
          Você pode pedir uma cópia dos dados ou a exclusão da conta pelo e-mail no fim desta página.
        </p>
      </>
    ),
  },
  {
    id: 'disponibilidade',
    title: 'Disponibilidade',
    body: (
      <p>
        Trabalhamos para o sistema ficar no ar o tempo todo, mas pode haver falhas e manutenções. Quando uma
        manutenção for programada, avisamos no painel. Não respondemos por perdas causadas por falha de internet,
        aparelho ou serviço de terceiros fora do nosso controle.
      </p>
    ),
  },
  {
    id: 'suspensao',
    title: 'Suspensão da conta',
    body: (
      <p>
        Podemos suspender uma conta que descumpra estes termos, principalmente o que está em “O que não pode”.
        Sempre que possível, avisamos antes e explicamos o motivo.
      </p>
    ),
  },
  {
    id: 'mudancas',
    title: 'Mudanças nestes termos',
    body: (
      <p>
        Se mudarmos algo importante, avisamos no painel antes de valer. A data no topo desta página mostra a
        última atualização. Estes termos seguem a legislação brasileira.
      </p>
    ),
  },
]

const Termos = () => (
  <LegalPage
    kicker="BarberOS · Termos de Uso"
    title="Termos de Uso"
    intro={<p>As regras de uso do BarberOS, escritas para serem lidas.</p>}
    sections={sections}
    other={{ to: '/privacidade', label: 'Política de Privacidade' }}
  />
)

export default Termos
