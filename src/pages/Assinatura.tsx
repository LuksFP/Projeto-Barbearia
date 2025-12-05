import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Calendar, CreditCard, XCircle, Sparkles, Percent, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Assinatura = () => {
  const { user, isAuthenticated } = useAuth();
  const { subscription, isSubscribed, discountPercentage, subscribe, cancelSubscription } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  const benefits = [
    { icon: Percent, text: '15% de desconto em todos os produtos' },
    { icon: Clock, text: 'Prioridade nos agendamentos' },
    { icon: Sparkles, text: 'Acesso antecipado a novos produtos' },
    { icon: Crown, text: 'Atendimento VIP exclusivo' },
  ];

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Crown className="w-8 h-8 text-amber-500" />
          <h1 className="font-heading text-4xl md:text-5xl">
            <span className="text-primary">CLUBE</span> VIP
          </h1>
        </div>

        {/* Status da Assinatura */}
        {isSubscribed && subscription && (
          <Card className="mb-8 border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-transparent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-2xl flex items-center gap-2">
                  <Crown className="w-6 h-6 text-amber-500" />
                  Sua Assinatura
                </CardTitle>
                <Badge className="bg-amber-500/20 text-amber-600">
                  {subscription.status === 'active' ? 'Ativa' : 'Cancelada'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Plano</p>
                    <p className="font-heading">{subscription.plan === 'monthly' ? 'Mensal' : 'Anual'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Início</p>
                    <p className="font-heading">
                      {format(new Date(subscription.startDate), "d 'de' MMM, yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Próxima Renovação</p>
                    <p className="font-heading">
                      {format(new Date(subscription.renewalDate), "d 'de' MMM, yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Seu desconto atual</p>
                <p className="font-heading text-3xl text-amber-500">{discountPercentage}% OFF</p>
                <p className="text-sm text-muted-foreground">em todos os produtos da loja</p>
              </div>

              {subscription.status === 'active' && (
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/50 hover:bg-destructive/10"
                  onClick={cancelSubscription}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar Assinatura
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Benefícios */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Benefícios Exclusivos</CardTitle>
            <CardDescription>Vantagens de ser um cliente VIP</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="p-2 rounded-full bg-amber-500/20">
                    <benefit.icon className="w-5 h-5 text-amber-500" />
                  </div>
                  <span className="font-body">{benefit.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Planos */}
        {!isSubscribed && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="relative overflow-hidden">
              <CardHeader>
                <CardTitle className="font-heading text-2xl">Plano Mensal</CardTitle>
                <CardDescription>Flexibilidade para você</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="font-heading text-4xl">R$ 49,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <ul className="space-y-2">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {benefit.text}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" onClick={() => subscribe('monthly')}>
                  Assinar Mensal
                </Button>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-amber-500/50">
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs px-3 py-1 font-heading">
                MAIS POPULAR
              </div>
              <CardHeader>
                <CardTitle className="font-heading text-2xl">Plano Anual</CardTitle>
                <CardDescription>Economize 20%</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="font-heading text-4xl">R$ 479,90</span>
                  <span className="text-muted-foreground">/ano</span>
                  <p className="text-sm text-amber-500">Equivale a R$ 39,99/mês</p>
                </div>
                <ul className="space-y-2">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {benefit.text}
                    </li>
                  ))}
                </ul>
                <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => subscribe('yearly')}>
                  <Crown className="w-4 h-4 mr-2" />
                  Assinar Anual
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Assinatura;
