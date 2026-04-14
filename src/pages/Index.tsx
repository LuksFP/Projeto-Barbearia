import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Building2,
  Check,
  Crown,
  Globe2,
  LayoutDashboard,
  Quote,
  Scissors,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import ImageWithSkeleton from '@/components/ImageWithSkeleton';
import cabeloLiso from '@/assets/cabelo-liso.jpg';
import cabeloOndulado from '@/assets/cabelo-ondulado.jpg';
import cabeloCrespo from '@/assets/cabelo-crespo.jpg';
import barberPortrait from '@/assets/barber-portrait.jpg';

gsap.registerPlugin(ScrollTrigger);

const RETANGULOS_COUNT = 12;
const RETANGULOS_DROP_START_Y = -112;
const RETANGULOS_DROP_SCALE = 1.04;
const RETANGULOS_COVER_END_Y = -4;
const RETANGULOS_DROP_DURATION = 0.92;
const RETANGULOS_STAGGER_EACH = 0.085;
const HERO_SCROLL_DISTANCE = 1120;
const HERO_SCROLL_SCRUB = 0.35;

const platformCards = [
  {
    eyebrow: 'site publico',
    title: 'SITE DA BARBEARIA',
    highlight: '1 link',
    description: 'Template pronto no ar imediato ou dominio proprio com widget embed — a barbearia escolhe o nivel de controle sem travar o onboarding.',
    detail: 'generico via subdominio ou externo via embed + dominio proprio',
    accent: false,
  },
  {
    eyebrow: 'operacao diaria',
    title: 'AGENDA + EQUIPE',
    highlight: '24/7',
    description: 'A casa opera no proprio painel com agenda, equipe, clientes, servicos e permissoes sem misturar dados com outras barbearias.',
    detail: 'dashboard por unidade, equipe isolada e rotina de recepcao organizada',
    accent: true,
  },
  {
    eyebrow: 'crescimento',
    title: 'CLUBE E RECORRENCIA',
    highlight: '+ticket',
    description: 'O mesmo sistema ainda sustenta assinatura VIP, retorno recorrente, campanhas e organizacao de beneficios da casa.',
    detail: 'planos mensais, prioridade de agenda e relacionamento com a base',
    accent: false,
  },
] as const;

const heroSignals = [
  { value: '14 dias', label: 'para subir a operacao base' },
  { value: '1 link', label: 'para cada barbearia divulgar' },
  { value: '100%', label: 'foco em ambiente isolado' },
] as const;

const templateSignals = [
  'entra no ar rapido',
  'template antes de custom',
  'dominio proprio no Pro+',
] as const;

const templateCards = [
  {
    image: cabeloLiso,
    eyebrow: 'template essencial',
    title: 'PAGINA DIRETA',
    description: 'Para barbeiros que so querem um site limpo, bonito e pronto para receber trafego e agendamento.',
    chips: ['hero forte', 'servicos claros', 'CTA no topo'],
  },
  {
    image: barberPortrait,
    eyebrow: 'template editorial',
    title: 'MARCA PREMIUM',
    description: 'Visual mais autoral para casas que querem parecer boutique sem entrar em projeto 100% custom.',
    chips: ['galeria forte', 'depoimentos', 'blocos de destaque'],
  },
  {
    image: cabeloOndulado,
    eyebrow: 'template clube',
    title: 'FOCO EM RECORRENCIA',
    description: 'Estrutura pensada para vender plano, reforcar beneficios e mostrar porque o cliente volta.',
    chips: ['assinatura VIP', 'retorno mensal', 'upgrade de ticket'],
  },
] as const;

const pricingPlans = [
  {
    planId: 'basic',
    eyebrow: 'entrada rapida',
    title: 'BÁSICO',
    price: 'R$ 19,90',
    description: 'Só o essencial: agenda online funcionando hoje, sem complicação.',
    detail: 'agenda online, gestao de clientes, confirmacao por WhatsApp',
    bullets: ['agenda online completa', 'até 2 barbeiros', 'gestão de clientes'],
    fit: 'bom para barbeiro solo ou casa pequena',
    result: 'profissionaliza o agendamento sem custo de entrada',
    siteTag: 'agenda',
    cta: 'entrar no ar',
    accent: false,
  },
  {
    planId: 'pro',
    eyebrow: 'operacao completa',
    title: 'PRO',
    price: 'R$ 59,90',
    description: 'Agenda + site no ar em minutos, clube VIP e relatórios.',
    detail: 'site generico barberos.io/b/slug, barbeiros ilimitados, clube VIP',
    bullets: ['site genérico BarberOS publicado', 'barbeiros ilimitados', 'clube VIP e assinaturas'],
    fit: 'bom para casas com equipe e volume',
    result: 'presenca online + operacao completa sem travar em personalizacao',
    siteTag: 'generico',
    cta: 'rodar a casa',
    accent: true,
  },
  {
    planId: 'premium',
    eyebrow: 'identidade propria',
    title: 'PREMIUM',
    price: 'R$ 79,90',
    description: 'Agenda + site personalizado com design exclusivo e domínio próprio.',
    detail: 'site personalizado, dominio proprio, SEO local, onboarding dedicado',
    bullets: ['site com design exclusivo', 'domínio próprio incluso', 'onboarding dedicado'],
    fit: 'bom para casas que querem identidade de marca forte',
    result: 'barbearia com site proprio sem depender de agencia',
    siteTag: 'personalizado',
    cta: 'quero o premium',
    accent: false,
  },
] as const;

const useCases = [
  {
    eyebrow: 'barbeiro solo',
    title: 'SITE PRONTO + AGENDA',
    description: 'Para quem quer parar de mandar cliente para Instagram, foto solta e horario no improviso.',
    points: ['template forte', 'agenda simples', 'link unico para bio e WhatsApp'],
    result: 'profissionaliza a presenca sem depender de projeto custom',
  },
  {
    eyebrow: 'casa com equipe',
    title: 'PAINEL POR UNIDADE',
    description: 'Para barbearias que precisam de agenda compartilhada, equipe e historico sem confusao de acesso.',
    points: ['membros por papel', 'clientes centralizados', 'barbearia isolada da outra'],
    result: 'deixa a operacao mais limpa e cada pessoa no proprio lugar',
  },
  {
    eyebrow: 'servico premium',
    title: 'SETUP ASSISTIDO',
    description: 'Para quem quer entrar no ar com ajuda da sua equipe sem contratar projeto personalizado logo de inicio.',
    points: ['copy inicial', 'ajuste visual', 'configuracao operacional base'],
    result: 'reduz atrito no onboarding e acelera a primeira entrega',
  },
] as const;

