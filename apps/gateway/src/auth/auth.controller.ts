import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  Req,
  Patch,
  UseGuards,
  Query,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import {
  CreateAuthDto,
  LoginDto,
  UpdateAuthDto,
  UpdateAcctDto,
  ResetPasswordDto,
} from '@medicpadi-backend/contracts';
import { firstValueFrom } from 'rxjs';
import {
  AuthGuard,
  AdminAuthGuard,
  RequestWithUser,
} from '../guards/auth/auth.guard';
import { ApiExtraModels } from '@nestjs/swagger';

@Controller('auth')
@ApiExtraModels(CreateAuthDto, LoginDto, UpdateAuthDto)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /*
   * This endpoint creats a user.
   *
   * Note: The enum for user roles includes
   * {'Doctor': 'consultant', 'Patient': 'patient', 'Pharmacy': 'pharmacy', 'Laboratory': 'lab'}
   */
  @Post()
  create(@Body() createAuthDto: CreateAuthDto) {
    const response = this.authService.create(createAuthDto);
    return response;
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token$ = this.authService.login(loginDto);
    const token = await firstValueFrom(token$);
    response.cookie('auth_token', token.access_token, {
      httpOnly: true,
    });
    return response.send({ message: 'Login successful', token });
  }

  @Get('logout')
  logout(@Req() request: Request) {
    request.res.clearCookie('auth_token');
    return { message: 'Logout successful' };
  }

  @UseGuards(AdminAuthGuard)
  @Patch('/admin/update')
  adminUpdate(
    @Body() updateAuthDto: UpdateAuthDto,
    @Req() request: RequestWithUser,
  ) {
    const _ = request.user;
    return this.authService.update(updateAuthDto);
  }

  @UseGuards(AuthGuard)
  @Patch('/update')
  update(
    @Body() updateAcctDto: UpdateAcctDto,
    @Req() request: RequestWithUser,
  ) {
    const user = request.user;
    return this.authService.update(updateAcctDto, user.id);
  }

  @Post('/request-password-reset')
  async requestPasswordReset(@Query('email') email: string) {
    return await this.authService.requestPasswordReset(email);
  }

  @Post('/reset-password')
  async resetPassword(
    @Body()
    resetPasswordDto: ResetPasswordDto,
  ) {
    const { otp, email, newPassword } = resetPasswordDto;
    return await this.authService.resetPassword(otp, email, newPassword);
  }

  @UseGuards(AdminAuthGuard)
  @Post('/delete')
  async delete(@Body('id') id: string) {
    try {
      return await this.authService.delete(id);
    } catch (error) {
      throw error;
    }
  }
}
