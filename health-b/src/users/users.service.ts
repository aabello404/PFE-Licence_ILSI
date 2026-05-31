import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async getDoctors() {
    const doctors = await this.prismaService.doctor.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    return doctors;
  }

  async getUser(userId: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        doctor: {
          select: {
            id: true,
            specialty: true,
          },
        },
      },
    });
    return user;
  }

  async getUserByEmail(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      include: {
        doctor: {
          select: {
            id: true,
            specialty: true,
          },
        },
      },
    });
    return user;
  }
}
