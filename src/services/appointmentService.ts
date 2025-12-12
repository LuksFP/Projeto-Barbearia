// Appointment Service - Ready for backend integration
// TODO: Replace mock implementations with actual API calls

import { Appointment } from '@/types/appointment';

// Mock data store - will be replaced by database
let appointments: Appointment[] = [];

export const appointmentService = {
  // Get all appointments
  async getAll(): Promise<Appointment[]> {
    // TODO: Replace with API call
    // return await api.get('/appointments');
    return appointments;
  },

  // Get appointments by user ID
  async getByUserId(userId: string): Promise<Appointment[]> {
    // TODO: Replace with API call
    // return await api.get(`/appointments/user/${userId}`);
    return appointments.filter(a => a.userId === userId);
  },

  // Get appointments by email or phone (for guests)
  async getByContact(email?: string, phone?: string): Promise<Appointment[]> {
    // TODO: Replace with API call
    // return await api.get('/appointments/search', { email, phone });
    return appointments.filter(
      a =>
        (email && a.customerEmail?.toLowerCase() === email.toLowerCase()) ||
        (phone && a.customerPhone?.replace(/\D/g, '') === phone?.replace(/\D/g, ''))
    );
  },

  // Create a new appointment
  async create(appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
    // TODO: Replace with API call
    // return await api.post('/appointments', appointment);
    const newAppointment: Appointment = {
      ...appointment,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    appointments.push(newAppointment);
    return newAppointment;
  },

  // Update appointment status
  async updateStatus(id: string, status: Appointment['status']): Promise<Appointment | null> {
    // TODO: Replace with API call
    // return await api.patch(`/appointments/${id}`, { status });
    const index = appointments.findIndex(a => a.id === id);
    if (index !== -1) {
      appointments[index] = { ...appointments[index], status };
      return appointments[index];
    }
    return null;
  },

  // Add rating to appointment
  async addRating(id: string, rating: number, review?: string): Promise<Appointment | null> {
    // TODO: Replace with API call
    // return await api.patch(`/appointments/${id}/rating`, { rating, review });
    const index = appointments.findIndex(a => a.id === id);
    if (index !== -1) {
      appointments[index] = { ...appointments[index], rating, review };
      return appointments[index];
    }
    return null;
  },

  // Delete appointment
  async delete(id: string): Promise<boolean> {
    // TODO: Replace with API call
    // return await api.delete(`/appointments/${id}`);
    const index = appointments.findIndex(a => a.id === id);
    if (index !== -1) {
      appointments.splice(index, 1);
      return true;
    }
    return false;
  },
};
