import SectionTitle from '@/components/SectionTitle';
import HaircutCard from '@/components/HaircutCard';
import galeria1 from '@/assets/galeria-crespo-1.jpg';
import galeria2 from '@/assets/galeria-crespo-2.jpg';
import corteJacaImg from '@/assets/corte-jaca.jpg';
import lowFadeImg from '@/assets/low-fade.jpg';

const CabeloCrespo = () => {
  const haircuts = [
    {
      image: galeria1,
      title: 'AFRO MODERNO',
      description: 'Corte que celebra e define os cachos naturais com estilo',
    },
    {
      image: galeria2,
      title: 'FADE AFRO',
      description: 'Degradê especializado que trabalha a textura crespa com perfeição',
    },
    {
      image: corteJacaImg,
      title: 'JACA CRESPO',
      description: 'Estilo brasileiro clássico adaptado para cabelos crespos',
    },
    {
      image: lowFadeImg,
      title: 'LOW FADE AFRO',
      description: 'Transição baixa que valoriza o volume e textura natural',
    },
  ];

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 py-12">
        <SectionTitle subtitle="ESPECIALIDADE">
          CABELO <span className="text-primary">CRESPO</span>
        </SectionTitle>
        
        <p className="text-center text-muted-foreground font-body mb-12 max-w-3xl mx-auto text-lg">
          Especialista em cabelos crespos e afro, com domínio de técnicas que respeitam e 
          valorizam a textura natural. Cada corte é executado com conhecimento profundo das 
          necessidades específicas dos cachos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {haircuts.map((haircut, index) => (
            <HaircutCard key={haircut.title} {...haircut} delay={index * 100} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CabeloCrespo;
