import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Scissors, Award, Clock } from 'lucide-react';
import SectionTitle from '@/components/SectionTitle';
import HaircutCard from '@/components/HaircutCard';
import lowFade from '@/assets/low-fade.jpg';
import taperFade from '@/assets/taper-fade.jpg';
import americano from '@/assets/americano.jpg';
import corteJaca from '@/assets/corte-jaca.jpg';
import cabeloLiso from '@/assets/cabelo-liso.jpg';
import cabeloOndulado from '@/assets/cabelo-ondulado.jpg';
import cabeloCrespo from '@/assets/cabelo-crespo.jpg';

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-8 animate-in zoom-in duration-500">
              <Scissors className="w-10 h-10 text-primary" />
            </div>
            
            <h1 className="font-heading text-6xl md:text-8xl mb-6 tracking-wider animate-in fade-in slide-in-from-bottom-4 duration-700">
              BARBER <span className="text-primary">PRO</span>
            </h1>
            
            <p className="font-body text-xl md:text-2xl text-muted-foreground mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
              Experiência premium em cortes masculinos
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <Button size="lg" className="font-body font-semibold text-lg px-8 py-6">
                Agendar Horário
              </Button>
              <Link to="/cortes">
                <Button size="lg" variant="outline" className="font-body font-semibold text-lg px-8 py-6">
                  Ver Cortes
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Info Cards */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Award, title: 'ESPECIALISTAS', desc: 'Barbeiros certificados e experientes' },
              { icon: Scissors, title: 'PREMIUM', desc: 'Atendimento de alta qualidade' },
              { icon: Clock, title: 'MODERNO', desc: 'Cortes e estilos atualizados' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="bg-card p-8 rounded-xl border border-border hover:border-primary transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group"
                >
                  <Icon className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="font-heading text-3xl mb-4 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="font-body text-muted-foreground">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cortes Modernos Preview */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <SectionTitle subtitle="Descubra os estilos que combinam com você">
            CORTES <span className="text-primary">MODERNOS</span>
          </SectionTitle>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-12">
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
          
          <div className="text-center">
            <Link to="/cortes">
              <Button size="lg" variant="outline" className="font-body font-semibold">
                Ver Todos os Cortes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Tipos de Cabelo Preview */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <SectionTitle subtitle="Técnicas específicas para cada tipo de cabelo">
            TIPOS DE <span className="text-primary">CABELO</span>
          </SectionTitle>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
            {[
              { image: cabeloLiso, title: 'LISO', desc: 'Técnicas para volume e textura' },
              { image: cabeloOndulado, title: 'ONDULADO', desc: 'Valorização das ondas naturais' },
              { image: cabeloCrespo, title: 'CRESPO', desc: 'Cuidados especiais e atenção' },
            ].map((item, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-xl aspect-video animate-in fade-in zoom-in duration-500"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-6">
                  <div className="bg-primary px-3 py-1 rounded-md inline-block mb-2 self-start">
                    <span className="font-heading text-lg text-primary-foreground">{item.title}</span>
                  </div>
                  <p className="font-body text-white/90">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <Link to="/tipos-cabelo">
              <Button size="lg" className="font-body font-semibold">
                Saiba Mais
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="font-heading text-5xl md:text-6xl mb-6">
            TRANSFORME SEU <span className="text-primary">ESTILO</span>
          </h2>
          <p className="font-body text-lg text-muted-foreground mb-8">
            Agende seu horário e experimente o melhor da barbearia moderna.
          </p>
          <Button size="lg" className="font-body font-semibold text-lg px-12 py-6">
            Agendar Agora
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
