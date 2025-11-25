import { Testimonial } from '@/types/appointment';
import { Card } from '@/components/ui/card';
import { Star } from 'lucide-react';

interface TestimonialCardProps {
  testimonial: Testimonial;
}

const TestimonialCard = ({ testimonial }: TestimonialCardProps) => {
  const serviceLabels = {
    corte: 'Corte',
    barba: 'Barba',
    combo: 'Corte + Barba',
    tratamento: 'Tratamento',
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group">
      <div className="grid md:grid-cols-2 gap-4 p-6">
        {/* Before and After Images */}
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-lg">
            <span className="absolute top-2 left-2 bg-background/90 text-foreground px-3 py-1 rounded-full text-sm font-heading z-10">
              Antes
            </span>
            <img
              src={testimonial.beforeImage}
              alt="Antes"
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="relative overflow-hidden rounded-lg">
            <span className="absolute top-2 left-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-heading z-10">
              Depois
            </span>
            <img
              src={testimonial.afterImage}
              alt="Depois"
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>

        {/* Review Content */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < testimonial.rating
                      ? 'fill-primary text-primary'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>

            <p className="font-body text-foreground mb-4 leading-relaxed">
              "{testimonial.comment}"
            </p>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="font-heading text-lg text-foreground mb-1">
              {testimonial.name}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-body">
                {serviceLabels[testimonial.service]}
              </span>
              <span className="text-sm text-muted-foreground font-body">
                {new Date(testimonial.date).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TestimonialCard;
