import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useLoyalty } from '@/contexts/LoyaltyContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShippingInfo, Order } from '@/types/product';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const Checkout = () => {
  const { items, subtotal, clearCart } = useCart();
  const { addPoints } = useLoyalty();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [formData, setFormData] = useState<ShippingInfo>({
    name: '',
    email: '',
    phone: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    city: '',
    state: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('');

  const calculateShipping = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const cepNumber = formData.cep.replace(/\D/g, '');
    if (cepNumber.length === 8) {
      setShippingCost(9.90);
      setFormData((prev) => ({
        ...prev,
        city: 'São Paulo',
        state: 'SP',
      }));
      toast({
        title: 'Frete calculado',
        description: 'Frete de R$ 9,90 para sua região',
      });
    } else {
      toast({
        title: 'CEP inválido',
        description: 'Por favor, insira um CEP válido',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentMethod || shippingCost === null) {
      toast({
        title: 'Dados incompletos',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    const order: Order = {
      id: `PED-${Date.now()}`,
      items,
      shipping: formData,
      subtotal,
      shippingCost,
      total: subtotal + shippingCost,
      paymentMethod,
      date: new Date().toISOString(),
      status: 'pending',
    };

    // Salvar no localStorage geral
    localStorage.setItem('lastOrder', JSON.stringify(order));

    // Salvar no histórico do usuário
    const existingOrders = JSON.parse(localStorage.getItem('userOrders') || '[]');
    existingOrders.push(order);
    localStorage.setItem('userOrders', JSON.stringify(existingOrders));

    // Adicionar pontos de fidelidade (1 ponto por real gasto)
    const pointsEarned = Math.floor(subtotal + shippingCost);
    addPoints(pointsEarned, `Compra no valor de R$ ${(subtotal + shippingCost).toFixed(2)}`, order.id);

    clearCart();
    navigate('/confirmacao');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center py-16">
            <h1 className="font-heading text-4xl mb-4">Carrinho Vazio</h1>
            <p className="text-muted-foreground font-body mb-8">
              Adicione produtos ao carrinho para continuar
            </p>
            <Button onClick={() => navigate('/loja')}>Ir para Loja</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4">
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl text-center mb-6 sm:mb-8 md:mb-12">
          <span className="text-primary">FINALIZAR</span> COMPRA
        </h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="font-heading text-lg sm:text-xl">Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                <div>
                  <Label htmlFor="name" className="text-sm">Nome Completo *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="font-heading text-lg sm:text-xl">Endereço de Entrega</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Label htmlFor="cep" className="text-sm">CEP *</Label>
                    <Input
                      id="cep"
                      required
                      placeholder="00000-000"
                      value={formData.cep}
                      onChange={(e) =>
                        setFormData({ ...formData, cep: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={calculateShipping}
                    disabled={loading}
                    className="sm:mt-6 w-full sm:w-auto"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Calcular'
                    )}
                  </Button>
                </div>
                <div>
                  <Label htmlFor="address">Endereço *</Label>
                  <Input
                    id="address"
                    required
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="number" className="text-sm">Número *</Label>
                    <Input
                      id="number"
                      required
                      value={formData.number}
                      onChange={(e) =>
                        setFormData({ ...formData, number: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="complement" className="text-sm">Complemento</Label>
                    <Input
                      id="complement"
                      value={formData.complement}
                      onChange={(e) =>
                        setFormData({ ...formData, complement: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="city" className="text-sm">Cidade *</Label>
                    <Input
                      id="city"
                      required
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-sm">Estado *</Label>
                    <Input
                      id="state"
                      required
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="font-heading text-lg sm:text-xl">Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit">Cartão de Débito</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="font-heading text-lg sm:text-xl">Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex justify-between text-sm font-body"
                    >
                      <span>
                        {item.product.name} x{item.quantity}
                      </span>
                      <span>
                        R$ {(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between font-body">
                    <span>Subtotal:</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-body">
                    <span>Frete:</span>
                    <span>
                      {shippingCost !== null
                        ? `R$ ${shippingCost.toFixed(2)}`
                        : 'Calcular'}
                    </span>
                  </div>
                </div>
                <div className="border-t border-border pt-4 flex justify-between text-xl">
                  <span className="font-heading">Total:</span>
                  <span className="font-heading text-primary">
                    R${' '}
                    {shippingCost !== null
                      ? (subtotal + shippingCost).toFixed(2)
                      : subtotal.toFixed(2)}
                  </span>
                </div>
                <Button type="submit" className="w-full" size="lg">
                  Confirmar Pedido
                </Button>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
