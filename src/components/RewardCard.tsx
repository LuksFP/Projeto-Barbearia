import { Reward } from '@/types/loyalty';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Tag, Package } from 'lucide-react';
import { useLoyalty } from '@/contexts/LoyaltyContext';

interface RewardCardProps {
  reward: Reward;
}

const RewardCard = ({ reward }: RewardCardProps) => {
  const { loyaltyProfile, redeemReward } = useLoyalty();

  const categoryIcons = {
    discount: Tag,
    service: Gift,
    product: Package,
  };

  const categoryLabels = {
    discount: 'Desconto',
    service: 'Serviço',
    product: 'Produto',
  };

  const Icon = categoryIcons[reward.category];
  const canRedeem = (loyaltyProfile?.points.available || 0) >= reward.pointsCost;

  const handleRedeem = () => {
    redeemReward(reward);
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:border-primary/50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-heading text-xl text-foreground group-hover:text-primary transition-colors">
                {reward.name}
              </h3>
              <Badge variant="outline" className="ml-2">
                {categoryLabels[reward.category]}
              </Badge>
            </div>
            <p className="text-muted-foreground font-body text-sm mb-3">
              {reward.description}
            </p>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-heading text-primary">
                  {reward.pointsCost}
                </span>
                <span className="text-muted-foreground font-body ml-1">pontos</span>
              </div>
              <span className="text-muted-foreground font-body">
                Valor: {reward.value}
              </span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleRedeem}
          disabled={!canRedeem || !reward.available}
          className="w-full"
          variant={canRedeem ? 'default' : 'outline'}
        >
          {!reward.available
            ? 'Indisponível'
            : canRedeem
            ? 'Resgatar Agora'
            : `Faltam ${reward.pointsCost - (loyaltyProfile?.points.available || 0)} pontos`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RewardCard;
