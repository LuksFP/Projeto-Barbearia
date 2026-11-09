import { Link } from 'react-router-dom'
import LegalPage, { LEGAL_COMPANY, type LegalSection } from './LegalPage'

const sections: LegalSection[] = [
  {
    id: 'papeis',
    title: 'Quem cuida de quais dados',
    body: (
      <>
        <p>
          O BarberOS é fornecido pela {LEGAL_COMPANY}. Seguimos a Lei Geral de Proteção de Dados (Lei 13.709/2018).
        </p>
        <ul>
          <li>
            <strong>Dados de quem assina</strong> (dono e equipe da barbearia): somos os responsáveis
            (controladores).
          </li>
          <li>
            <strong>Dados dos clientes da barbearia</strong> (quem agenda pelo site ou é cadastrado no painel): a
            barbearia é a responsável, e o BarberOS guarda e processa esses dados em nome dela (operador).
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'coleta',
    title: 'O que coletamos',
    body: (
      <>
        <p><strong>De quem assina e da equipe</strong></p>
        <ul>
          <li>Nome, e-mail e senha. A senha é guardada criptografada; ninguém consegue lê-la.</li>
          <li>Dados da barbearia: nome, endereço, telefone, WhatsApp, Instagram, horários, fotos e logo.</li>
          <li>Situação da assinatura e o identificador de cliente da Stripe. O número do cartão não passa por nós.</li>
        </ul>
        <p><strong>Dos clientes da barbearia</strong></p>
        <ul>
          <li>Nome e WhatsApp; e-mail e observação, se a pessoa quiser informar.</li>
          <li>Agendamentos, serviços, avaliações e produtos reservados.</li>
        </ul>
        <p><strong>De quem usa o site</strong></p>
        <ul>
          <li>Endereço IP, usado só para frear abuso (como muitos agendamentos seguidos do mesmo lugar).</li>
          <li>
            Se o dono ativar avisos no celular, guardamos o endereço de notificação daquele aparelho.
          </li>
        </ul>
        <p className="legal__nota">
          Não usamos ferramentas de anúncio nem de rastreamento de visitantes.
        </p>
      </>
    ),
  },
  {
    id: 'uso',
    title: 'Para que usamos',
    body: (
      <ul>
        <li>Fazer o sistema funcionar: agenda, site de agendamento, lembretes, financeiro e loja.</li>
        <li>Cobrar a assinatura e avisar sobre teste grátis, pagamento e mudanças.</li>
        <li>Manter a segurança e impedir abuso.</li>
        <li>Responder quando você fala com a gente.</li>
      </ul>
    ),
  },
  {
    id: 'bases',
    title: 'Com que base legal',
    body: (
      <ul>
        <li><strong>Execução de contrato</strong>: prestar o serviço que você assinou (art. 7º, V).</li>
        <li><strong>Legítimo interesse</strong>: segurança e prevenção de abuso (art. 7º, IX).</li>
        <li><strong>Obrigação legal</strong>: guardar registros que a lei exige (art. 7º, II).</li>
      </ul>
    ),
  },
  {
    id: 'compartilhamento',
    title: 'Com quem compartilhamos',
    body: (
      <>
        <p>Não vendemos dados. Usamos estes fornecedores para o sistema funcionar:</p>
        <ul>
          <li><strong>Supabase</strong>: banco de dados, login e arquivos, em servidores em São Paulo.</li>
          <li><strong>Vercel</strong>: hospedagem do site.</li>
          <li><strong>Stripe</strong>: cobrança da assinatura.</li>
          <li><strong>Resend</strong>: envio de e-mails do sistema.</li>
          <li><strong>Google</strong>: login com Google, para quem escolher, e as fontes do site.</li>
        </ul>
        <p>
          Alguns desses fornecedores podem processar dados fora do Brasil, com as garantias que a LGPD exige.
          Também entregamos dados a autoridades quando a lei obrigar.
        </p>
      </>
    ),
  },
  {
    id: 'navegador',
    title: 'O que fica no seu navegador',
    body: (
      <p>
        Guardamos no navegador o login do painel (se você marcar “salvar login”), algumas preferências e, no site
        da barbearia, o nome e o telefone do cliente para ele não digitar de novo no próximo agendamento. Isso fica
        só naquele aparelho e some se você limpar os dados do navegador.
      </p>
    ),
  },
  {
    id: 'retencao',
    title: 'Por quanto tempo guardamos',
    body: (
      <p>
        Enquanto a conta existir. Se a conta for excluída, apagamos os dados em até 30 dias, menos o que a lei nos
        obriga a guardar por mais tempo, como registros de pagamento.
      </p>
    ),
  },
  {
    id: 'direitos',
    title: 'Seus direitos',
    body: (
      <>
        <p>
          Você pode pedir para confirmar se temos seus dados, ver uma cópia, corrigir, apagar, levar para outro
          serviço ou saber com quem compartilhamos (art. 18 da LGPD).
        </p>
        <p>
          Se você é <strong>cliente de uma barbearia</strong>, o caminho mais rápido é pedir direto a ela, que é
          a responsável pelos seus dados. Se preferir, fale com a gente e encaminhamos o pedido.
        </p>
      </>
    ),
  },
  {
    id: 'seguranca',
    title: 'Segurança',
    body: (
      <p>
        Toda conexão é criptografada (HTTPS), as senhas são guardadas criptografadas e cada barbearia só acessa os
        próprios dados: a separação é feita no próprio banco de dados, não só na tela. Se acontecer um incidente
        que possa causar risco a você, avisamos você e a ANPD.
      </p>
    ),
  },
  {
    id: 'menores',
    title: 'Menores de idade',
    body: (
      <p>
        O painel é para adultos responsáveis por barbearias. Quando um menor é atendido, quem agenda costuma ser o
        responsável por ele.
      </p>
    ),
  },
  {
    id: 'mudancas',
    title: 'Mudanças nesta política',
    body: (
      <p>
        Se mudarmos algo importante, avisamos no painel antes de valer. Veja também os{' '}
        <Link to="/termos">Termos de Uso</Link>.
      </p>
    ),
  },
]

const Privacidade = () => (
  <LegalPage
    kicker="BarberOS · Privacidade"
    title="Política de Privacidade"
    intro={<p>Quais dados o BarberOS guarda, por quê, com quem compartilha e como pedir para ver ou apagar.</p>}
    sections={sections}
    other={{ to: '/termos', label: 'Termos de Uso' }}
  />
)

export default Privacidade
