import { Module } from '@nestjs/common';
import { GroqController } from './groq.controller';
import { HealthController } from './health.controller';
import { GroqService } from './groq.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [PrismaModule, AppointmentsModule],
  controllers: [GroqController, HealthController],
  providers: [GroqService],
  exports: [GroqService],
})
export class GroqModule {}

