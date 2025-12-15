import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Scissors, Award, Clock, Sparkles, ArrowRight, Star } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import SectionTitle from '@/components/SectionTitle';
import HaircutCard from '@/components/HaircutCard';
import ParallaxSection from '@/components/ParallaxSection';
import ImageWithSkeleton from '@/components/ImageWithSkeleton';
import lowFade from '@/assets/low-fade.jpg';
import taperFade from '@/assets/taper-fade.jpg';
import americano from '@/assets/americano.jpg';
import corteJaca from '@/assets/corte-jaca.jpg';
import cabeloLiso from '@/assets/cabelo-liso.jpg';
import cabeloOndulado from '@/assets/cabelo-ondulado.jpg';
import cabeloCrespo from '@/assets/cabelo-crespo.jpg';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // Parallax refs
  const heroRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Hero parallax
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(heroProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(heroProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(heroProgress, [0, 1], [1, 0.9]);

  // CTA parallax
  const { scrollYProgress: ctaProgress } = useScroll({
    target: ctaRef,
    offset: ['start end', 'center center'],
  });
  const ctaScale = useTransform(ctaProgress, [0, 1], [0.9, 1]);

  const handleAgendar = () => {
    if (isAuthenticated) {
      navigate('/agendamento');
    } else {
      navigate('/agendamento-visitante');
    }
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
      {/* Hero Section with Parallax */}
      <section ref={heroRef} className="relative pt-28 sm:pt-32 md:pt-40 pb-16 sm:pb-20 md:pb-28 px-4 min-h-[90vh] flex items-center">
        {/* Parallax background */}
        <motion.div 
          className="absolute inset-0 bg-gradient-hero"
          style={{ y: heroY }}
        />
        <motion.div 
          className="absolute inset-0 bg-hero-pattern opacity-50"
          style={{ y: useTransform(heroProgress, [0, 1], [0, 80]) }}
        />
        
        {/* Animated decorative elements */}
        <motion.div 
          className="absolute top-32 right-[10%] w-64 h-64 bg-primary/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          style={{ y: useTransform(heroProgress, [0, 1], [0, -50]) }}
        />
        <motion.div 
          className="absolute bottom-20 left-[5%] w-48 h-48 bg-primary/15 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{ y: useTransform(heroProgress, [0, 1], [0, -30]) }}
        />
        
        <motion.div 
          className="container mx-auto relative z-10"
          style={{ opacity: heroOpacity, scale: heroScale }}
        >
          <motion.div 
            className="max-w-4xl mx-auto text-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Icon badge */}
            <motion.div 
              className="inline-flex items-center justify-center mb-8"
              variants={itemVariants}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse-ring" />
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
                  <Scissors className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
                </div>
              </div>
            </motion.div>
            
            {/* Title */}
            <motion.h1 
              className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl mb-4 md:mb-6 tracking-wider"
              variants={itemVariants}
            >
              BARBER <span className="text-gradient">PRO</span>
            </motion.h1>
            
            {/* Subtitle */}
            <motion.p 
              className="font-body text-lg sm:text-xl md:text-2xl text-muted-foreground mb-4 max-w-xl mx-auto"
              variants={itemVariants}
            >
              Experiência premium em cortes masculinos
            </motion.p>

            {/* Rating badge */}
            <motion.div 
              className="inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-full px-4 py-2 mb-10"
              variants={itemVariants}
            >
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <span className="text-sm font-body text-muted-foreground">4.9 • 500+ avaliações</span>
            </motion.div>
            
            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={itemVariants}
            >
              <Button 
                size="xl" 
                variant="glow"
                onClick={handleAgendar}
                className="font-body font-bold animate-pulse-glow group"
              >
                <Sparkles className="w-5 h-5 mr-1" />
                Agendar Corte
                <ArrowRight className="w-5 h-5 ml-1 transition-transform group-hover:translate-x-1" />
              </Button>
              <Link to="/cortes">
                <Button size="xl" variant="outline" className="font-body font-semibold w-full sm:w-auto group">
                  Ver Cortes
                  <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
        
        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ opacity: heroOpacity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
            <div className="w-1.5 h-3 rounded-full bg-primary" />
          </div>
        </motion.div>
      </section>

      {/* Info Cards with Parallax */}
      <ParallaxSection 
        className="py-16 md:py-24 px-4 bg-secondary/30"
        backgroundClassName="bg-hero-pattern opacity-20"
        speed={0.15}
        fadeIn
      >
        <div className="container mx-auto">
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {[
              { icon: Award, title: 'ESPECIALISTAS', desc: 'Barbeiros certificados com mais de 10 anos de experiência' },
              { icon: Scissors, title: 'PREMIUM', desc: 'Atendimento exclusivo e personalizado para cada cliente' },
              { icon: Clock, title: 'MODERNO', desc: 'Técnicas atualizadas e tendências internacionais' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="glass-card p-6 md:p-8 rounded-2xl hover:border-primary/50 transition-all duration-500 group hover-lift cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="relative mb-5">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-heading text-2xl md:text-3xl mb-3 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="font-body text-sm md:text-base text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </ParallaxSection>

      {/* Cortes Modernos Preview */}
      <ParallaxSection 
        className="py-16 md:py-24 px-4"
        speed={0.1}
        fadeIn
      >
        <div className="container mx-auto">
          <SectionTitle subtitle="Descubra os estilos que combinam com você">
            CORTES <span className="text-primary">MODERNOS</span>
          </SectionTitle>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 max-w-7xl mx-auto mb-10 md:mb-14">
            <HaircutCard
              image={lowFade}
              title="LOW FADE"
              description="Degradê baixo com transição suave"
              delay={0}
            />
            <HaircutCard
              image={taperFade}
              title="TAPER FADE"
              description="Corte gradual natural"
              delay={100}
            />
            <HaircutCard
              image={americano}
              title="AMERICANO"
              description="Clássico atemporal"
              delay={200}
            />
            <HaircutCard
              image={corteJaca}
              title="CORTE JACA"
              description="Topete volumoso estiloso"
              delay={300}
            />
          </div>
          
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <Link to="/cortes">
              <Button size="lg" variant="outline" className="font-body font-semibold group">
                Ver Todos os Cortes
                <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </ParallaxSection>

      {/* Tipos de Cabelo Preview with Parallax */}
      <ParallaxSection 
        className="py-16 md:py-24 px-4 bg-secondary/30"
        backgroundClassName="bg-hero-pattern opacity-20"
        speed={0.15}
        fadeIn
        scaleEffect
      >
        <div className="container mx-auto">
          <SectionTitle subtitle="Técnicas específicas para cada tipo de cabelo">
            TIPOS DE <span className="text-primary">CABELO</span>
          </SectionTitle>
          
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-8 max-w-5xl mx-auto mb-10 md:mb-14"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {[
              { image: cabeloLiso, title: 'LISO', desc: 'Técnicas para volume e textura', link: '/cabelo-liso' },
              { image: cabeloOndulado, title: 'ONDULADO', desc: 'Valorização das ondas naturais', link: '/cabelo-ondulado' },
              { image: cabeloCrespo, title: 'CRESPO', desc: 'Cuidados especiais e atenção', link: '/cabelo-crespo' },
            ].map((item, i) => (
              <motion.div key={i} variants={itemVariants}>
                <Link to={item.link}>
                  <div className="group relative overflow-hidden rounded-2xl aspect-[4/3] cursor-pointer hover-lift">
                    <ImageWithSkeleton
                      src={item.image}
                      alt={item.title}
                      className="transition-transform duration-700 ease-out group-hover:scale-110"
                      aspectRatio="4/3"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-barber-black via-barber-black/50 to-transparent pointer-events-none" />
                    
                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6 pointer-events-none">
                      <div className="transform transition-all duration-500 group-hover:-translate-y-2">
                        <div className="inline-flex bg-primary px-3 py-1.5 rounded-lg mb-3 shadow-lg">
                          <span className="font-heading text-base md:text-lg text-primary-foreground">{item.title}</span>
                        </div>
                        <p className="font-body text-sm md:text-base text-white/90">{item.desc}</p>
                        
                        <div className="flex items-center gap-2 mt-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <span className="font-body text-sm font-medium">Saiba mais</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
          
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Link to="/tipos-cabelo">
              <Button size="lg" className="font-body font-semibold group">
                Saiba Mais
                <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </ParallaxSection>

      {/* CTA Final with Parallax Scale */}
      <section ref={ctaRef} className="py-20 md:py-32 px-4 relative overflow-hidden">
        {/* Background decoration */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        
        <motion.div 
          className="container mx-auto relative z-10"
          style={{ scale: ctaScale }}
        >
          <motion.div 
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-body text-sm font-medium text-primary">Transformação garantida</span>
            </motion.div>
            
            <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight">
              TRANSFORME SEU <span className="text-gradient">ESTILO</span>
            </h2>
            <p className="font-body text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
              Agende seu horário e experimente o melhor da barbearia moderna. Seu novo visual está a um clique de distância.
            </p>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                size="xl" 
                variant="glow"
                onClick={handleAgendar}
                className="font-body font-bold animate-pulse-glow group"
              >
                <Sparkles className="w-5 h-5 mr-1" />
                Agendar Agora
                <ArrowRight className="w-5 h-5 ml-1 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
};

export default Index;
