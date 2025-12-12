import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Order } from '@/types/product';
import { CheckCircle2, Package } from 'lucide-react';
import { orderService } from '@/services/orderService';

const OrderConfirmation = () => {
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const lastOrder = await orderService.getLastOrder();
        if (lastOrder) {
          setOrder(lastOrder);
        } else {
          navigate('/loja');
        }
      } catch (error) {
        console.error('Failed to load order:', error);
        navigate('/loja');
      }
    };
    loadOrder();
  }, [navigate]);

  if (!order) return null;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <CheckCircle2 className="w-20 h-20 text-primary mx-auto mb-4" />
          <h1 className="font-heading text-5xl mb-4">
            <span className="text-primary">PEDIDO</span> CONFIRMADO
          </h1>
          <p className="text-muted-foreground font-body text-lg">
            Seu pedido foi realizado com sucesso!
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Package className="w-5 h-5" />
              Detalhes do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between font-body">
              <span className="text-muted-foreground">Número do Pedido:</span>
              <span className="font-heading">{order.id}</span>
            </div>
            <div className="flex justify-between font-body">
              <span className="text-muted-foreground">Data:</span>
              <span>{new Date(order.date).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex justify-between font-body">
              <span className="text-muted-foreground">Status:</span>
              <span className="text-primary font-heading uppercase">
                {order.status === 'pending' ? 'Pendente' : order.status}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-heading">Itens do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-4 border-b border-border pb-4 last:border-0"
              >
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <h4 className="font-heading">{item.product.name}</h4>
                  <p className="text-sm text-muted-foreground font-body">
                    Quantidade: {item.quantity}
                  </p>
                </div>
                <span className="font-heading text-primary">
                  R$ {(item.product.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between font-body">
                <span>Subtotal:</span>
                <span>R$ {order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-body">
                <span>Frete:</span>
                <span>R$ {order.shippingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl border-t border-border pt-2">
                <span className="font-heading">Total:</span>
                <span className="font-heading text-primary">
                  R$ {order.total.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-heading">Endereço de Entrega</CardTitle>
          </CardHeader>
          <CardContent className="font-body text-muted-foreground">
            <p>{order.shipping.name}</p>
            <p>{order.shipping.email}</p>
            <p>{order.shipping.phone}</p>
            <p className="mt-2">
              {order.shipping.address}, {order.shipping.number}
              {order.shipping.complement && ` - ${order.shipping.complement}`}
            </p>
            <p>
              {order.shipping.city} - {order.shipping.state}
            </p>
            <p>CEP: {order.shipping.cep}</p>
          </CardContent>
        </Card>

        <div className="text-center space-y-4">
          <p className="text-muted-foreground font-body">
            Enviamos um email de confirmação para {order.shipping.email}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/rastreamento')}>
              Rastrear Pedido
            </Button>
            <Button variant="outline" onClick={() => navigate('/loja')}>
              Continuar Comprando
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
