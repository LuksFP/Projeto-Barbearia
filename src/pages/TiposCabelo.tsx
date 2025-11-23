import SectionTitle from '@/components/SectionTitle';
import HairTypeCard from '@/components/HairTypeCard';
import cabeloLiso from '@/assets/cabelo-liso.jpg';
import cabeloOndulado from '@/assets/cabelo-ondulado.jpg';
import cabeloCrespo from '@/assets/cabelo-crespo.jpg';

const TiposCabelo = () => {
  const hairTypes = [
    {
      image: cabeloLiso,
      title: 'LISO',
      description: 'Cabelo liso requer técnicas específicas para criar volume e textura. Ideal para cortes modernos e estilos versáteis.',
      tips: [
        'Cortes em camadas para dar movimento',
        'Produtos texturizadores para volume',
        'Secagem com escova para modelar',
        'Finalização com cera leve'
      ]
    },
    {
      image: cabeloOndulado,
      title: 'ONDULADO',
      description: 'O cabelo ondulado oferece textura natural perfeita para estilos despojados. Versátil e fácil de estilizar.',
      tips: [
        'Cortes que valorizam as ondas',
        'Pomadas para definir textura',
        'Secagem natural ou difusor',
        'Produtos anti-frizz essenciais'
      ]
    },
    {
      image: cabeloCrespo,
      title: 'CRESPO',
      description: 'Cabelo crespo exige cuidados especiais e técnicas adequadas. Beleza natural que merece atenção profissional.',
      tips: [
        'Hidratação profunda regular',
        'Cortes que respeitam os cachos',
        'Produtos nutritivos específicos',
        'Técnicas de finalização adequadas'
      ]
    },
  ];

  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <SectionTitle 
            subtitle="Cada tipo de cabelo merece técnicas e cuidados específicos"
          >
            TIPOS DE <span className="text-primary">CABELO</span>
          </SectionTitle>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {hairTypes.map((type, index) => (
              <HairTypeCard
                key={index}
                image={type.image}
                title={type.title}
                description={type.description}
                tips={type.tips}
                delay={index * 150}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Expertise Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center space-y-6 mb-16 animate-in fade-in duration-700">
            <h3 className="font-heading text-4xl">
              EXPERTISE EM <span className="text-primary">TODOS OS TIPOS</span>
            </h3>
            <p className="font-body text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Nossa experiência abrange todos os tipos de cabelo. Utilizamos técnicas 
              específicas e produtos profissionais adequados para cada textura, garantindo 
              resultados impecáveis independente do seu tipo de cabelo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: 'ANÁLISE PROFISSIONAL',
                desc: 'Avaliamos a textura, densidade e características únicas do seu cabelo para escolher a melhor técnica.'
              },
              {
                title: 'PRODUTOS PREMIUM',
                desc: 'Utilizamos linhas profissionais específicas para cada tipo de cabelo, garantindo saúde e resultado.'
              },
              {
                title: 'TÉCNICAS ADAPTADAS',
                desc: 'Cada corte é executado com técnicas adequadas ao seu tipo de cabelo, respeitando suas características.'
              },
              {
                title: 'ORIENTAÇÃO PERSONALIZADA',
                desc: 'Ensinamos como cuidar e estilizar seu cabelo em casa, com dicas e recomendações profissionais.'
              }
            ].map((item, index) => (
              <div
                key={index}
                className="bg-card p-8 rounded-xl border border-border hover:border-primary transition-all duration-300 group animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <h4 className="font-heading text-2xl mb-4 group-hover:text-primary transition-colors">
                  {item.title}
                </h4>
                <p className="font-body text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h3 className="font-heading text-4xl mb-6">
            PRODUTOS <span className="text-primary">RECOMENDADOS</span>
          </h3>
          <p className="font-body text-lg text-muted-foreground mb-8">
            Além do corte perfeito, oferecemos produtos profissionais para você 
            manter seu estilo em casa. Confira nossa loja com pomadas, ceras, 
            finalizadores e muito mais.
          </p>
          <button className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground font-body font-semibold text-lg rounded-lg hover:bg-primary/90 transition-colors">
            Ver Produtos
          </button>
        </div>
      </section>
    </div>
  );
};

export default TiposCabelo;
