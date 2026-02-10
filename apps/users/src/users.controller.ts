import { Controller } from '@nestjs/common';
import { UsersService } from './providers/users.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern('users.getHello')
  getHello(): string {
    return this.usersService.getHello();
  }
}
