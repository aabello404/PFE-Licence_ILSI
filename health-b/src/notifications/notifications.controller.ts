import { Controller, Get, Patch, Param, ParseIntPipe, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@Request() req: any) {
    const userId = req.user.id;
    return this.notificationsService.findAllForUser(userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const userId = req.user.id;
    return this.notificationsService.markAsRead(userId, id);
  }
}
