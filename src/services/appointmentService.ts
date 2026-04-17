// Serviço de agendamentos para o site público do cliente (não o dashboard).
// O dashboard usa appointmentRepository diretamente via TenantContext.

import type { Appointment } from '@/types/appointment';

const appointments: Appointment[] = [];

export const appointmentService = {
  async getAll(): Promise<Appointment[]> {
    return appointments;
  },

  async getByUserId(userId: string): Promise<Appointment[]> {
    return appointments.filter(a => a.userId === userId);
  },

  async getByContact(email?: string, phone?: string): Promise<Appointment[]> {
    return appointments.filter(
      a =>
        (email && a.customerEmail?.toLowerCase() === email.toLowerCase()) ||
        (phone && a.customerPhone?.replace(/\D/g, '') === phone?.replace(/\D/g, ''))
    );
  },

  async create(appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
    const newAppointment: Appointment = {
      ...appointment,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    appointments.push(newAppointment);
    return newAppointment;
  },

  async updateStatus(id: string, status: Appointment['status']): Promise<Appointment | null> {
    const index = appointments.findIndex(a => a.id === id);
    if (index !== -1) {
      appointments[index] = { ...appointments[index], status };
      return appointments[index];
    }
    return null;
  },

  async addRating(id: string, rating: number, review?: string): Promise<Appointment | null> {
    const index = appointments.findIndex(a => a.id === id);
    if (index !== -1) {
      appointments[index] = { ...appointments[index], rating, review };
      return appointments[index];
    }
    return null;
  },

  async delete(id: string): Promise<boolean> {
    const index = appointments.findIndex(a => a.id === id);
    if (index !== -1) {
      appointments.splice(index, 1);
      return true;
    }
    return false;
  },
};
