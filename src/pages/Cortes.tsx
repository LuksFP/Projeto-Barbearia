import SectionTitle from '@/components/SectionTitle';
import HaircutCard from '@/components/HaircutCard';
import lowFade from '@/assets/low-fade.jpg';
import taperFade from '@/assets/taper-fade.jpg';
import americano from '@/assets/americano.jpg';
import corteJaca from '@/assets/corte-jaca.jpg';

const Cortes = () => {
  const haircuts = [
    {
      image: lowFade,
      title: 'LOW FADE',
      description: 'Degradê baixo com transição suave e precisa, ideal para um visual moderno e profissional.'
    },
    {
      image: taperFade,
      title: 'TAPER FADE',
      description: 'Corte gradual que mantém comprimento no topo com laterais desvanecidas de forma natural.'
    },
    {
      image: americano,
      title: 'AMERICANO',
      description: 'Clássico atemporal com topo texturizado e laterais curtas, perfeito para qualquer ocasião.'
    },
    {
      image: corteJaca,
      title: 'CORTE JACA',
      description: 'Topete volumoso com laterais raspadas, o estilo que nunca sai de moda.'
    },
  ];

  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <SectionTitle 
            subtitle="Explore os estilos mais modernos e elegantes do momento"
          >
            CORTES <span className="text-primary">MODERNOS</span>
          </SectionTitle>

          {/* Gallery Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {haircuts.map((haircut, index) => (
              <HaircutCard
                key={index}
                image={haircut.image}
                title={haircut.title}
                description={haircut.description}
                delay={index * 100}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center space-y-6 animate-in fade-in duration-700">
            <h3 className="font-heading text-4xl">
              O CORTE <span className="text-primary">PERFEITO</span>
            </h3>
            <p className="font-body text-lg text-muted-foreground leading-relaxed">
              Cada corte é executado com técnica impecável, utilizando as melhores 
              ferramentas profissionais. Nosso compromisso é entregar não apenas um 
              corte de cabelo, mas uma experiência premium que eleva seu estilo e confiança.
            </p>
            <p className="font-body text-lg text-muted-foreground leading-relaxed">
              Todos os cortes incluem lavagem, finalização com produtos premium e 
              orientações personalizadas para manutenção em casa.
            </p>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <SectionTitle subtitle="Como funciona o atendimento premium">
            NOSSO <span className="text-primary">PROCESSO</span>
          </SectionTitle>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'CONSULTA',
                desc: 'Conversamos sobre seu estilo e preferências para criar o corte ideal.'
              },
              {
                step: '02',
                title: 'EXECUÇÃO',
                desc: 'Aplicamos técnicas precisas com atenção aos mínimos detalhes.'
              },
              {
                step: '03',
                title: 'FINALIZAÇÃO',
                desc: 'Styling profissional com produtos premium e dicas de manutenção.'
              }
            ].map((item, index) => (
              <div
                key={index}
                className="text-center space-y-4 animate-in fade-in zoom-in duration-500"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="font-heading text-6xl text-primary/20">
                  {item.step}
                </div>
                <h4 className="font-heading text-2xl">{item.title}</h4>
                <p className="font-body text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto text-center max-w-3xl">
          <h3 className="font-heading text-4xl md:text-5xl mb-6">
            ENCONTRE SEU <span className="text-primary">ESTILO</span>
          </h3>
          <p className="font-body text-lg text-muted-foreground mb-8">
            Agende agora e transforme seu visual com um corte profissional.
          </p>
          <button className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground font-body font-semibold text-lg rounded-lg hover:bg-primary/90 transition-colors">
            Agendar Horário
          </button>
        </div>
      </section>
    </div>
  );
};

export default Cortes;
