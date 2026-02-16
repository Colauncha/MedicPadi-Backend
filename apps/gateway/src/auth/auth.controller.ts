import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  Req,
  // Patch,
  // Param,
  // Delete,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { CreateAuthDto, LoginDto } from '@medicpadi-backend/contracts';
import { firstValueFrom } from 'rxjs';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    response.cookie('auth_token', token, {
      httpOnly: true,
    });
    return response.send({ message: 'Login successful', token });
  }

  @Get('logout')
  logout(@Req() request: Request) {
    request.res.clearCookie('auth_token');
    return { message: 'Logout successful' };
  }
}
