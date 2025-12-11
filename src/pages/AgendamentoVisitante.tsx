import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ServiceType, TimeSlot } from '@/types/appointment';
import { Scissors, Clock, CheckCircle, UserCircle, Mail, Phone, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';

const AgendamentoVisitante = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>();
  const [selectedService, setSelectedService] = useState<ServiceType>('corte');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');

  const services = [
    { id: 'corte' as ServiceType, name: 'Corte de Cabelo', price: 'R$ 50,00', value: 50 },
    { id: 'barba' as ServiceType, name: 'Barba', price: 'R$ 40,00', value: 40 },
    { id: 'combo' as ServiceType, name: 'Corte + Barba', price: 'R$ 80,00', value: 80 },
    { id: 'tratamento' as ServiceType, name: 'Tratamento Especial', price: 'R$ 100,00', value: 100 },
  ];

  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 9;
    const endHour = 19;

    for (let hour = startHour; hour < endHour; hour++) {
      ['00', '30'].forEach((minute) => {
        const time = `${hour.toString().padStart(2, '0')}:${minute}`;
        const random = Math.random();
        slots.push({
          time,
          available: random > 0.35,
        });
      });
    }

    return slots;
  };

  const [timeSlots] = useState<TimeSlot[]>(generateTimeSlots());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !selectedTime || !name || !email || !phone) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    const code = `APT-${Date.now().toString(36).toUpperCase()}`;

    const appointment = {
      id: Date.now().toString(),
      confirmationCode: code,
      userId: 'guest',
      service: selectedService,
      date: date.toISOString(),
      time: selectedTime,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      isGuest: true,
    };

    const existingAppointments = JSON.parse(
      localStorage.getItem('userAppointments') || '[]'
    );
    existingAppointments.push(appointment);
    localStorage.setItem('userAppointments', JSON.stringify(existingAppointments));

    toast({
      title: 'Confirmação enviada!',
      description: `Enviamos um email para ${email} e SMS para ${phone} com os detalhes do agendamento.`,
    });

    setConfirmationCode(code);
    setConfirmed(true);
  };

  if (confirmed) {
    return (
      <div className="min-h-screen pt-20 pb-16">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Card className="text-center">
            <CardContent className="p-8 space-y-6">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h1 className="font-heading text-3xl mb-2">Agendamento Confirmado!</h1>
                <p className="text-muted-foreground">
                  Seu horário foi reservado com sucesso.
                </p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Código de confirmação</p>
                <p className="font-heading text-2xl text-primary">{confirmationCode}</p>
              </div>

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Enviamos um email para <strong>{email}</strong> com todos os detalhes.
                </AlertDescription>
              </Alert>

              <Alert>
                <Phone className="h-4 w-4" />
                <AlertDescription>
                  Enviamos um SMS para <strong>{phone}</strong> com a confirmação.
                </AlertDescription>
              </Alert>

              <div className="pt-4 space-y-3">
                <Link to="/consulta-agendamento" className="block">
                  <Button variant="outline" className="w-full gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Acompanhar Agendamento
                  </Button>
                </Link>
                <Button onClick={() => navigate('/')} className="w-full">
                  Voltar ao Início
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="font-heading text-5xl">
              <span className="text-primary">AGENDE</span> COMO VISITANTE
            </h1>
          </div>
          <p className="text-muted-foreground font-body text-lg">
            Agende seu corte sem precisar criar uma conta. Para benefícios exclusivos,{' '}
            <button 
              onClick={() => navigate('/login')} 
              className="text-primary underline hover:text-primary/80"
            >
              crie sua conta VIP
            </button>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-2xl flex items-center gap-2">
                  <UserCircle className="w-6 h-6 text-primary" />
                  Seus Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name" className="font-body">
                    Nome Completo
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Digite seu nome"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="font-body">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="font-body">
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-2xl flex items-center gap-2">
                  <Scissors className="w-6 h-6 text-primary" />
                  Escolha o Serviço
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedService}
                  onValueChange={(value) => setSelectedService(value as ServiceType)}
                >
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:border-primary transition-colors cursor-pointer"
                    >
                      <RadioGroupItem value={service.id} id={service.id} />
                      <Label
                        htmlFor={service.id}
                        className="flex-1 cursor-pointer font-body"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-heading text-lg">{service.name}</span>
                          <span className="text-primary font-heading">
                            {service.price}
                          </span>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="font-heading text-2xl flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-primary" />
                Selecione a Data
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) =>
                  date < new Date() || date.getDay() === 0 || date.getDay() === 1
                }
                className="rounded-md border border-border pointer-events-auto"
                locale={ptBR}
              />
            </CardContent>
          </Card>

          {date && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="font-heading text-2xl flex items-center gap-2">
                  <Clock className="w-6 h-6 text-primary" />
                  Horários Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      type="button"
                      variant={selectedTime === slot.time ? 'default' : 'outline'}
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                      className="font-body"
                    >
                      {slot.time}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedTime && (
            <div className="mt-8">
              <Button type="submit" className="w-full font-heading text-lg py-6">
                Confirmar Agendamento
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AgendamentoVisitante;
