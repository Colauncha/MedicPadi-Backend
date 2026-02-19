import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import {
  CreateAuthDto,
  UpdateAuthDto,
  LoginDto,
} from '@medicpadi-backend/contracts';
import { AuthPatterns } from '@medicpadi-backend/contracts';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(AuthPatterns.CREATE)
  create(@Payload() createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
  }

  @MessagePattern(AuthPatterns.LOGIN)
  login(@Payload() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @MessagePattern(AuthPatterns.VERIFY)
  verify(@Payload() token: string) {
    return this.authService.validateToken(token);
  }

  @MessagePattern(AuthPatterns.FIND_BY_ID)
  findById(@Payload() id: string) {
    return this.authService.findById(id);
  }

  @MessagePattern(AuthPatterns.UPDATE)
  update(@Payload() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(updateAuthDto);
  }
}
