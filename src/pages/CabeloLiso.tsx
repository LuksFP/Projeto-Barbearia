import SectionTitle from '@/components/SectionTitle';
import HaircutCard from '@/components/HaircutCard';
import galeria1 from '@/assets/galeria-liso-1.jpg';
import galeria2 from '@/assets/galeria-liso-2.jpg';
import lowFadeImg from '@/assets/low-fade.jpg';
import taperFadeImg from '@/assets/taper-fade.jpg';

const CabeloLiso = () => {
  const haircuts = [
    {
      image: galeria1,
      title: 'CLÁSSICO ELEGANTE',
      description: 'Corte clássico com laterais bem definidas e volume controlado',
    },
    {
      image: galeria2,
      title: 'FADE MODERNO',
      description: 'Degradê suave com acabamento impecável para cabelos lisos',
    },
    {
      image: lowFadeImg,
      title: 'LOW FADE',
      description: 'Transição baixa perfeita para cabelos lisos e finos',
    },
    {
      image: taperFadeImg,
      title: 'TAPER CLÁSSICO',
      description: 'Estilo atemporal que valoriza a textura lisa natural',
    },
  ];

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 py-12">
        <SectionTitle subtitle="ESPECIALIDADE">
          CABELO <span className="text-primary">LISO</span>
        </SectionTitle>
        
        <p className="text-center text-muted-foreground font-body mb-12 max-w-3xl mx-auto text-lg">
          Trabalhos especializados em cabelo liso, com técnicas que valorizam a textura natural 
          e criam visuais sofisticados e modernos. Cada corte é pensado para realçar as características 
          únicas do cabelo liso.
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

export default CabeloLiso;
