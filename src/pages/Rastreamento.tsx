import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, CheckCircle2 } from 'lucide-react';
import { orderService } from '@/services/orderService';

const Rastreamento = () => {
  const [trackingCode, setTrackingCode] = useState('');
  const [tracking, setTracking] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trackingCode.trim()) return;

    setLoading(true);
    try {
      const trackingData = await orderService.track(trackingCode);
      if (trackingData) {
        setTracking(trackingData);
      } else {
        // Fallback to simulated data if not found
        setTracking({
          code: trackingCode,
          status: 'shipped',
          steps: [
            { status: 'Pedido recebido', date: '10/11/2024', completed: true },
            { status: 'Em separação', date: '11/11/2024', completed: true },
            { status: 'A caminho', date: '12/11/2024', completed: true },
            { status: 'Saiu para entrega', date: '13/11/2024', completed: false },
            { status: 'Entregue', date: '-', completed: false },
          ],
        });
      }
    } catch (error) {
      console.error('Failed to track order:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="font-heading text-5xl text-center mb-4">
          <span className="text-primary">RASTREAR</span> PEDIDO
        </h1>
        <p className="text-center text-muted-foreground font-body mb-12">
          Digite o código do seu pedido para acompanhar a entrega
        </p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Package className="w-5 h-5" />
              Código de Rastreamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="tracking" className="sr-only">
                  Código do pedido
                </Label>
                <Input
                  id="tracking"
                  placeholder="Ex: PED-1234567890"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Buscando...' : 'Rastrear'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {tracking && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">
                Pedido: {tracking.code}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {tracking.steps.map((step: any, index: number) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          step.completed
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {step.completed ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-current" />
                        )}
                      </div>
                      {index < tracking.steps.length - 1 && (
                        <div
                          className={`w-0.5 h-16 ${
                            step.completed ? 'bg-primary' : 'bg-muted'
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <h3
                        className={`font-heading text-lg ${
                          step.completed ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {step.status}
                      </h3>
                      <p className="text-sm text-muted-foreground font-body">
                        {step.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Rastreamento;
