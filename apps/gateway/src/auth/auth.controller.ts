import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  Req,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import {
  CreateAuthDto,
  LoginDto,
  UpdateAuthDto,
  UpdateAcctDto,
} from '@medicpadi-backend/contracts';
import { firstValueFrom } from 'rxjs';
import { AuthGuard, AdminAuthGuard } from '../guards/auth/auth.guard';
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
  adminUpdate(@Body() updateAuthDto: UpdateAuthDto, @Req() request: Request) {
    const _ = request.user;
    return this.authService.update(updateAuthDto);
  }

  @UseGuards(AuthGuard)
  @Patch('/update')
  update(@Body() updateAcctDto: UpdateAcctDto, @Req() request: Request) {
    const user = request.user;
    return this.authService.update(updateAcctDto, user.id);
  }
}
