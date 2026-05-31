import { Controller, Get, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { Public } from '../auth/constans';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('doctors')
  async getDoctors() {
    return this.usersService.getDoctors();
  }

  @Get('me')
  async getMe(@Request() req: any) {
    const userId = req.user.id;
    return this.usersService.getUser(userId);
  }

  @Public()
  @Get('profile/:email')
  async getUserProfile(email: string) {
    return this.usersService.getUserByEmail(email);
  }
}
