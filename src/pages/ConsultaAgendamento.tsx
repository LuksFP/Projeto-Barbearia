import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Calendar, Clock, Scissors, CheckCircle, XCircle, AlertCircle, Star } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Appointment } from '@/types/appointment';
import { appointmentService } from '@/services/appointmentService';

const ConsultaAgendamento = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searched, setSearched] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const serviceNames: Record<string, string> = {
    corte: 'Corte de Cabelo',
    barba: 'Barba',
    combo: 'Corte + Barba',
    tratamento: 'Tratamento Especial',
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email && !phone) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o email ou telefone para consultar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const found = await appointmentService.getByContact(email || undefined, phone || undefined);
      setAppointments(found);
      setSearched(true);

      if (found.length === 0) {
        toast({
          title: 'Nenhum agendamento encontrado',
          description: 'Verifique os dados informados e tente novamente.',
        });
      }
    } catch (error) {
      console.error('Failed to search appointments:', error);
      toast({
        title: 'Erro na busca',
        description: 'Ocorreu um erro ao buscar os agendamentos.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return (
          <Badge className="bg-blue-500/20 text-blue-600 gap-1">
            <AlertCircle className="w-3 h-3" />
            Agendado
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-500/20 text-green-600 gap-1">
            <CheckCircle className="w-3 h-3" />
            Concluído
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-500/20 text-red-600 gap-1">
            <XCircle className="w-3 h-3" />
            Cancelado
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleSubmitRating = async () => {
    if (!selectedAppointment || rating === 0) {
      toast({
        title: 'Avaliação obrigatória',
        description: 'Por favor, selecione uma nota.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await appointmentService.addRating(selectedAppointment.id, rating, review);

      // Update local state
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === selectedAppointment.id
            ? { ...apt, rating, review }
            : apt
        )
      );

      toast({
        title: 'Avaliação enviada!',
        description: 'Obrigado pelo seu feedback.',
      });

      setDialogOpen(false);
      setRating(0);
      setReview('');
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Failed to submit rating:', error);
      toast({
        title: 'Erro ao enviar avaliação',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-5xl mb-4">
            <span className="text-primary">CONSULTAR</span> AGENDAMENTO
          </h1>
          <p className="text-muted-foreground font-body text-lg">
            Informe seu email ou telefone para ver seus agendamentos
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-heading text-2xl flex items-center gap-2">
              <Search className="w-6 h-6 text-primary" />
              Buscar Agendamentos
            </CardTitle>
            <CardDescription>
              Use o email ou telefone que você informou ao agendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full font-heading">
                Buscar Agendamentos
              </Button>
            </form>
          </CardContent>
        </Card>

        {searched && (
          <div className="space-y-4">
            {appointments.length > 0 ? (
              <>
                <h2 className="font-heading text-2xl">
                  Encontrados: {appointments.length} agendamento(s)
                </h2>
                {appointments.map((apt) => (
                  <Card key={apt.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Scissors className="w-5 h-5 text-primary" />
                            <span className="font-heading text-xl">
                              {serviceNames[apt.service] || apt.service}
                            </span>
                            {getStatusBadge(apt.status)}
                          </div>
                          <div className="flex items-center gap-4 text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(apt.date), "d 'de' MMMM 'de' yyyy", {
                                locale: ptBR,
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {apt.time}
                            </span>
                          </div>
                          {apt.rating && (
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-muted-foreground">Sua avaliação:</span>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= apt.rating!
                                      ? 'text-primary fill-primary'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        {apt.status === 'completed' && !apt.rating && (
                          <Dialog open={dialogOpen && selectedAppointment?.id === apt.id} onOpenChange={(open) => {
                            setDialogOpen(open);
                            if (open) {
                              setSelectedAppointment(apt);
                            } else {
                              setSelectedAppointment(null);
                              setRating(0);
                              setReview('');
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="gap-2">
                                <Star className="w-4 h-4" />
                                Avaliar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="font-heading text-2xl">
                                  Avaliar Atendimento
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-6 py-4">
                                <div>
                                  <Label className="mb-3 block">Sua nota</Label>
                                  <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className="transition-transform hover:scale-110"
                                      >
                                        <Star
                                          className={`w-8 h-8 ${
                                            star <= rating
                                              ? 'text-primary fill-primary'
                                              : 'text-muted-foreground'
                                          }`}
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="review">Comentário (opcional)</Label>
                                  <Textarea
                                    id="review"
                                    value={review}
                                    onChange={(e) => setReview(e.target.value)}
                                    placeholder="Conte-nos como foi sua experiência..."
                                    rows={4}
                                  />
                                </div>
                                <Button
                                  onClick={handleSubmitRating}
                                  className="w-full font-heading"
                                >
                                  Enviar Avaliação
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    Nenhum agendamento encontrado com os dados informados.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultaAgendamento;
