import { Controller, Get } from '@nestjs/common';
import { UsersService } from './providers/users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getHello(): string {
    return this.usersService.getHello();
  }
}
