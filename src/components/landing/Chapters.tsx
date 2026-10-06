import type { ReactNode } from 'react'
import Clipe from './Clipe'
import { Acende, Carimbo } from './pieces'
import SimAgenda from './SimAgenda'
import SimAgendar from './SimAgendar'
import SimComissao from './SimComissao'
import SimLembrete from './SimLembrete'

const PAINEL = { largura: 1500, altura: 844 }

/** Lista numerada em vez de cartões: o número é a hierarquia. */
const Pontos = ({ itens }: { itens: ReactNode[] }) => (
  <ol className="lp-pontos">
    {itens.map((item, indice) => (
      <li key={indice}>
        <span aria-hidden>{String(indice + 1).padStart(2, '0')}</span>
        <p>{item}</p>
      </li>
    ))}
  </ol>
)

const Chapters = () => (
  <>
    {/* 09:12 — o link de agendamento */}
    <section className="lp-cap lp-cap--link" id="link">
      <Carimbo id="link" />
      <div className="lp-cap__grade">
        <Acende className="lp-cap__texto">
          <h2 className="lp-h2">
            O primeiro horário do dia chegou <em>pelo link.</em>
          </h2>
          <p className="lp-corpo">
            Cada barbearia ganha uma página com endereço próprio. O cliente abre, escolhe serviço, barbeiro e horário, e
            o agendamento cai direto na sua agenda.
          </p>
          <Pontos
            itens={[
              'Só aparece horário livre. Se o corte leva 30 minutos, o das 15:00 fica fechado até 15:30.',
              'Sem pagamento online. O cliente acerta na cadeira, como sempre.',
              'Quem agenda já entra na sua lista de clientes, com nome e telefone.',
            ]}
          />
        </Acende>

        <div className="lp-solo">
          <p className="lp-mexa">Mexe aqui: marque um horário</p>
          <SimAgendar />
        </div>
      </div>
    </section>

    {/* 10:30 — agenda e equipe */}
    <section className="lp-cap lp-cap--equipe" id="equipe">
      <Carimbo id="equipe" />
      <div className="lp-cap__grade lp-cap__grade--inverte">
        <div className="lp-solo lp-solo--largo">
          <p className="lp-mexa">O que você marcou cai aqui</p>
          <SimAgenda />
        </div>

        <Acende className="lp-cap__texto">
          <h2 className="lp-h2">
            Duas cadeiras, dois celulares, <em>uma agenda só.</em>
          </h2>
          <p className="lp-corpo">
            A agenda atualiza na hora em todos os aparelhos da equipe. Entrou horário pelo site, aparece o aviso de novo
            agendamento, sem ninguém recarregar nada.
          </p>
          <Pontos
            itens={[
              'Cada barbeiro com o próprio tempo de atendimento.',
              'Comissão definida por barbeiro, calculada no fechamento.',
              'Horário de funcionamento da casa do jeito que você abre e fecha.',
            ]}
          />
        </Acende>
      </div>
    </section>

    {/* 14:05 — lembretes e reativação */}
    <section className="lp-cap lp-cap--lembrete" id="lembrete">
      <Carimbo id="lembrete" />
      <Acende className="lp-cap__manchete">
        <h2 className="lp-h2 lp-h2--largo">
          Um toque e o lembrete <em>vai pelo WhatsApp.</em>
        </h2>
        <p className="lp-corpo">
          A lista de hoje e de amanhã já vem montada. Você toca em Lembrar, o WhatsApp abre com a mensagem escrita e o
          cliente confirma. Sai do seu número, com o seu nome.
        </p>
      </Acende>

      <p className="lp-mexa lp-mexa--solta">Mexe aqui: mande um lembrete</p>
      <SimLembrete />

      <div className="lp-aparte">
        <Acende>
          <p className="lp-aparte__chamada">E quem sumiu?</p>
          <p className="lp-corpo">
            Cliente que não aparece há 30, 45, 60 ou 90 dias entra numa lista à parte, com o tempo desde a última
            visita. Um botão chama de volta.
          </p>
        </Acende>
        <Clipe
          nome="clipe-reativar"
          descricao="Tela Reativação: clique em Chamar de volta e o cliente fica marcado como contatado"
          {...PAINEL}
        />
      </div>
    </section>

    {/* 17:40 — clube */}
    <section className="lp-cap lp-cap--clube" id="clube">
      <Carimbo id="clube" />
      <div className="lp-cap__grade lp-cap__grade--estreita">
        <Acende className="lp-cap__texto">
          <p className="lp-selo">Pro e Premium</p>
          <h2 className="lp-h2">
            Mensalidade do clube <em>sem planilha.</em>
          </h2>
          <p className="lp-corpo">
            Assinante, dia de vencimento e quem está atrasado, numa tela. O BarberOS não cobra ninguém por você: ele deixa
            a mensagem com a sua chave PIX pronta no WhatsApp e você dá baixa quando o dinheiro cair.
          </p>
          <Pontos
            itens={[
              'Atrasado, vence hoje e a vencer, separados logo no topo.',
              'Aviso na Visão Geral quando tem mensalidade atrasada.',
            ]}
          />
        </Acende>

        <Clipe
          nome="clipe-clube"
          descricao="Aba Cobranças do Clube VIP: clique em Dar baixa num assinante atrasado e ele sai da lista de atraso"
          {...PAINEL}
        />
      </div>
    </section>

    {/* 20:10 — financeiro */}
    <section className="lp-cap lp-cap--caixa" id="caixa">
      <Carimbo id="caixa" />
      <div className="lp-cap__grade lp-cap__grade--inverte">
        <Clipe
          nome="clipe-caixa"
          descricao="Tela Financeiro: resumo do mês escrito por IA e, em seguida, a tabela de comissão por barbeiro"
          {...PAINEL}
        />

        <Acende className="lp-cap__texto">
          <h2 className="lp-h2">
            Fechou a porta, <em>fechou o caixa.</em>
          </h2>
          <p className="lp-corpo">
            Receita por mês, por categoria e por barbeiro, com a comissão de cada um já separada da parte da casa.
          </p>
          <Pontos
            itens={[
              'Exporta em CSV pra mandar pro contador.',
              <>
                Resumo do mês escrito por IA, em três linhas. <small>Pro e Premium</small>
              </>,
            ]}
          />
          <SimComissao />
        </Acende>
      </div>
    </section>

    {/* 23:47 — a noite */}
    <section className="lp-cap lp-cap--noite" id="noite">
      <Carimbo id="noite" />
      <p className="lp-noite__hora" aria-hidden>
        23:47
      </p>
      <div className="lp-noite__grade">
        <Acende className="lp-noite__texto">
          <h2 className="lp-h2 lp-h2--largo">
            A barbearia dorme. <em>O link, não.</em>
          </h2>
          <p className="lp-corpo">
            O agendamento fica aberto 24 horas. Quem lembrou do corte à meia-noite marca na hora, e amanhã cedo o
            horário já está na agenda.
          </p>
        </Acende>
        <Clipe
          nome="clipe-celular"
          largura={462}
          altura={902}
          className="lp-clipe--fone"
          descricao="Celular com o agendamento online: serviço, barbeiro, horário e a tela de Agendado"
        />
      </div>
    </section>
  </>
)

export default Chapters
