import { useState } from 'react';
import { testimonials } from '@/data/testimonials';
import TestimonialCard from '@/components/TestimonialCard';
import SectionTitle from '@/components/SectionTitle';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { ServiceType } from '@/types/appointment';

const Depoimentos = () => {
  const [selectedFilter, setSelectedFilter] = useState<ServiceType | 'all'>('all');

  const filters = [
    { id: 'all', name: 'Todos' },
    { id: 'corte', name: 'Cortes' },
    { id: 'barba', name: 'Barba' },
    { id: 'combo', name: 'Combo' },
    { id: 'tratamento', name: 'Tratamentos' },
  ];

  const filteredTestimonials =
    selectedFilter === 'all'
      ? testimonials
      : testimonials.filter((t) => t.service === selectedFilter);

  const averageRating = (
    testimonials.reduce((acc, t) => acc + t.rating, 0) / testimonials.length
  ).toFixed(1);

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <SectionTitle subtitle="Veja o que nossos clientes têm a dizer">
            DEPOIMENTOS <span className="text-primary">& AVALIAÇÕES</span>
          </SectionTitle>

          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-8 h-8 fill-primary text-primary" />
              ))}
            </div>
            <span className="text-4xl font-heading text-primary ml-2">
              {averageRating}
            </span>
            <span className="text-muted-foreground font-body">
              ({testimonials.length} avaliações)
            </span>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant={selectedFilter === filter.id ? 'default' : 'outline'}
              onClick={() => setSelectedFilter(filter.id as ServiceType | 'all')}
              className="font-body"
            >
              {filter.name}
            </Button>
          ))}
        </div>

        {/* Grid de Depoimentos */}
        <div className="grid md:grid-cols-2 gap-8">
          {filteredTestimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>

        {filteredTestimonials.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground font-body text-lg">
              Nenhum depoimento encontrado para este filtro.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Depoimentos;
