import { CreateUserDto } from '@app/contracts/users/dto/create-user.dto';
import { GetUserDto } from '@app/contracts/users/dto/get-user.dto';
import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { Observable } from 'rxjs';
// import { ClientProxy } from '@nestjs/microservices';
// import { User } from 'apps/users/src/users/entities/user.entity';
import { UsersService } from './users.service';
// import { Observable } from 'rxjs';

@Controller('users')
export class UsersController {
  constructor(
    // @Inject('USERS_SERVICE') private readonly usersService: ClientProxy,
    @Inject() private readonly usersService: UsersService,
  ) {}

  @Get('/hello')
  getHello(): string {
    return 'Hello from Gateway!';
    // return this.usersService.send<string>({ cmd: 'users.getHello' }, {});
  }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto): Observable<GetUserDto> {
    console.log('Received createUser request:', createUserDto);
    return this.usersService.createUser(createUserDto);
  }
}
