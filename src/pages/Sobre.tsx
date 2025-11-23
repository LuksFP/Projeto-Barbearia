import { Award, Scissors, Star, Users } from 'lucide-react';
import SectionTitle from '@/components/SectionTitle';
import barberPortrait from '@/assets/barber-portrait.jpg';

const Sobre = () => {
  const stats = [
    { icon: Users, value: '5000+', label: 'Clientes Atendidos' },
    { icon: Award, value: '15+', label: 'Anos de Experiência' },
    { icon: Scissors, value: '50+', label: 'Estilos Dominados' },
    { icon: Star, value: '4.9', label: 'Avaliação Média' },
  ];

  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <SectionTitle subtitle="Conheça a história por trás da excelência">
            SOBRE O <span className="text-primary">BARBEIRO</span>
          </SectionTitle>

          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Image */}
            <div className="relative group animate-in fade-in slide-in-from-left duration-700">
              <div className="absolute -inset-4 bg-primary/20 rounded-2xl blur-2xl group-hover:bg-primary/30 transition-all duration-500" />
              <img
                src={barberPortrait}
                alt="Barbeiro Profissional"
                className="relative rounded-2xl w-full shadow-2xl border-4 border-border group-hover:border-primary transition-all duration-500"
              />
            </div>

            {/* Content */}
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-700">
              <h3 className="font-heading text-4xl">
                RODRIGO <span className="text-primary">SANTOS</span>
              </h3>
              
              <p className="font-body text-lg text-muted-foreground leading-relaxed">
                Com mais de 15 anos de experiência no mercado, especializei-me em cortes 
                masculinos modernos e técnicas avançadas de fade. Minha jornada começou nas 
                ruas de São Paulo, onde aprendi que cada cliente merece um atendimento premium 
                e personalizado.
              </p>

              <p className="font-body text-lg text-muted-foreground leading-relaxed">
                Minha filosofia é simples: combinar técnica impecável com atendimento de 
                excelência. Cada corte é uma obra de arte, moldada especificamente para 
                realçar o estilo único de cada cliente.
              </p>

              <div className="pt-6">
                <h4 className="font-heading text-2xl mb-4 text-primary">
                  ESPECIALIDADES
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    'Low & High Fade',
                    'Taper Fade',
                    'Corte Americano',
                    'Barba & Bigode',
                    'Degradê Perfeito',
                    'Styling Premium'
                  ].map((specialty, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-2 font-body text-foreground"
                    >
                      <Scissors className="w-4 h-4 text-primary" />
                      {specialty}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="text-center group animate-in zoom-in duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="font-heading text-4xl mb-2 text-foreground">
                    {stat.value}
                  </div>
                  <div className="font-body text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h3 className="font-heading text-4xl md:text-5xl mb-6">
            PRONTO PARA A <span className="text-primary">TRANSFORMAÇÃO</span>?
          </h3>
          <p className="font-body text-lg text-muted-foreground mb-8">
            Agende seu horário e experimente o atendimento premium que você merece.
          </p>
          <button className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground font-body font-semibold text-lg rounded-lg hover:bg-primary/90 transition-colors">
            Agendar Horário
          </button>
        </div>
      </section>
    </div>
  );
};

export default Sobre;
