import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Controller('users')
export class UsersController {
  constructor(
    @Inject('USERS_SERVICE') private readonly usersService: ClientProxy,
  ) {}

  @Get('/hello')
  getHello(): Observable<string> {
    return this.usersService.send<string>({ cmd: 'users.getHello' }, {});
  }
}
