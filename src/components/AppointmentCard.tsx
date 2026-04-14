import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Scissors } from 'lucide-react';

// Aceita tanto o tipo legado (Appointment) quanto AppointmentRow do Supabase
export interface AppointmentDisplay {
  id: string;
  service_name: string;
  date: string;
  time: string;
  status: string;
  barber_name?: string;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  pending:   'Pendente',
  done:      'Concluído',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  confirmed: 'bg-green-500/20 text-green-700 dark:text-green-300',
  pending:   'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
  done:      'bg-gray-500/20 text-gray-700 dark:text-gray-300',
  completed: 'bg-gray-500/20 text-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-500/20 text-red-700 dark:text-red-300',
};

interface AppointmentCardProps {
  appointment: AppointmentDisplay;
}

const AppointmentCard = ({ appointment }: AppointmentCardProps) => {
  const status = appointment.status ?? 'pending';

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
                {appointment.service_name}
              </h3>
              {appointment.barber_name && (
                <p className="text-sm text-muted-foreground font-body">
                  {appointment.barber_name}
                </p>
              )}
            </div>
          </div>
          <Badge className={STATUS_COLORS[status] ?? 'bg-gray-500/20 text-gray-400'}>
            {STATUS_LABELS[status] ?? status}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-body">
              {new Date(appointment.date + 'T12:00').toLocaleDateString('pt-BR', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
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
