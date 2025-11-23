import { Card } from '@/components/ui/card';

interface HaircutCardProps {
  image: string;
  title: string;
  description: string;
  delay?: number;
}

const HaircutCard = ({ image, title, description, delay = 0 }: HaircutCardProps) => {
  return (
    <Card 
      className="group overflow-hidden border-border hover:border-primary transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative overflow-hidden aspect-square">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute inset-0 flex items-end p-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
          <div>
            <h3 className="font-heading text-3xl text-white mb-2">{title}</h3>
            <p className="font-body text-white/90">{description}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default HaircutCard;
