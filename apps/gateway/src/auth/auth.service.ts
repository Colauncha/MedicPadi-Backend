import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { LoginDto } from './dto/login.dto';
// import { CreateAuthDto } from './dto/create-auth.dto';
// import { UpdateAuthDto } from './dto/update-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject('USERS_SERVICE') private readonly userClient: ClientProxy,
  ) {}

  login(loginDto: LoginDto) {
    return `This action returns all auth`;
  }

  verify(id: number) {
    return `This action returns a #${id} auth`;
  }

  logout() {
    return `This action updates a auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
