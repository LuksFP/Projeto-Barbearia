import SectionTitle from '@/components/SectionTitle';
import HaircutCard from '@/components/HaircutCard';
import galeria1 from '@/assets/galeria-ondulado-1.jpg';
import galeria2 from '@/assets/galeria-ondulado-2.jpg';
import americanoImg from '@/assets/americano.jpg';
import midFadeImg from '@/assets/mid-fade.jpg';

const CabeloOndulado = () => {
  const haircuts = [
    {
      image: galeria1,
      title: 'TEXTURA NATURAL',
      description: 'Corte que valoriza as ondas naturais com volume controlado',
    },
    {
      image: galeria2,
      title: 'FADE TEXTURIZADO',
      description: 'Degradê moderno com acabamento que realça as ondulações',
    },
    {
      image: americanoImg,
      title: 'AMERICANO ONDULADO',
      description: 'Estilo clássico adaptado para cabelos ondulados',
    },
    {
      image: midFadeImg,
      title: 'MID FADE',
      description: 'Transição média perfeita para valorizar cabelos ondulados',
    },
  ];

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 py-12">
        <SectionTitle subtitle="ESPECIALIDADE">
          CABELO <span className="text-primary">ONDULADO</span>
        </SectionTitle>
        
        <p className="text-center text-muted-foreground font-body mb-12 max-w-3xl mx-auto text-lg">
          Especialização em cabelos ondulados, com técnicas que controlam o volume e definem 
          as ondas naturais. Cada corte é personalizado para trabalhar com a textura única 
          do seu cabelo.
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

export default CabeloOndulado;
