import { create } from 'zustand';
import { Appointment } from '../types';

interface AppointmentState {
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;
  addAppointment: (appointment: Appointment) => void;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  deleteAppointment: (id: string) => void;
}

export const useAppointmentStore = create<AppointmentState>((set) => ({
  appointments: [],
  setAppointments: (appointments) => set({ appointments }),
  addAppointment: (appointmentData) => set((state) => ({
    appointments: [...state.appointments, appointmentData]
  })),
  updateAppointmentStatus: (id, status) => set((state) => ({
    appointments: state.appointments.map(app => app.id === id ? { ...app, status } : app)
  })),
  deleteAppointment: (id) => set((state) => ({
    appointments: state.appointments.filter(app => app.id !== id)
  }))
}));
