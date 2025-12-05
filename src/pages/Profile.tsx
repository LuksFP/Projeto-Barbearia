import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { User, Package, LogOut, Calendar, Shield, Crown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Order } from '@/types/product';
import { Appointment } from '@/types/appointment';
import AppointmentCard from '@/components/AppointmentCard';
import { Badge } from '@/components/ui/badge';

const Profile = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const storedOrders = localStorage.getItem('userOrders');
    if (storedOrders) {
      setOrders(JSON.parse(storedOrders));
    }

    const storedAppointments = localStorage.getItem('userAppointments');
    if (storedAppointments) {
      setAppointments(JSON.parse(storedAppointments));
    }
  }, []);

  if (!user) return null;

  const getStatusColor = (status: Order['status']) => {
    const colors = {
      pending: 'text-yellow-600',
      processing: 'text-blue-600',
      shipped: 'text-purple-600',
      delivered: 'text-green-600',
    };
    return colors[status];
  };

  const getStatusText = (status: Order['status']) => {
    const texts = {
      pending: 'Pendente',
      processing: 'Em Processamento',
      shipped: 'Enviado',
      delivered: 'Entregue',
    };
    return texts[status];
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-5xl">
            <span className="text-primary">MEU</span> PERFIL
          </h1>
          <Button variant="outline" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>

        {/* Informações do usuário */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-heading text-2xl flex items-center gap-2">
              <User className="w-6 h-6 text-primary" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div>
                <label className="text-sm text-muted-foreground font-body">Nome</label>
                <p className="font-heading text-xl">{user.name}</p>
              </div>
              {user.role === 'admin' && (
                <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
              {user.role === 'subscription' && (
                <Badge className="bg-amber-500/20 text-amber-600 hover:bg-amber-500/30">
                  <Crown className="w-3 h-3 mr-1" />
                  VIP
                </Badge>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground font-body">Email</label>
              <p className="font-body">{user.email}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground font-body">Tipo de Conta</label>
              <p className="font-body capitalize">
                {user.role === 'admin' ? 'Administrador' : user.role === 'subscription' ? 'Cliente Assinatura' : 'Cliente'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Agendamentos */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-heading text-2xl flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary" />
              Meus Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground font-body mb-4">
                  Você ainda não tem agendamentos.
                </p>
                <Button onClick={() => navigate('/agendamento')}>
                  Agendar Horário
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico de pedidos */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              Histórico de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground font-body py-8">
                Você ainda não realizou nenhum pedido.
              </p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-border rounded-lg p-4 hover:border-primary transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-heading text-lg">Pedido #{order.id}</p>
                        <p className="text-sm text-muted-foreground font-body">
                          {new Date(order.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className={`font-heading ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="font-body">
                            {item.quantity}x {item.product.name}
                          </span>
                          <span className="font-body">
                            R$ {(item.product.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-border">
                      <span className="font-heading text-lg">Total</span>
                      <span className="font-heading text-xl text-primary">
                        R$ {order.total.toFixed(2)}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => navigate(`/rastreamento?order=${order.id}`)}
                    >
                      Rastrear Pedido
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
