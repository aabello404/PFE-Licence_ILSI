import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
enum NotificationType {
  APPOINTMENT,
  CHAT,
  REMINDER,
  INFO,
  WARNING,
  BOOKING,
}
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async markAsRead(userId: number, id: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found or access denied');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }
  async createAppointmentNotification(
    userId: number,
    message: string,
    title: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: userId,
        message: message,
        type: 'APPOINTMENT',
        title: title,
      },
    });
    return notification;
  }
  async notifyAllReceptionistsDoctorAppointment(
    doctorId: number,
    message: string,
    title: string,
  ) {

    const receptionists = await this.prisma.receptionist.findMany();
    await this.prisma.notification.create({
      data: {
        userId: doctorId,
        message: message,
        type: 'BOOKING',
        title: title,
      },
    });
    const notifications = receptionists.map((receptionist) =>
      this.prisma.notification.create({
        data: {
          userId: receptionist.userId,
          message,
          type: 'BOOKING',
          title: title,
        },
      }),
    );
    return Promise.all(notifications);
  }
}
