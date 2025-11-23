import { Button } from '@/components/ui/button';
import { Scissors } from 'lucide-react';

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
              <Button size="lg" variant="outline" className="font-body font-semibold text-lg px-8 py-6">
                Ver Cortes
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Info Cards */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'ESPECIALISTAS', desc: 'Barbeiros certificados e experientes' },
              { title: 'PREMIUM', desc: 'Atendimento de alta qualidade' },
              { title: 'MODERNO', desc: 'Cortes e estilos atualizados' },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-card p-8 rounded-xl border border-border hover:border-primary transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group"
              >
                <h3 className="font-heading text-3xl mb-4 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="font-body text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
