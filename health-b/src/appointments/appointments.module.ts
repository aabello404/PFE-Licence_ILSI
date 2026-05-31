import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { N8nModule } from '../n8n/n8n.module';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({
  imports: [PrismaModule,N8nModule,NotificationsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
