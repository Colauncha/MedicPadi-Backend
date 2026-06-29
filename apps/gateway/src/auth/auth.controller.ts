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
  ParseIntPipe,
} from '@nestjs/common';
import { Response } from 'express';
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
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
@ApiExtraModels(CreateAuthDto, LoginDto, UpdateAuthDto)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account. The `role` field determines the account type: `patient`, `consultant` (doctor), `pharmacy`, or `lab`.',
  })
  @ApiResponse({ status: 201, description: 'User created successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or email already in use.',
  })
  create(@Body() createAuthDto: CreateAuthDto) {
    const response = this.authService.create(createAuthDto);
    return response;
  }

  @Post('login')
  @ApiOperation({
    summary: 'Log in',
    description:
      'Authenticates a user with email and password. Returns a JWT access token in the response body and also sets an `auth_token` HttpOnly cookie.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Login successful. Returns `{ message, token: { access_token } }`.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
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
  @ApiOperation({
    summary: 'Log out',
    description:
      'Clears the `auth_token` cookie, effectively ending the session.',
  })
  @ApiResponse({ status: 200, description: 'Logout successful.' })
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('auth_token');
    return { message: 'Logout successful' };
  }

  @UseGuards(AdminAuthGuard)
  @Patch('/admin/update')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Admin: update any account',
    description:
      'Allows an admin to update account credentials for any user. Requires the `admin` role.',
  })
  @ApiResponse({ status: 200, description: 'Account updated.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions — admin role required.',
  })
  adminUpdate(
    @Body() updateAuthDto: UpdateAuthDto,
    @Req() request: RequestWithUser,
  ) {
    const _ = request.user;
    return this.authService.update(updateAuthDto);
  }

  @UseGuards(AuthGuard)
  @Patch('/update')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update own account credentials',
    description:
      'Allows the authenticated user to update their own email or password.',
  })
  @ApiResponse({ status: 200, description: 'Account updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  update(
    @Body() updateAcctDto: UpdateAcctDto,
    @Req() request: RequestWithUser,
  ) {
    const user = request.user;
    return this.authService.update(updateAcctDto, user.id);
  }

  @Post('/request-password-reset')
  @ApiOperation({
    summary: 'Request a password reset OTP',
    description:
      'Sends a one-time password (OTP) to the provided email address to initiate a password reset.',
  })
  @ApiQuery({
    name: 'email',
    required: true,
    description: 'The email address of the account to reset.',
  })
  @ApiResponse({ status: 200, description: 'OTP sent if the email exists.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing email.' })
  async requestPasswordReset(@Query('email') email: string) {
    return await this.authService.requestPasswordReset(email);
  }

  @Post('/reset-password')
  @ApiOperation({
    summary: 'Reset password with OTP',
    description:
      'Resets the account password using the OTP received via email. The OTP expires after a short window.',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid OTP, expired OTP, or validation error.',
  })
  async resetPassword(
    @Body()
    resetPasswordDto: ResetPasswordDto,
  ) {
    const { otp, email, newPassword } = resetPasswordDto;
    return await this.authService.resetPassword(otp, email, newPassword);
  }

  @UseGuards(AdminAuthGuard)
  @Post('/delete')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Admin: delete a user account',
    description:
      'Permanently deletes a user account by ID. Requires the `admin` role.',
  })
  @ApiResponse({ status: 200, description: 'Account deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions — admin role required.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async delete(@Body('id') id: string) {
    return await this.authService.delete(id);
  }

  @UseGuards(AuthGuard)
  @Post('/wallet')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Retrieve user wallet',
    description: 'Fetches the wallet information for the authenticated user.',
  })
  async getUserWallet(@Req() request: RequestWithUser) {
    const user = request.user;
    return await this.authService.getUserWallet(user.id);
  }

  @UseGuards(AuthGuard)
  @Post('/send-verification-mail')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Send email verification OTP',
    description:
      "Sends a verification OTP to the authenticated user's email address.",
  })
  @ApiResponse({ status: 200, description: 'Verification email sent.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  async sendVerificationMail(@Req() request: RequestWithUser) {
    return await this.authService.sendVerificationMail(request.user.id);
  }

  @Get('/verify-email')
  @ApiOperation({
    summary: 'Verify email address',
    description:
      "Verifies the user's email using the OTP and user ID received in the verification email.",
  })
  @ApiQuery({ name: 'id', required: true, description: 'User ID.' })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'OTP from the verification email.',
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async verifyEmail(
    @Query('id') id: string,
    @Query('token', ParseIntPipe) token: number,
  ) {
    return await this.authService.verifyEmail(id, token);
  }
}
