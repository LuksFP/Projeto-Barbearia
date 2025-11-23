import { Card, CardContent } from '@/components/ui/card';

interface HairTypeCardProps {
  image: string;
  title: string;
  description: string;
  tips: string[];
  delay?: number;
}

const HairTypeCard = ({ image, title, description, tips, delay = 0 }: HairTypeCardProps) => {
  return (
    <Card 
      className="group overflow-hidden border-border hover:border-primary transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 animate-in fade-in zoom-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative overflow-hidden h-64">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-4 left-4 bg-primary px-4 py-2 rounded-lg">
          <span className="font-heading text-xl text-primary-foreground">{title}</span>
        </div>
      </div>
      <CardContent className="p-6">
        <p className="font-body text-muted-foreground mb-4">{description}</p>
        <div className="space-y-2">
          <h4 className="font-heading text-xl text-foreground">Dicas:</h4>
          <ul className="space-y-1">
            {tips.map((tip, index) => (
              <li key={index} className="font-body text-sm text-muted-foreground flex items-start">
                <span className="text-primary mr-2">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default HairTypeCard;
