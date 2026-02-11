import { CreateUserDto } from '@app/contracts/users/dto/create-user.dto';
import { GetUserDto } from '@app/contracts/users/dto/get-user.dto';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Injectable()
export class UsersService {
  constructor(
    @Inject('USERS_SERVICE') private readonly userClient: ClientProxy,
  ) {}

  createUser(createUserDto: CreateUserDto): Observable<GetUserDto> {
    createUserDto.createdAt = new Date();
    return this.userClient.send<GetUserDto>('users.create', createUserDto);
  }
}
