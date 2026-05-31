import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { N8nService } from '../n8n/n8n.service';
import { NotificationsService } from '../notifications/notifications.service';
@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly n8nService: N8nService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createAppointment(
    patientId: number,
    doctorId: number,
    date: string,
    time: string,
    reason: string,
  ) {
    const appointment = await this.prismaService.appointment.create({
      data: {
        patientId,
        doctorId,
        date,
        time,
        reason,
        status: 'PENDING',
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        doctor: {
          select: {
            specialty: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    await this.notificationsService.notifyAllReceptionistsDoctorAppointment(
      doctorId,
      `New appointment request from ${appointment.patient.firstName} ${appointment.patient.lastName} on ${appointment.date} at ${appointment.time}. Reason: ${reason}`,
      `New Appointment Request`,
    );
    return appointment;
  }

  async getAppointmentsForPatient(patientId: number) {
    const appointments = await this.prismaService.appointment.findMany({
      where: { patientId },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        doctor: {
          select: {
            specialty: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    return appointments;
  }

  async checkDoctorAvailability(doctorId: number, date: string, time: string) {
    const existingAppointment = await this.prismaService.appointment.findFirst({
      where: {
        doctorId,
        date,
        time,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
    });
    return !existingAppointment; // Available if no existing appointment
  }
  async checkAllSlotsAvailability(doctorId: number, date: string) {
    const existingAppointments = await this.prismaService.appointment.findMany({
      where: {
        doctorId,
        date,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
    });
    const bookedTimes = existingAppointments.map((app) => app.time);
    const allSlots = ['9:00', '14:00'];
    return allSlots.filter((slot) => !bookedTimes.includes(slot));
  }
  async getAllDoctorAppointments(doctorId: number) {
    const appointments = await this.prismaService.appointment.findMany({
      where: { doctorId },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        doctor: {
          select: {
            specialty: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    return appointments;
  }

  async getAllAppointments() {
    const appointments = await this.prismaService.appointment.findMany({
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        doctor: {
          select: {
            specialty: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    return appointments;
  }

  async cancelAppointment(appointmentId: number, reason: string = 'Cancelled') {
    const appointment = await this.prismaService.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        doctor: {
          select: {
            specialty: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    return appointment;
  }

  async confirmAppointment(
    appointmentId: number,
    reason: string = 'Confirmed',
  ) {
    try {
      const appointment = await this.prismaService.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CONFIRMED' },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          doctor: {
            select: {
              specialty: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });
      await this.n8nService.sendEmail(
        appointment.patient.email,
        'Appointment Confirmed',
        `Your appointment with Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName} on ${appointment.date} at ${appointment.time} has been confirmed.`,
      );
      await this.notificationsService.createAppointmentNotification(
        appointment.patientId,
        `Your appointment with Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName} on ${appointment.date} at ${appointment.time} has been confirmed.`,
        `Appointment Confirmed`,
      );
      return appointment;
    } catch (error) {
      throw new BadRequestException('Failed to confirm appointment');
    }
  }
}