const operationFlow = [
  {
    step: '01',
    title: 'ABRE A AGENDA',
    text: 'A recepcao visualiza o dia, distribui encaixes, confirma horarios e sabe exatamente quem vai assumir cada cadeira.',
    detail: 'agenda viva, sem depender de conversa perdida',
  },
  {
    step: '02',
    title: 'RODA A CASA',
    text: 'Cada barbeiro entra no proprio ambiente, enxerga clientes, servicos e horarios ligados a sua rotina sem confundir o resto da equipe.',
    detail: 'painel por papel e por unidade',
  },
  {
    step: '03',
    title: 'FECHA O ATENDIMENTO',
    text: 'Historico, observacoes, produtos e proximos passos ficam registrados para o cliente nao voltar como se fosse uma conversa do zero.',
    detail: 'mais continuidade, menos improviso',
  },
  {
    step: '04',
    title: 'PUXA O RETORNO',
    text: 'A barbearia sustenta recorrencia com clube VIP, beneficios e novo agendamento sem transformar tudo em desconto.',
    detail: 'retorno organizado e ticket mais forte',
  },
] as const;

const operationSignals = [
  {
    icon: CalendarDays,
    title: 'recepcao no controle',
    text: 'confirma, encaixa, remarca e redistribui o dia sem baguncar a fila.',
  },
  {
    icon: Users,
    title: 'equipe alinhada',
    text: 'cada barbeiro ve o que precisa e o admin acompanha a operacao sem invadir outra casa.',
  },
  {
    icon: Crown,
    title: 'recorrencia visivel',
    text: 'o retorno vira sistema da casa, nao lembranca informal no WhatsApp.',
  },
] as const;

const feedbackCards = [
  {
    id: 'studio-norte',
    name: 'Renato Lima',
    service: 'Studio Norte',
    rating: 5,
    comment: 'A parte mais util foi parar de improvisar no WhatsApp. O template do site ja trouxe um lugar serio para mandar cliente e fechar horario.',
  },
  {
    id: 'casa-faria',
    name: 'Joao Faria',
    service: 'Casa Faria',
    rating: 5,
    comment: 'Nem todo barbeiro quer virar web designer. Ter uma pagina bonita, pronta e integrada com agenda resolve o que importa.',
  },
  {
    id: 'clube-27',
    name: 'Mateus Prado',
    service: 'Clube 27',
    rating: 5,
    comment: 'O ganho nao foi so no site. Foi centralizar equipe, recorrencia e clientes sem um admin mexer na operacao do outro.',
  },
] as const;

