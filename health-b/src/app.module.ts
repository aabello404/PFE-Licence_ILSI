import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AppointmentsModule } from './appointments/appointments.module';
import { UsersModule } from './users/users.module';
import { GroqModule } from './groq/groq.module';
import { N8nModule } from './n8n/n8n.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AppointmentsModule,
    UsersModule,
    GroqModule,
    N8nModule,
    NotificationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
