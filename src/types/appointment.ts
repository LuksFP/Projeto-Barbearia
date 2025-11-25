export type ServiceType = 'corte' | 'barba' | 'combo' | 'tratamento';

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface Appointment {
  id: string;
  userId: string;
  service: ServiceType;
  date: string;
  time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export interface Testimonial {
  id: string;
  name: string;
  service: ServiceType;
  rating: number;
  comment: string;
  beforeImage: string;
  afterImage: string;
  date: string;
}