const Index = () => {
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroWipeRef = useRef<HTMLDivElement>(null);
  const heroMediaRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const exploreCutsTimeoutRef = useRef<number | null>(null);
  const retangulosRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isExploreCutsCutting, setIsExploreCutsCutting] = useState(false);

  useEffect(() => {
    const heroVideo = heroVideoRef.current;
    if (!heroVideo) return;

    const applyPlaybackRate = () => {
      heroVideo.defaultPlaybackRate = 1.34;
      heroVideo.playbackRate = 1.34;
    };

    applyPlaybackRate();
    heroVideo.addEventListener('loadeddata', applyPlaybackRate);
    heroVideo.addEventListener('canplay', applyPlaybackRate);

    return () => {
      heroVideo.removeEventListener('loadeddata', applyPlaybackRate);
      heroVideo.removeEventListener('canplay', applyPlaybackRate);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (exploreCutsTimeoutRef.current !== null) {
        window.clearTimeout(exploreCutsTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      wheelMultiplier: 0.92,
      touchMultiplier: 1.05,
      easing: (t) => 1 - Math.pow(1 - t, 4),
    });

    const updateScroll = (time: number) => {
      lenis.raf(time * 1000);
    };

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(updateScroll);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();

    return () => {
      lenis.destroy();
      gsap.ticker.remove(updateScroll);
    };
  }, []);

  useLayoutEffect(() => {
    const heroSection = heroSectionRef.current;
    const heroWipe = heroWipeRef.current;
    const heroMedia = heroMediaRef.current;
    const heroContent = heroContentRef.current;
    const retangulosEls = retangulosRefs.current.filter(Boolean) as HTMLDivElement[];

    if (!heroSection || !heroWipe || !heroMedia || !heroContent || !retangulosEls.length) return;

    const ctx = gsap.context(() => {
      const retangulosTimelineEnd =
        RETANGULOS_DROP_DURATION + RETANGULOS_STAGGER_EACH * (RETANGULOS_COUNT - 1);

      gsap.set(retangulosEls, {
        yPercent: RETANGULOS_DROP_START_Y,
        scaleY: RETANGULOS_DROP_SCALE,
        transformOrigin: 'top center',
        force3D: true,
      });
      gsap.set(heroSection, { autoAlpha: 1 });
      gsap.set(heroWipe, { autoAlpha: 1 });

      gsap.timeline({
        scrollTrigger: {
          trigger: heroSection,
          start: 'top top',
          end: `+=${HERO_SCROLL_DISTANCE}`,
          scrub: HERO_SCROLL_SCRUB,
          pin: true,
          pinSpacing: false,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
      .to(retangulosEls, {
        yPercent: RETANGULOS_COVER_END_Y,
        stagger: {
          each: RETANGULOS_STAGGER_EACH,
          from: 'start',
        },
        duration: RETANGULOS_DROP_DURATION,
        ease: 'power2.out',
      })
      .to(heroSection, {
        autoAlpha: 0,
        duration: 0.001,
        ease: 'none',
      }, retangulosTimelineEnd)
      .set([heroMedia, heroContent, heroWipe], {
        autoAlpha: 1,
      }, 0);
    });

    return () => {
      ctx.revert();
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const top = section.getBoundingClientRect().top + window.scrollY - 108;
    window.scrollTo({
      top,
      left: 0,
      behavior: 'auto',
    });
  };

  const handlePrimaryCta = () => {
    scrollToSection('dashboard');
  };

  const handleExploreCuts = () => {
    if (isExploreCutsCutting) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      scrollToSection('templates');
      return;
    }

    setIsExploreCutsCutting(true);

    if (exploreCutsTimeoutRef.current !== null) {
      window.clearTimeout(exploreCutsTimeoutRef.current);
    }

    exploreCutsTimeoutRef.current = window.setTimeout(() => {
      scrollToSection('templates');
    }, 720);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    },
  };

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section
        ref={heroSectionRef}
        className="relative flex min-h-[102vh] items-center overflow-hidden bg-[#050505] px-4 pb-20 pt-28 sm:pt-32 md:min-h-[108vh] md:pb-28 md:pt-40"
      >
        {/* Hero video background */}
        <div ref={heroMediaRef} className="hero-fallback-brick absolute inset-0 overflow-hidden bg-black">
          <video
            ref={heroVideoRef}
            className="h-full w-full object-cover object-center opacity-[0.52] md:opacity-[0.88]"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster="/bg-hero.webp"
          >
            <source src="/video-hero.mp4" type="video/mp4" />
          </video>
          <div className="hero-fallback-brick__veil" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.14)_0%,rgba(0,0,0,0.16)_26%,rgba(0,0,0,0.26)_58%,rgba(0,0,0,0.44)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-[radial-gradient(circle_at_50%_100%,rgba(255,192,64,0.18)_0%,rgba(255,173,39,0.06)_34%,rgba(255,173,39,0)_72%)] mix-blend-screen" />
        </div>

        <motion.div ref={heroContentRef} className="container mx-auto relative z-10">
          <motion.div 
            className="mx-auto max-w-5xl text-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              className="mb-8 inline-flex items-center justify-center"
              variants={itemVariants}
            >
              <div className="rounded-full border border-primary/18 bg-[linear-gradient(90deg,rgba(255,190,80,0.35),rgba(255,160,0,0.14),rgba(255,190,80,0.35))] px-5 py-2.5 shadow-[0_10px_32px_rgba(255,160,0,0.08)] backdrop-blur-md">
                <span className="font-body text-[11px] uppercase tracking-[0.28em] text-primary/95">
                  saas para barbearias
                </span>
              </div>
            </motion.div>
            
            <motion.h1 
              className="mx-auto max-w-5xl font-body text-4xl font-light leading-[1.02] tracking-[-0.04em] text-white sm:text-5xl md:text-6xl lg:text-[5.25rem]"
              variants={itemVariants}
            >
              Site, agenda e operacao para cada barbearia vender e rodar no proprio ambiente
            </motion.h1>
            
            <motion.p 
              className="mx-auto mt-6 max-w-3xl font-body text-base leading-7 text-white/62 sm:text-lg md:text-xl"
              variants={itemVariants}
            >
              Uma plataforma para barbearias que precisam de site publico, dashboard privado, equipe com permissao e uma base pronta para crescer sem misturar uma operacao com a outra.
            </motion.p>

            <motion.div 
              className="mt-5 inline-flex items-center gap-3 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 backdrop-blur-sm"
              variants={itemVariants}
            >
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_14px_rgba(255,180,0,0.6)]" />
              <span className="font-body text-xs uppercase tracking-[0.24em] text-white/56">
                site . dashboard . equipe . recorrencia
              </span>
            </motion.div>
            
            <motion.div 
              className="mt-10 flex flex-col justify-center gap-4 sm:flex-row"
              variants={itemVariants}
            >
              <Button 
                size="xl" 
                variant="default"
                onClick={handlePrimaryCta}
                className="group h-14 rounded-full bg-white px-8 text-[15px] font-semibold text-black shadow-[0_14px_40px_rgba(255,255,255,0.12)] hover:bg-white/92"
              >
                Ver dashboard
                <span className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-white transition-transform group-hover:translate-x-1">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
              <Button
                size="xl"
                variant="outline"
                type="button"
                onClick={handleExploreCuts}
                data-cutting={isExploreCutsCutting ? 'true' : 'false'}
                className="cta-scissor-button group h-14 w-full rounded-full border border-white/12 bg-black/30 px-8 font-body text-[15px] font-medium text-white hover:border-primary/35 hover:bg-white/[0.04] sm:w-auto"
              >
                <>
                  <span className="cta-scissor-button__label">Ver templates</span>
                  <span className="cta-scissor-button__icon">
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <span aria-hidden="true" className="cta-scissor-button__glow" />
                  <span aria-hidden="true" className="cta-scissor-button__cutline" />
                  <span aria-hidden="true" className="cta-scissor-button__scissors">
                    <Scissors className="h-4 w-4" />
                  </span>
                  <span
                    aria-hidden="true"
                    className="cta-scissor-button__chip cta-scissor-button__chip--left"
                  />
                  <span
                    aria-hidden="true"
                    className="cta-scissor-button__chip cta-scissor-button__chip--right"
                  />
                </>
              </Button>
            </motion.div>

            <motion.div
              className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3"
              variants={itemVariants}
            >
              {heroSignals.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.35rem] border border-white/8 bg-black/30 px-4 py-4 backdrop-blur-md"
                >
                  <p className="font-heading text-[1.65rem] leading-none text-white">{item.value}</p>
                  <p className="mt-2 font-body text-[11px] uppercase tracking-[0.22em] text-white/42">
                    {item.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        <div
          ref={heroWipeRef}
          className="pointer-events-none absolute inset-0 z-20 grid h-full w-full grid-cols-12 overflow-hidden"
        >
          {Array.from({ length: RETANGULOS_COUNT }).map((_, index) => (
            <div
              key={index}
              className="relative h-full min-w-0 overflow-hidden"
            >
              <div
                ref={(element) => {
                  retangulosRefs.current[index] = element;
                }}
                className="absolute inset-y-0 -left-[2px] -right-[2px] bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,0,0,0.998)_54%,rgba(0,0,0,0.994)_82%,rgba(6,4,2,0.96)_100%)] will-change-transform [backface-visibility:hidden]"
              >
                <div className="absolute inset-x-0 bottom-0 h-[12%] bg-[linear-gradient(180deg,rgba(255,176,40,0)_0%,rgba(255,176,40,0.008)_62%,rgba(255,222,144,0.028)_100%)]" />
              </div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
            <div className="w-1.5 h-3 rounded-full bg-primary" />
          </div>
        </motion.div>
      </section>

      <section className="px-0 pb-24 pt-4 sm:px-2 md:px-3 lg:px-4 md:pb-32 md:pt-8">
        <div className="mx-auto w-full max-w-[calc(100vw-10px)] 2xl:max-w-[1880px]">
          <div className="saas-brick-shell relative overflow-hidden rounded-[1.75rem] border border-[#6f3f17] shadow-[0_34px_120px_rgba(0,0,0,0.48)] sm:rounded-[2rem] md:rounded-[2.2rem]">
            <div className="saas-brick-patina" />
            <div className="saas-brick-masonry" />
            <div className="saas-brick-grain" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-[linear-gradient(90deg,rgba(255,120,20,0.24)_0%,rgba(255,120,20,0.08)_38%,rgba(255,120,20,0)_100%)]" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-[linear-gradient(270deg,rgba(255,120,20,0.24)_0%,rgba(255,120,20,0.08)_38%,rgba(255,120,20,0)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffb457] to-transparent" />

            <div className="relative px-4 py-5 sm:px-6 md:px-8 md:py-7 lg:px-10">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45 }}
                className="rounded-[0.9rem] border border-[#8b4d18] bg-[linear-gradient(180deg,rgba(183,100,25,0.94)_0%,rgba(122,64,16,0.96)_100%)] px-4 py-3 text-center shadow-[0_10px_30px_rgba(133,72,18,0.2)]"
              >
                <span className="font-heading text-[1.9rem] uppercase leading-none tracking-[0.14em] text-[#1d1107] sm:text-[2.2rem]">
                  PLATAFORMA
                </span>
              </motion.div>

              <motion.div
                className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5 }}
              >
                <div>
                  <p className="font-body text-[10px] uppercase tracking-[0.34em] text-[#ffb457]">
                    produto principal
                  </p>
                  <h2 className="mt-4 max-w-2xl font-body text-4xl font-light leading-[0.98] tracking-[-0.04em] text-white sm:text-5xl">
                    A barbearia ganha um site proprio e opera tudo em um dashboard isolado.
                  </h2>
                  <p className="mt-5 max-w-xl font-body text-[15px] leading-7 text-white/64">
                    A home deixa de vender uma unica barbearia e passa a vender a estrutura inteira do SaaS: um template forte para quem nao quer site personalizado e um painel privado para agenda, equipe, clientes e recorrencia.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {['site publico', 'workspace privado', 'multi-tenant', 'setup assistido'].map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 font-body text-[10px] uppercase tracking-[0.22em] text-white/54"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3">
                  {[
                    'Cada barbearia entra com seu proprio subdominio ou dominio depois.',
                    'O cliente final cai no link da casa certa, nao num portal generico.',
                    'A equipe ve apenas a operacao da propria barbearia.',
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[1.35rem] border border-white/8 bg-black/28 px-4 py-4 backdrop-blur-sm"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#ae621a] bg-[#1d1109] text-[#ffad48]">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <p className="font-body text-sm leading-6 text-white/68">{item}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.12fr_0.95fr]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: 0.03 }}
              >
                {platformCards.map((card) => (
                  <div
                    key={card.title}
                    className={
                      card.accent
                        ? 'relative overflow-hidden rounded-[1.75rem] border border-[#ca7f34] bg-[linear-gradient(180deg,rgba(214,122,34,0.93)_0%,rgba(151,80,18,0.97)_100%)] px-5 py-6 text-[#170d06] shadow-[0_20px_46px_rgba(140,73,18,0.18)]'
                        : 'relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(25,15,10,0.94)_0%,rgba(10,7,5,1)_100%)] px-5 py-6 text-white shadow-[0_22px_60px_rgba(0,0,0,0.26)]'
                    }
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    <p
                      className={
                        card.accent
                          ? 'font-body text-[10px] uppercase tracking-[0.34em] text-[#3d220b]'
                          : 'font-body text-[10px] uppercase tracking-[0.34em] text-[#ffb457]'
                      }
                    >
                      {card.eyebrow}
                    </p>
                    <h3 className="mt-4 font-heading text-[2.1rem] leading-[0.9] tracking-[0.08em] sm:text-[2.4rem]">
                      {card.title}
                    </h3>
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <span className="font-heading text-[2.8rem] leading-none sm:text-[3.35rem]">
                        {card.highlight}
                      </span>
                      <span
                        className={
                          card.accent
                            ? 'rounded-full border border-[#8d4d13] bg-[#1f130b]/10 px-3 py-1 font-body text-[10px] uppercase tracking-[0.24em] text-[#48280d]'
                            : 'rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 font-body text-[10px] uppercase tracking-[0.24em] text-white/54'
                        }
                      >
                        modulo
                      </span>
                    </div>
                    <p
                      className={
                        card.accent
                          ? 'mt-4 font-body text-[15px] leading-6 text-[#2d1a0b]'
                          : 'mt-4 font-body text-[15px] leading-6 text-white/72'
                      }
                    >
                      {card.description}
                    </p>
                    <div
                      className={
                        card.accent
                          ? 'mt-5 border-t border-[#8a4d17]/40 pt-4'
                          : 'mt-5 border-t border-white/8 pt-4'
                      }
                    >
                      <p
                        className={
                          card.accent
                            ? 'font-body text-[10px] uppercase tracking-[0.28em] text-[#5a3410]'
                            : 'font-body text-[10px] uppercase tracking-[0.28em] text-white/34'
                        }
                      >
                        o que entrega
                      </p>
                      <p
                        className={
                          card.accent
                            ? 'mt-2 font-body text-sm leading-6 text-[#26170b]'
                            : 'mt-2 font-body text-sm leading-6 text-white/58'
                        }
                      >
                        {card.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>

              <motion.div
                className="mt-4 grid gap-3 md:grid-cols-3"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.06 }}
              >
                {[
                  {
                    icon: Globe2,
                    title: 'site pronto',
                    text: 'bom para barbeiro que nao quer decidir cem coisas antes de entrar no ar.',
                  },
                  {
                    icon: LayoutDashboard,
                    title: 'painel por casa',
                    text: 'a operacao acontece no ambiente da propria barbearia, nao num admin embaralhado.',
                  },
                  {
                    icon: ShieldCheck,
                    title: 'permissoes certas',
                    text: 'um admin de uma casa nao mexe nos dados da outra quando a base multi-tenant existe de verdade.',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-[1.3rem] border border-white/8 bg-black/30 px-4 py-4 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ae621a] bg-[#1d1109] text-[#ffad48]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-body text-[10px] uppercase tracking-[0.28em] text-[#ffb45a]">
                            {item.title}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 font-body text-sm leading-6 text-white/58">
                        {item.text}
                      </p>
                    </div>
                  );
                })}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: 0.04 }}
                className="mt-10 rounded-[0.9rem] border border-[#8b4d18] bg-[linear-gradient(180deg,rgba(183,100,25,0.94)_0%,rgba(122,64,16,0.96)_100%)] px-4 py-3 text-center shadow-[0_10px_30px_rgba(133,72,18,0.18)]"
              >
                <span className="font-heading text-[1.7rem] uppercase leading-none tracking-[0.14em] text-[#1d1107] sm:text-[2.05rem]">
                  TEMPLATES DE SITE
                </span>
              </motion.div>

              <motion.div
                id="templates"
                className="mt-5 grid gap-4 lg:grid-cols-3"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5 }}
              >
                {templateCards.map((template, index) => {
                  const isHighlighted = index === 1;

                  return (
                    <div
                      key={template.title}
                      className={
                        isHighlighted
                          ? 'group relative overflow-hidden rounded-[1.6rem] border border-[#ca7f34] bg-[linear-gradient(180deg,rgba(214,122,34,0.93)_0%,rgba(151,80,18,0.97)_100%)] p-4 text-[#1c1008] shadow-[0_18px_42px_rgba(140,73,18,0.18)] lg:-translate-y-3'
                          : 'group relative overflow-hidden rounded-[1.6rem] border border-white/8 bg-black/28 p-4 text-white'
                      }
                    >
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                      <div className="relative overflow-hidden rounded-[1.15rem]">
                        <ImageWithSkeleton
                          src={template.image}
                          alt={template.title}
                          className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          aspectRatio="4/3"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.14)_36%,rgba(0,0,0,0.74)_100%)]" />
                        <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/35 px-3 py-1 font-body text-[9px] uppercase tracking-[0.28em] text-white/74 backdrop-blur-sm">
                          template
                        </div>
                      </div>
                      <div className="mt-4">
                        <p
                          className={
                            isHighlighted
                              ? 'font-body text-[10px] uppercase tracking-[0.3em] text-[#5f370e]'
                              : 'font-body text-[10px] uppercase tracking-[0.3em] text-[#ffb45a]'
                          }
                        >
                          {template.eyebrow}
                        </p>
                        <h3 className="mt-2 font-heading text-[1.8rem] leading-[0.9] tracking-[0.08em]">
                          {template.title}
                        </h3>
                        <p
                          className={
                            isHighlighted
                              ? 'mt-2 font-body text-sm leading-6 text-[#311b0b]'
                              : 'mt-2 font-body text-sm leading-6 text-white/62'
                          }
                        >
                          {template.description}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                          {template.chips.map((chip) => (
                            <span
                              key={chip}
                              className={
                                isHighlighted
                                  ? 'rounded-full border border-[#7d4717] bg-[#23150b]/10 px-3 py-1 font-body text-[10px] uppercase tracking-[0.2em] text-[#41240b]'
                                  : 'rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 font-body text-[10px] uppercase tracking-[0.2em] text-white/54'
                              }
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              <motion.div
                className="mt-4 rounded-[1.6rem] border border-white/8 bg-black/28 px-4 py-4 backdrop-blur-sm"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45 }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-2xl font-body text-sm leading-7 text-white/56">
                    O template padrao resolve o que a maioria das casas precisa no comeco: presença profissional, servicos claros, prova social e um caminho direto para o agendamento.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {templateSignals.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-[#7d4717] bg-[#1a1009] px-3 py-1 font-body text-[10px] uppercase tracking-[0.24em] text-[#ffb45a]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: 0.04 }}
                className="mt-10 rounded-[0.9rem] border border-[#8b4d18] bg-[linear-gradient(180deg,rgba(183,100,25,0.94)_0%,rgba(122,64,16,0.96)_100%)] px-4 py-3 text-center shadow-[0_10px_30px_rgba(133,72,18,0.18)]"
              >
                <span className="font-heading text-[1.6rem] uppercase leading-none tracking-[0.12em] text-[#1d1107] sm:text-[1.95rem]">
                  DASHBOARD DA CASA
                </span>
              </motion.div>

              <motion.div
                id="dashboard"
                className="mt-5 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative overflow-hidden rounded-[1.75rem] border border-[#7b4516] bg-[linear-gradient(180deg,rgba(21,13,9,0.98)_0%,rgba(10,7,5,1)_100%)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-body text-[10px] uppercase tracking-[0.28em] text-[#ffb45a]">
                        visao do workspace
                      </p>
                      <h3 className="mt-3 font-heading text-[2.3rem] leading-[0.9] tracking-[0.08em] text-white">
                        UMA CASA. UMA EQUIPE. UM PAINEL.
                      </h3>
                    </div>
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#7d4717] bg-black/35 text-[#ffad48]">
                      <LayoutDashboard className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-5 max-w-2xl font-body text-sm leading-7 text-white/64">
                    O cliente entra no link da barbearia. A equipe entra no dashboard da propria casa. Agenda, clientes, equipe e configuracoes ficam juntos, mas isolados do restante da plataforma.
                  </p>

                  <div className="mt-6 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4">
                      <p className="font-body text-[10px] uppercase tracking-[0.26em] text-[#ffb45a]">lado publico</p>
                      <p className="mt-3 font-heading text-[1.5rem] leading-none text-white">SITE DA BARBEARIA</p>
                      <p className="mt-3 font-body text-sm leading-6 text-white/58">
                        landing da casa, servicos, equipe, assinatura VIP, botao de agendamento e link para divulgar.
                      </p>
                    </div>
                    <div className="rounded-[1.3rem] border border-[#7d4717] bg-[#1a1009] p-4">
                      <p className="font-body text-[10px] uppercase tracking-[0.26em] text-[#ffb45a]">lado privado</p>
                      <p className="mt-3 font-heading text-[1.5rem] leading-none text-white">APP DA EQUIPE</p>
                      <p className="mt-3 font-body text-sm leading-6 text-white/58">
                        agenda, clientes, equipe, permissoes e operacao diaria no workspace da unidade.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: 'agenda de hoje', value: '18 slots' },
                      { label: 'equipe ativa', value: '6 membros' },
                      { label: 'clube VIP', value: '124 clientes' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-4 backdrop-blur-sm"
                      >
                        <p className="font-body text-[10px] uppercase tracking-[0.24em] text-white/38">{item.label}</p>
                        <p className="mt-3 font-heading text-[1.9rem] leading-none text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {['agenda', 'clientes', 'equipe', 'permissoes', 'servicos', 'assinaturas'].map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 font-body text-[10px] uppercase tracking-[0.22em] text-white/54"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      icon: CalendarDays,
                      title: 'Agenda',
                      text: 'confirma, remarca e distribui horarios por profissional',
                    },
                    {
                      icon: Users,
                      title: 'Equipe',
                      text: 'cada membro entra no proprio painel e enxerga o que deve',
                    },
                    {
                      icon: Building2,
                      title: 'Clientes',
                      text: 'historico, recorrencia e relacionamento ficam centralizados',
                    },
                    {
                      icon: Crown,
                      title: 'Clube VIP',
                      text: 'planos e beneficios da propria barbearia, nao da plataforma toda',
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="rounded-[1.5rem] border border-[#7b4516] bg-[linear-gradient(180deg,rgba(23,14,10,0.98)_0%,rgba(10,7,5,1)_100%)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.2)]"
                      >
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ae621a] bg-[#1d1109] text-[#ffad48]">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <h4 className="mt-4 font-heading text-[1.45rem] leading-none tracking-[0.06em] text-white">
                          {item.title}
                        </h4>
                        <p className="mt-3 font-body text-sm leading-6 text-white/58">
                          {item.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: 0.04 }}
                className="mt-10 rounded-[0.9rem] border border-[#8b4d18] bg-[linear-gradient(180deg,rgba(183,100,25,0.94)_0%,rgba(122,64,16,0.96)_100%)] px-4 py-3 text-center shadow-[0_10px_30px_rgba(133,72,18,0.18)]"
              >
                <span className="font-heading text-[1.55rem] uppercase leading-none tracking-[0.12em] text-[#1d1107] sm:text-[1.9rem]">
                  COMO FUNCIONA
                </span>
              </motion.div>

              <motion.div
                className="mt-5 grid gap-4 lg:grid-cols-3"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5 }}
              >
                {[
                  {
                    step: '01',
                    title: 'Cria a barbearia',
                    text: 'a casa entra com nome, logo, servicos, horarios e escolhe um template para publicar rapido.',
                  },
                  {
                    step: '02',
                    title: 'Sobe o site',
                    text: 'o barbeiro manda o proprio link para Instagram, WhatsApp, Google e campanhas sem depender de dev.',
                  },
                  {
                    step: '03',
                    title: 'Opera no painel',
                    text: 'equipe, agenda, clientes e recorrencia passam a rodar dentro do workspace da propria barbearia.',
                  },
                ].map((step, index) => (
                  <div
                    key={step.step}
                    className="group relative overflow-hidden rounded-[1.55rem] border border-[#7b4516] bg-[linear-gradient(180deg,rgba(23,14,10,0.98)_0%,rgba(10,7,5,1)_100%)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.26)] transition-transform duration-300 hover:-translate-y-1"
                    style={{ transitionDelay: `${index * 60}ms` }}
                  >
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#ae621a] bg-[#1d1109] font-heading text-[1.2rem] text-[#ffad48]">
                      {step.step}
                    </div>
                    <div className="px-1 pb-1 pt-5">
                      <p className="font-body text-[10px] uppercase tracking-[0.3em] text-[#ffb45a]">
                        etapa
                      </p>
                      <h3 className="mt-3 font-heading text-[1.7rem] leading-[0.92] tracking-[0.06em] text-white">
                        {step.title}
                      </h3>
                      <p className="mt-3 font-body text-sm leading-6 text-white/58">
                        {step.text}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>

              <motion.div
                className="mt-4 rounded-[1.55rem] border border-white/8 bg-[linear-gradient(180deg,rgba(18,11,8,0.98)_0%,rgba(10,7,5,1)_100%)] p-4"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45 }}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'template primeiro', text: 'evita travar a venda esperando site 100% custom' },
                    { label: 'link proprio', text: 'cada barbearia divulga o proprio endereco e fortalece a marca' },
                    { label: 'operacao depois', text: 'o painel entra para sustentar a rotina da equipe e o crescimento' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.15rem] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <p className="font-body text-[10px] uppercase tracking-[0.26em] text-[#ffb45a]">{item.label}</p>
                      <p className="mt-3 font-body text-sm leading-6 text-white/56">{item.text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: 0.04 }}
                className="mt-10 rounded-[0.9rem] border border-[#8b4d18] bg-[linear-gradient(180deg,rgba(183,100,25,0.94)_0%,rgba(122,64,16,0.96)_100%)] px-4 py-3 text-center shadow-[0_10px_30px_rgba(133,72,18,0.18)]"
              >
                <span className="font-heading text-[1.55rem] uppercase leading-none tracking-[0.12em] text-[#1d1107] sm:text-[1.9rem]">
                  OPERACAO DA BARBEARIA
                </span>
              </motion.div>

              <motion.div
                className="mt-5 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5 }}
              >
                <div className="rounded-[1.75rem] border border-[#7b4516] bg-[linear-gradient(180deg,rgba(22,14,10,0.98)_0%,rgba(10,7,5,1)_100%)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
                  <p className="font-body text-[10px] uppercase tracking-[0.28em] text-[#ffb45a]">
                    rotina diaria da casa
                  </p>
                  <h3 className="mt-4 max-w-xl font-body text-4xl font-light leading-[0.98] tracking-[-0.04em] text-white sm:text-[3.2rem]">
                    O SaaS precisa segurar o dia inteiro, nao so a captura do cliente.
                  </h3>
                  <p className="mt-5 max-w-2xl font-body text-sm leading-7 text-white/64">
                    O valor real aparece quando a plataforma acompanha da abertura da agenda ao retorno do cliente. Sem isso, o site vende bonito e a operacao volta para o improviso.
                  </p>

                  <div className="mt-8 space-y-3">
                    {operationFlow.map((item) => (
                      <div
                        key={item.step}
                        className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] px-4 py-4 backdrop-blur-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-start gap-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#7d4717] bg-[#1a1009] font-heading text-[1rem] text-[#ffb45a]">
                              {item.step}
                            </span>
                            <div>
                              <p className="font-heading text-[1.45rem] leading-none tracking-[0.06em] text-white">
                                {item.title}
                              </p>
                              <p className="mt-3 max-w-xl font-body text-sm leading-6 text-white/58">
                                {item.text}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full border border-white/8 bg-black/28 px-3 py-1 font-body text-[10px] uppercase tracking-[0.22em] text-white/48">
                            {item.detail}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  {operationSignals.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.title}
                        className="rounded-[1.55rem] border border-[#7b4516] bg-[linear-gradient(180deg,rgba(23,14,10,0.98)_0%,rgba(10,7,5,1)_100%)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
                      >
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ae621a] bg-[#1d1109] text-[#ffad48]">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <h4 className="mt-4 font-heading text-[1.5rem] leading-none tracking-[0.06em] text-white">
                          {item.title}
                        </h4>
                        <p className="mt-3 font-body text-sm leading-6 text-white/58">
                          {item.text}
                        </p>
                      </div>
                    );
                  })}

                  <div className="rounded-[1.55rem] border border-[#ca7f34] bg-[linear-gradient(180deg,rgba(214,122,34,0.93)_0%,rgba(151,80,18,0.97)_100%)] p-5 text-[#1d1107] shadow-[0_18px_42px_rgba(140,73,18,0.18)]">
                    <p className="font-body text-[10px] uppercase tracking-[0.3em] text-[#5a3410]">
                      visao de produto
                    </p>
                    <h4 className="mt-3 font-heading text-[1.9rem] leading-[0.92] tracking-[0.06em]">
                      MENOS CAOS OPERACIONAL. MAIS CASA RODANDO.
                    </h4>
                    <p className="mt-4 font-body text-sm leading-6 text-[#2d1a0b]">
                      Quando o site, a agenda, a equipe e o retorno ficam no mesmo ecossistema, a barbearia para de depender de gambiarra para continuar atendendo bem.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {['abertura', 'atendimento', 'historico', 'retorno'].map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full border border-[#8d4d13] bg-[#23150b]/10 px-3 py-1 font-body text-[10px] uppercase tracking-[0.22em] text-[#48280d]"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: 0.04 }}
                className="mt-10 rounded-[0.9rem] border border-[#8b4d18] bg-[linear-gradient(180deg,rgba(183,100,25,0.94)_0%,rgba(122,64,16,0.96)_100%)] px-4 py-3 text-center shadow-[0_10px_30px_rgba(133,72,18,0.18)]"
              >
                <span className="font-heading text-[1.7rem] uppercase leading-none tracking-[0.14em] text-[#1d1107] sm:text-[2rem]">
                  PLANOS
                </span>
              </motion.div>

              <motion.div
                className="mt-5 grid gap-4 rounded-[1.65rem] border border-white/8 bg-[linear-gradient(180deg,rgba(18,11,8,0.98)_0%,rgba(10,7,5,1)_100%)] p-5 lg:grid-cols-[1.1fr_0.9fr]"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45 }}
              >
                <div>
                  <p className="font-body text-[10px] uppercase tracking-[0.3em] text-[#ffb45a]">
                    leitura comercial
                  </p>
                  <h3 className="mt-4 max-w-2xl font-body text-4xl font-light leading-[0.98] tracking-[-0.04em] text-white sm:text-[3.1rem]">
                    O plano certo depende menos do visual e mais do quanto a barbearia ja opera hoje.
                  </h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {[
                    { text: 'Starter entra no ar com subdominio da plataforma — sem atrito no inicio.', tag: 'generico' },
                    { text: 'Pro e Scale desbloqueiam dominio proprio e widget embed para site externo.', tag: 'externo' },
                  ].map((item) => (
                    <div key={item.text} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex items-start gap-3">
                        <span className={`mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          item.tag === 'externo'
                            ? 'border border-blue-500/30 bg-blue-500/10 text-blue-400'
                            : 'border border-white/10 bg-white/[0.04] text-[#ffb45a]'
                        }`}>
                          <Check className="h-3 w-3" />
                        </span>
                        <div>
                          <p className="font-body text-sm leading-6 text-white/58">{item.text}</p>
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 font-body text-[9px] uppercase tracking-[0.2em] ${
                            item.tag === 'externo'
                              ? 'bg-blue-500/10 text-blue-400/80 border border-blue-500/20'
                              : 'bg-white/5 text-white/30 border border-white/8'
                          }`}>
                            site {item.tag}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                id="plans"
                className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.12fr_0.95fr]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5 }}
              >
                {pricingPlans.map((plan) => (
                  <Link
                    key={plan.title}
                    to={`/registrar?plano=${plan.planId}`}
                    className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb45a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0704]"
                    aria-label={`Escolher plano ${plan.title}`}
                  >
                    <div
                      className={
                        plan.accent
                          ? 'group relative h-full overflow-hidden rounded-[1.75rem] border border-[#ca7f34] bg-[linear-gradient(180deg,rgba(214,122,34,0.93)_0%,rgba(151,80,18,0.97)_100%)] px-5 py-6 text-[#170d06] shadow-[0_20px_46px_rgba(140,73,18,0.18)] transition-transform duration-300 hover:-translate-y-1 hover:border-[#ffb457]/70'
                          : 'group relative h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(25,15,10,0.94)_0%,rgba(10,7,5,1)_100%)] px-5 py-6 text-white shadow-[0_22px_60px_rgba(0,0,0,0.26)] transition-transform duration-300 hover:-translate-y-1 hover:border-[#ffb457]/35'
                      }
                    >
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                      {plan.accent && (
                        <div className="absolute right-5 top-5 rounded-full border border-[#8d4d13] bg-[#23150b]/10 px-3 py-1 font-body text-[10px] uppercase tracking-[0.24em] text-[#48280d]">
                          recomendado
                        </div>
                      )}
                      <p
                        className={
                          plan.accent
                            ? 'font-body text-[10px] uppercase tracking-[0.34em] text-[#3d220b]'
                            : 'font-body text-[10px] uppercase tracking-[0.34em] text-[#ffb457]'
                        }
                      >
                        {plan.eyebrow}
                      </p>
                      <h3 className="mt-4 font-body text-[1.95rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[2.25rem]">
                        {plan.title}
                      </h3>
                      <div className="mt-5 flex items-end justify-between gap-3">
                        <span className="font-body text-[2.7rem] font-semibold leading-none tracking-[-0.05em] sm:text-[3.1rem]">
                          {plan.price}
                        </span>
                        <span
                          className={
                            plan.accent
                              ? 'rounded-full border border-[#8d4d13] bg-[#1f130b]/10 px-3 py-1 font-body text-[10px] uppercase tracking-[0.24em] text-[#48280d]'
                              : 'rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 font-body text-[10px] uppercase tracking-[0.24em] text-white/54'
                          }
                        >
                          mensal
                        </span>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        {plan.siteTag === 'generico' ? (
                          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            site genérico
                          </span>
                        ) : (
                          <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-body text-[10px] font-semibold uppercase tracking-[0.2em] ${plan.accent ? 'border-[#1a4a8a]/60 bg-blue-500/15 text-blue-300' : 'border-blue-500/30 bg-blue-500/10 text-blue-400'}`}>
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${plan.accent ? 'bg-blue-300' : 'bg-blue-400'}`} />
                            site externo
                          </span>
                        )}
                      </div>
                      <p
                        className={
                          plan.accent
                            ? 'mt-3 font-body text-[15px] leading-6 text-[#2d1a0b]'
                            : 'mt-3 font-body text-[15px] leading-6 text-white/72'
                        }
                      >
                        {plan.description}
                      </p>
                      <div
                        className={
                          plan.accent
                            ? 'mt-5 rounded-[1.15rem] border border-[#8d4d13]/40 bg-[#23150b]/10 px-4 py-4'
                            : 'mt-5 rounded-[1.15rem] border border-white/8 bg-white/[0.03] px-4 py-4'
                        }
                      >
                        <p
                          className={
                            plan.accent
                              ? 'font-body text-[10px] uppercase tracking-[0.28em] text-[#5a3410]'
                              : 'font-body text-[10px] uppercase tracking-[0.28em] text-[#ffb45a]'
                          }
                        >
                          melhor encaixe
                        </p>
                        <p
                          className={
                            plan.accent
                              ? 'mt-2 font-body text-sm leading-6 text-[#26170b]'
                              : 'mt-2 font-body text-sm leading-6 text-white/62'
                          }
                        >
                          {plan.fit}
                        </p>
                        <p
                          className={
                            plan.accent
                              ? 'mt-3 font-body text-[13px] leading-6 text-[#26170b]/80'
                              : 'mt-3 font-body text-[13px] leading-6 text-white/50'
                          }
                        >
                          {plan.detail}
                        </p>
                      </div>
                      <div className="mt-4 space-y-2">
                        {plan.bullets.map((bullet) => (
                          <div key={bullet} className="flex items-start gap-2">
                            <span className={plan.accent ? 'mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#8d4d13] bg-[#1f130b]/10 text-[#48280d]' : 'mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#ffb45a]'}>
                              <Check className="h-3 w-3" />
                            </span>
                            <span className={plan.accent ? 'font-body text-sm leading-6 text-[#26170b]' : 'font-body text-sm leading-6 text-white/56'}>
                              {bullet}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div
                        className={
                          plan.accent
                            ? 'mt-5 border-t border-[#8a4d17]/40 pt-4'
                            : 'mt-5 border-t border-white/8 pt-4'
                        }
                      >
                        <p
                          className={
                            plan.accent
                              ? 'font-body text-[10px] uppercase tracking-[0.26em] text-[#5a3410]'
                              : 'font-body text-[10px] uppercase tracking-[0.26em] text-white/34'
                          }
                        >
                          destrava
                        </p>
                        <p
                          className={
                            plan.accent
                              ? 'mt-3 font-body text-sm leading-6 text-[#26170b]'
                              : 'mt-3 font-body text-sm leading-6 text-white/58'
                          }
                        >
                          {plan.result}
                        </p>
                      </div>
                      <div className="mt-5 flex items-center justify-between">
                        <span
                          className={
                            plan.accent
                              ? 'rounded-full border border-[#8d4d13] bg-[#23150b]/10 px-3 py-1 font-body text-[10px] uppercase tracking-[0.24em] text-[#48280d]'
                              : 'rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 font-body text-[10px] uppercase tracking-[0.24em] text-[#ffb45a]'
                          }
                        >
                          {plan.cta}
                        </span>
                        <ArrowRight className={plan.accent ? 'h-4 w-4 text-[#48280d]' : 'h-4 w-4 text-[#ffb45a]'} />
                      </div>
                    </div>
                  </Link>
                ))}
              </motion.div>

              <motion.div
                className="mt-4 flex flex-col gap-3 rounded-[1.55rem] border border-white/8 bg-black/28 px-4 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45 }}
              >
                <p className="max-w-2xl font-body text-sm leading-7 text-white/56">
                  O plano padrao pode comecar com subdominio da plataforma. Dominio proprio e setup assistido entram como upgrade, nao como barreira para a barbearia comecar.
                </p>
                <div className="rounded-full border border-[#7d4717] bg-[#1a1009] px-4 py-2 font-body text-[10px] uppercase tracking-[0.24em] text-[#ffb45a]">
                  onboarding sem atrito
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: 0.04 }}
                className="mt-10 rounded-[0.9rem] border border-[#8b4d18] bg-[linear-gradient(180deg,rgba(183,100,25,0.94)_0%,rgba(122,64,16,0.96)_100%)] px-4 py-3 text-center shadow-[0_10px_30px_rgba(133,72,18,0.18)]"
              >
                <span className="font-heading text-[1.7rem] uppercase leading-none tracking-[0.14em] text-[#1d1107] sm:text-[2rem]">
                  QUEM USA
                </span>
              </motion.div>

              <motion.div
                className="mt-5 grid gap-4 rounded-[1.65rem] border border-white/8 bg-black/28 p-5 backdrop-blur-sm lg:grid-cols-[1.02fr_0.98fr]"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45 }}
              >
                <div>
                  <p className="font-body text-[10px] uppercase tracking-[0.3em] text-[#ffb45a]">
                    perfis reais
                  </p>
                  <h3 className="mt-4 max-w-2xl font-body text-4xl font-light leading-[0.98] tracking-[-0.04em] text-white sm:text-[3rem]">
                    O mesmo produto atende momentos diferentes da barbearia sem virar plataforma confusa.
                  </h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {[
                    'autonomo que precisa de presenca e agenda',
                    'casa com equipe e recepcao organizada',
                    'dono que quer subir mais rapido com setup assistido',
                  ].map((item) => (
                    <div key={item} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <p className="font-body text-sm leading-6 text-white/58">{item}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="mt-5 grid gap-4 lg:grid-cols-3"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5 }}
              >
                {useCases.map((item, index) => (
                  <div
                    key={item.title}
                    className="group relative overflow-hidden rounded-[1.55rem] border border-[#7b4516] bg-[linear-gradient(180deg,rgba(23,14,10,0.98)_0%,rgba(10,7,5,1)_100%)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.26)] transition-transform duration-300 hover:-translate-y-1"
                    style={{ transitionDelay: `${index * 60}ms` }}
                  >
                    <div className="inline-flex rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 font-body text-[10px] uppercase tracking-[0.28em] text-[#ffb45a]">
                      {item.eyebrow}
                    </div>
                    <div className="px-1 pb-1 pt-5">
                      <h3 className="font-heading text-[1.7rem] leading-[0.92] tracking-[0.06em] text-white">
                        {item.title}
                      </h3>
                      <p className="mt-3 font-body text-sm leading-6 text-white/58">
                        {item.description}
                      </p>
                      <div className="mt-5 space-y-2 border-t border-white/8 pt-4">
                        {item.points.map((point) => (
                          <div key={point} className="flex items-start gap-2">
                            <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#ffb45a]">
                              <Check className="h-3 w-3" />
                            </span>
                            <span className="font-body text-sm leading-6 text-white/56">{point}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 rounded-[1.15rem] border border-[#7d4717] bg-[#1a1009] px-4 py-4">
                        <p className="font-body text-[10px] uppercase tracking-[0.26em] text-[#ffb45a]">
                          resultado direto
                        </p>
                        <p className="mt-3 font-body text-sm leading-6 text-white/58">
                          {item.result}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: 0.04 }}
                className="mt-10 rounded-[0.9rem] border border-[#8b4d18] bg-[linear-gradient(180deg,rgba(183,100,25,0.94)_0%,rgba(122,64,16,0.96)_100%)] px-4 py-3 text-center shadow-[0_10px_30px_rgba(133,72,18,0.18)]"
              >
                <span className="font-heading text-[1.7rem] uppercase leading-none tracking-[0.14em] text-[#1d1107] sm:text-[2rem]">
                  DEPOIMENTOS
                </span>
              </motion.div>

              <motion.div
                className="mt-5 grid gap-4 lg:grid-cols-3"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5 }}
              >
                {feedbackCards.map((item) => (
                  <div
                    key={`feedback-${item.id}`}
                    className="relative overflow-hidden rounded-[1.55rem] border border-[#7b4516] bg-[linear-gradient(180deg,rgba(24,15,10,0.98)_0%,rgba(10,7,5,1)_100%)] p-5 shadow-[0_20px_52px_rgba(0,0,0,0.26)]"
                  >
                    <div className="absolute right-4 top-4 text-[#ff9c2c]/20">
                      <Quote className="h-12 w-12" />
                    </div>
                    <div className="flex items-center gap-1 text-[#ffb45a]">
                      {Array.from({ length: item.rating }).map((_, index) => (
                        <Star key={index} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <p className="mt-4 font-body text-[15px] leading-7 text-white/72">
                      {item.comment}
                    </p>
                    <div className="mt-6 border-t border-white/8 pt-4">
                      <p className="font-heading text-[1.3rem] leading-none tracking-[0.06em] text-white">
                        {item.name}
                      </p>
                      <p className="mt-2 font-body text-[10px] uppercase tracking-[0.28em] text-[#ffb45a]">
                        {item.service}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>

              <motion.div
                className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-white/8 pt-6 sm:flex-row sm:items-center"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45 }}
              >
                <p className="max-w-2xl font-body text-sm leading-7 text-white/46">
                  A landing agora vende a plataforma, nao uma barbearia isolada. O caminho e simples: template para quem quer entrar no ar rapido, dashboard para operar a casa e um modelo claro para subir o SaaS sem misturar as operacoes.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => scrollToSection('templates')}
                    className="rounded-full border-white/10 bg-white/[0.03] px-6 font-body font-semibold text-white hover:border-[#ffb45a] hover:bg-white/[0.06]"
                  >
                    Ver Templates
                  </Button>
                  <Link to="/entrar">
                    <Button
                      size="lg"
                      className="rounded-full bg-[linear-gradient(180deg,#d88422_0%,#b56418_100%)] px-6 font-body font-semibold text-[#1d1007] hover:brightness-110"
                    >
                      Entrar No Painel
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
