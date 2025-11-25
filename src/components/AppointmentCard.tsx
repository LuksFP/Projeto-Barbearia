import { Appointment } from '@/types/appointment';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Scissors } from 'lucide-react';

interface AppointmentCardProps {
  appointment: Appointment;
}

const AppointmentCard = ({ appointment }: AppointmentCardProps) => {
  const serviceLabels = {
    corte: 'Corte de Cabelo',
    barba: 'Barba',
    combo: 'Corte + Barba',
    tratamento: 'Tratamento Especial',
  };

  const statusLabels = {
    scheduled: 'Agendado',
    confirmed: 'Confirmado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };

  const statusColors = {
    scheduled: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
    confirmed: 'bg-green-500/20 text-green-700 dark:text-green-300',
    completed: 'bg-gray-500/20 text-gray-700 dark:text-gray-300',
    cancelled: 'bg-red-500/20 text-red-700 dark:text-red-300',
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Scissors className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-xl text-foreground">
                {serviceLabels[appointment.service]}
              </h3>
              <p className="text-sm text-muted-foreground font-body">
                Pedido #{appointment.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <Badge className={statusColors[appointment.status]}>
            {statusLabels[appointment.status]}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-body">
              {new Date(appointment.date).toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          <div className="flex items-center gap-3 text-muted-foreground">
            <Clock className="w-5 h-5 text-primary" />
            <span className="font-body">{appointment.time}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppointmentCard;
