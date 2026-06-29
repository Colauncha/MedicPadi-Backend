import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import {
  CreateAuthDto,
  UpdateAuthDto,
  LoginDto,
  ResetPasswordDto,
} from '@medicpadi-backend/contracts';
import { AuthPatterns } from '@medicpadi-backend/contracts';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(AuthPatterns.STATUS)
  getStatus() {
    return this.authService.getStatus();
  }

  @MessagePattern(AuthPatterns.CREATE)
  create(@Payload('data') createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
  }

  @MessagePattern(AuthPatterns.LOGIN)
  login(@Payload('data') loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @MessagePattern(AuthPatterns.VERIFY)
  verify(@Payload('data') token: string) {
    return this.authService.validateToken(token);
  }

  @MessagePattern(AuthPatterns.FIND_BY_ID)
  findById(@Payload('data') id: string) {
    return this.authService.findById(id);
  }

  @MessagePattern(AuthPatterns.UPDATE)
  update(@Payload('data') updateAuthDto: UpdateAuthDto) {
    return this.authService.update(updateAuthDto);
  }

  @MessagePattern(AuthPatterns.REQUEST_PASSWORD_RESET)
  requestPasswordReset(@Payload('data') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @MessagePattern(AuthPatterns.RESET_PASSWORD)
  resetPassword(
    @Payload('data')
    payload: ResetPasswordDto,
  ) {
    const { otp, email, newPassword } = payload;
    return this.authService.resetPassword(otp, email, newPassword);
  }

  @MessagePattern(AuthPatterns.DELETE)
  delete(@Payload('data') id: string) {
    return this.authService.delete(id);
  }

  @MessagePattern(AuthPatterns.SEND_VERIFICATION_MAIL)
  sendVerificationMail(@Payload('data') id: string) {
    return this.authService.sendVerificationMail(id);
  }

  @MessagePattern(AuthPatterns.VERIFY_EMAIL)
  verifyEmail(@Payload('data') payload: { id: string; otp: number }) {
    return this.authService.verifyEmail(payload.id, payload.otp);
  }
}
