import { Inject, Injectable } from '@nestjs/common';
// import { CreateAuthDto } from './dto/create-auth.dto';
// import { UpdateAuthDto } from './dto/update-auth.dto';
import {
  CreateAuthDto,
  AuthPatterns,
  LoginDto,
} from '@medicpadi-backend/contracts';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AuthService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('PROFILE_SERVICE') private readonly profileClient: ClientProxy,
  ) {}

  create(createAuthDto: CreateAuthDto) {
    return this.authClient.send(AuthPatterns.CREATE, createAuthDto);
  }

  login(loginDto: LoginDto) {
    return this.authClient.send(AuthPatterns.LOGIN, loginDto);
    // throw new Error('Method not implemented.');
  }
}
