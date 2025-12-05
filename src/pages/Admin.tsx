import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Appointment } from '@/types/appointment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Calendar, Users, Clock, CheckCircle, XCircle, Crown, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

const Admin = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<StoredUser[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'admin') {
      navigate('/');
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para acessar esta página',
        variant: 'destructive',
      });
      return;
    }
  }, [isAuthenticated, user, navigate, toast]);

  useEffect(() => {
    const storedAppointments = localStorage.getItem('userAppointments');
    if (storedAppointments) {
      setAppointments(JSON.parse(storedAppointments));
    }

    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    }
  }, []);

  const serviceLabels: Record<string, string> = {
    corte: 'Corte de Cabelo',
    barba: 'Barba',
    combo: 'Corte + Barba',
    tratamento: 'Tratamento Especial',
  };

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-500/20 text-blue-500',
    completed: 'bg-green-500/20 text-green-500',
    cancelled: 'bg-red-500/20 text-red-500',
  };

  const statusLabels: Record<string, string> = {
    scheduled: 'Agendado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };

  const roleLabels: Record<UserRole, string> = {
    admin: 'Administrador',
    client: 'Cliente',
    subscription: 'Assinante VIP',
  };

  const roleIcons: Record<UserRole, React.ReactNode> = {
    admin: <Shield className="w-4 h-4" />,
    client: <User className="w-4 h-4" />,
    subscription: <Crown className="w-4 h-4" />,
  };

  const roleBadgeColors: Record<UserRole, string> = {
    admin: 'bg-primary/20 text-primary',
    client: 'bg-muted text-muted-foreground',
    subscription: 'bg-amber-500/20 text-amber-600',
  };

  const updateAppointmentStatus = (id: string, status: Appointment['status']) => {
    const updated = appointments.map(app => 
      app.id === id ? { ...app, status } : app
    );
    setAppointments(updated);
    localStorage.setItem('userAppointments', JSON.stringify(updated));
    toast({
      title: 'Status atualizado',
      description: `Agendamento marcado como ${statusLabels[status].toLowerCase()}`,
    });
  };

  const updateUserRole = (userId: string, newRole: UserRole) => {
    const updatedUsers = users.map(u =>
      u.id === userId ? { ...u, role: newRole } : u
    );
    setUsers(updatedUsers);
    localStorage.setItem('users', JSON.stringify(updatedUsers));

    // Update currentUser if it's the same user
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.id === userId) {
      localStorage.setItem('currentUser', JSON.stringify({ ...currentUser, role: newRole }));
    }

    toast({
      title: 'Permissão atualizada',
      description: `Usuário atualizado para ${roleLabels[newRole]}`,
    });
  };

  const stats = {
    total: appointments.length,
    scheduled: appointments.filter(a => a.status === 'scheduled').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  const userStats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    clients: users.filter(u => u.role === 'client').length,
    subscribers: users.filter(u => u.role === 'subscription').length,
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="font-heading text-4xl md:text-5xl">
            <span className="text-primary">PAINEL</span> ADMIN
          </h1>
        </div>

        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="appointments" className="gap-2">
              <Calendar className="w-4 h-4" />
              Agendamentos
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Usuários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-heading">{stats.total}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-heading">{stats.scheduled}</p>
                    <p className="text-sm text-muted-foreground">Agendados</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-heading">{stats.completed}</p>
                    <p className="text-sm text-muted-foreground">Concluídos</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-red-500" />
                  <div>
                    <p className="text-2xl font-heading">{stats.cancelled}</p>
                    <p className="text-sm text-muted-foreground">Cancelados</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Appointments Table */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-2xl flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-primary" />
                  Agendamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum agendamento encontrado
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Serviço</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Horário</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appointments.map((appointment) => (
                          <TableRow key={appointment.id}>
                            <TableCell>
                              <div>
                                <p className="font-heading">{appointment.customerName}</p>
                                <p className="text-xs text-muted-foreground">{appointment.customerPhone}</p>
                              </div>
                            </TableCell>
                            <TableCell>{serviceLabels[appointment.service]}</TableCell>
                            <TableCell>
                              {format(new Date(appointment.date), "d 'de' MMM", { locale: ptBR })}
                            </TableCell>
                            <TableCell>{appointment.time}</TableCell>
                            <TableCell>
                              <Badge className={statusColors[appointment.status]}>
                                {statusLabels[appointment.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {appointment.status === 'scheduled' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-500 border-green-500/50 hover:bg-green-500/10"
                                      onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-500 border-red-500/50 hover:bg-red-500/10"
                                      onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* User Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Users className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-heading">{userStats.total}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Shield className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-heading">{userStats.admins}</p>
                    <p className="text-sm text-muted-foreground">Admins</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <User className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-heading">{userStats.clients}</p>
                    <p className="text-sm text-muted-foreground">Clientes</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Crown className="w-8 h-8 text-amber-500" />
                  <div>
                    <p className="text-2xl font-heading">{userStats.subscribers}</p>
                    <p className="text-sm text-muted-foreground">Assinantes</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-2xl flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  Gerenciar Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Cadastro</TableHead>
                          <TableHead>Permissão</TableHead>
                          <TableHead>Alterar Permissão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <p className="font-heading">{u.name}</p>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {u.email}
                            </TableCell>
                            <TableCell>
                              {format(new Date(u.createdAt), "d/MM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${roleBadgeColors[u.role]} gap-1`}>
                                {roleIcons[u.role]}
                                {roleLabels[u.role]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={u.role}
                                onValueChange={(value) => updateUserRole(u.id, value as UserRole)}
                                disabled={u.id === user?.id}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">
                                    <div className="flex items-center gap-2">
                                      <Shield className="w-4 h-4" />
                                      Administrador
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="client">
                                    <div className="flex items-center gap-2">
                                      <User className="w-4 h-4" />
                                      Cliente
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="subscription">
                                    <div className="flex items-center gap-2">
                                      <Crown className="w-4 h-4" />
                                      Assinante VIP
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
