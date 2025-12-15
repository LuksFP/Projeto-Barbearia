import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ImageWithSkeleton from './ImageWithSkeleton';

interface HaircutCardProps {
  image: string;
  title: string;
  description: string;
  delay?: number;
}

const HaircutCard = ({ image, title, description, delay = 0 }: HaircutCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: delay / 1000 }}
    >
      <Card className="group overflow-hidden border-border hover:border-primary/50 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 bg-card hover-lift cursor-pointer">
        <div className="relative overflow-hidden aspect-square">
          {/* Image with skeleton */}
          <ImageWithSkeleton
            src={image}
            alt={title}
            className="transition-transform duration-700 ease-out group-hover:scale-110"
            aspectRatio="square"
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-barber-black via-barber-black/40 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none" />
          
          {/* Decorative corners */}
          <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-primary/0 group-hover:border-primary transition-colors duration-500 pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-primary/0 group-hover:border-primary transition-colors duration-500 pointer-events-none" />
          
          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6 pointer-events-none">
            <div className="transform transition-all duration-500 group-hover:-translate-y-2">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 bg-primary/90 backdrop-blur-sm px-3 py-1 rounded-full mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <span className="text-xs font-body font-semibold text-primary-foreground uppercase tracking-wide">Ver detalhes</span>
                <ArrowRight className="w-3 h-3 text-primary-foreground" />
              </div>
              
              <h3 className="font-heading text-2xl md:text-3xl text-white mb-1.5 drop-shadow-lg">
                {title}
              </h3>
              <p className="font-body text-sm md:text-base text-white/80">
                {description}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default HaircutCard;
