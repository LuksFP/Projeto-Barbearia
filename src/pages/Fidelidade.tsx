import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLoyalty } from '@/contexts/LoyaltyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { rewards, tierBenefits } from '@/data/rewards';
import RewardCard from '@/components/RewardCard';
import SectionTitle from '@/components/SectionTitle';
import { Trophy, TrendingUp, Gift, History, Star, Award } from 'lucide-react';

const Fidelidade = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { loyaltyProfile, getCurrentTier, getNextTier } = useLoyalty();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!loyaltyProfile) return null;

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();
  const tierInfo = tierBenefits[currentTier];
  const progressToNextTier = nextTier
    ? ((loyaltyProfile.points.total - tierBenefits[currentTier].minPoints) /
        (tierBenefits[nextTier.tier].minPoints - tierBenefits[currentTier].minPoints)) *
      100
    : 100;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 py-12">
        <SectionTitle subtitle="Acumule pontos e ganhe recompensas exclusivas">
          PROGRAMA DE <span className="text-primary">FIDELIDADE</span>
        </SectionTitle>

        {/* Status do Usuário */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Pontos Disponíveis */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <Gift className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-body">
                    Pontos Disponíveis
                  </p>
                  <p className="text-4xl font-heading text-primary">
                    {loyaltyProfile.points.available}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total de Pontos */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-secondary rounded-lg">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-body">
                    Total Acumulado
                  </p>
                  <p className="text-4xl font-heading text-foreground">
                    {loyaltyProfile.points.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nível Atual */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-secondary rounded-lg">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-body">Seu Nível</p>
                  <p className={`text-4xl font-heading ${tierInfo.textColor}`}>
                    {tierInfo.name}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progresso para Próximo Nível */}
        {nextTier && (
          <Card className="mb-12">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading text-xl text-foreground mb-1">
                    Próximo Nível: {tierBenefits[nextTier.tier].name}
                  </h3>
                  <p className="text-muted-foreground font-body">
                    Faltam {nextTier.pointsNeeded} pontos
                  </p>
                </div>
                <Award className={`w-12 h-12 ${tierBenefits[nextTier.tier].textColor}`} />
              </div>
              <Progress value={progressToNextTier} className="h-3" />
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="rewards" className="space-y-8">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3">
            <TabsTrigger value="rewards" className="gap-2">
              <Gift className="w-4 h-4" />
              Recompensas
            </TabsTrigger>
            <TabsTrigger value="benefits" className="gap-2">
              <Star className="w-4 h-4" />
              Benefícios
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Recompensas Disponíveis */}
          <TabsContent value="rewards" className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="font-heading text-3xl text-foreground mb-2">
                Recompensas Disponíveis
              </h3>
              <p className="text-muted-foreground font-body">
                Escolha suas recompensas e aproveite os benefícios
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rewards.map((reward) => (
                <RewardCard key={reward.id} reward={reward} />
              ))}
            </div>
          </TabsContent>

          {/* Benefícios por Nível */}
          <TabsContent value="benefits" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {Object.entries(tierBenefits).map(([tier, info]) => (
                <Card
                  key={tier}
                  className={`${
                    currentTier === tier ? 'border-primary ring-2 ring-primary/20' : ''
                  }`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span
                        className={`font-heading text-2xl bg-gradient-to-r ${info.color} bg-clip-text text-transparent`}
                      >
                        {info.name}
                      </span>
                      {currentTier === tier && (
                        <Badge variant="default">Seu Nível Atual</Badge>
                      )}
                    </CardTitle>
                    <p className="text-muted-foreground font-body text-sm">
                      A partir de {info.minPoints} pontos
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {info.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="p-1 bg-primary/10 rounded-full mt-0.5">
                            <Star className="w-4 h-4 text-primary" />
                          </div>
                          <p className="font-body text-sm text-foreground">{benefit}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-2xl flex items-center gap-2">
                  <History className="w-6 h-6 text-primary" />
                  Histórico de Transações
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loyaltyProfile.transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground font-body py-8">
                    Nenhuma transação ainda
                  </p>
                ) : (
                  <div className="space-y-3">
                    {loyaltyProfile.transactions.slice(0, 20).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
                      >
                        <div>
                          <p className="font-body text-foreground">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-muted-foreground font-body">
                            {new Date(transaction.date).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div
                          className={`text-xl font-heading ${
                            transaction.type === 'earn'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {transaction.type === 'earn' ? '+' : '-'}
                          {transaction.points}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recompensas Resgatadas */}
            {loyaltyProfile.redeemedRewards.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-2xl flex items-center gap-2">
                    <Gift className="w-6 h-6 text-primary" />
                    Recompensas Resgatadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {loyaltyProfile.redeemedRewards.map((redeemed) => (
                      <div
                        key={redeemed.id}
                        className="p-4 border border-border rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-heading text-lg text-foreground">
                              {redeemed.reward.name}
                            </p>
                            <p className="text-sm text-muted-foreground font-body">
                              Código: <span className="font-mono">{redeemed.code}</span>
                            </p>
                          </div>
                          <Badge variant={redeemed.used ? 'secondary' : 'default'}>
                            {redeemed.used ? 'Usado' : 'Disponível'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-body">
                          Resgatado em:{' '}
                          {new Date(redeemed.redeemedAt).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-sm text-muted-foreground font-body">
                          Válido até:{' '}
                          {new Date(redeemed.expiresAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Fidelidade;
