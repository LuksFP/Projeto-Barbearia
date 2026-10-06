import Chapters from '@/components/landing/Chapters'
import Closing from '@/components/landing/Closing'
import { DiaProvider, LuzDoDia, Poste } from '@/components/landing/DayClock'
import { DemoProvider } from '@/components/landing/DemoContext'
import Hero from '@/components/landing/Hero'
import LandingNav from '@/components/landing/LandingNav'
import PriceBoard from '@/components/landing/PriceBoard'
import ScrollToTop from '@/components/ScrollToTop'
import '@/styles/landing.css'
import '@/styles/landing-hero.css'
import '@/styles/landing-sections.css'
import '@/styles/landing-closing.css'
import '@/styles/landing-sims.css'
import '@/styles/landing-controles.css'
import '@/styles/landing-barbearia.css'

// Landing do SaaS: a página é um dia de barbearia. A rolagem faz o relógio andar,
// a luz do fundo mudar e o poste de barbeiro girar. Os capítulos têm simulações pra mexer.
const Index = () => (
  <DiaProvider>
    <div className="lp">
      <ScrollToTop />
      <LuzDoDia />
      <Poste />
      <LandingNav />
      <main className="lp-conteudo">
        <Hero />
        <DemoProvider>
          <Chapters />
        </DemoProvider>
        <PriceBoard />
        <Closing />
      </main>
    </div>
  </DiaProvider>
)

export default Index
