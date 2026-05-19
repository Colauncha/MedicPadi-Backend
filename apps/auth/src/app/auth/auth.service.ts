import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  CreateAuthDto,
  UpdateAuthDto,
  LoginDto,
  ServiceError,
  EmailPatterns,
  ResetPasswordEmailDto,
} from '@medicpadi-backend/contracts';
import { Repository } from 'typeorm';
import { Auth } from './entities/auth.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { CACHE_MANAGER, Cache, CacheKey } from '@nestjs/cache-manager';
import { generateOtp, withServiceAuth } from '@medicpadi-backend/utils';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly jwtService: JwtService,
    private configService: ConfigService,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>('appConfig.internalServiceToken');
  }

  getStatus() {
    return {
      status: 'Ok',
      uptime: new Date(process.uptime() * 1000).toISOString().slice(11, 19),
      timestamp: new Date().toISOString(),
    };
  }

  async create(createAuthDto: CreateAuthDto) {
    let existingUser: Auth | null;
    try {
      existingUser = await this.authRepository.findOne({
        where: { email: createAuthDto.email },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database query failed',
        error: error,
      } as ServiceError);
    }
    if (existingUser) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'User with this email already exists',
      } as ServiceError);
    }
    const passwordhash = await bcrypt.hash(createAuthDto.password, 10);

    if (this.configService.get<string>('appConfig.waitlist')) {
      console.log(this.configService.get<string>('appConfig.waitlist'));
      createAuthDto.earlyUser = true;
    } else {
      createAuthDto.earlyUser = false;
    }

    const { password: _, ...authData } = createAuthDto;

    const auth = this.authRepository.create({
      ...authData,
      passwordhash,
    });
    return this.authRepository.save(auth);
  }

  async login(loginDto: LoginDto) {
    let User: Auth | null;
    try {
      User = await this.authRepository.findOne({
        where: { email: loginDto.email },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: 408,
        message: 'Database query timed out',
        error: error,
      } as ServiceError);
    }
    if (!User) {
      throw new RpcException({
        statusCode: 401,
        message: 'Invalid email or password',
      } as ServiceError);
    }
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      User.passwordhash,
    );
    if (!isPasswordValid) {
      throw new RpcException({
        statusCode: 401,
        message: 'Invalid email or password',
      } as ServiceError);
    }
    const payload = { sub: User.id, email: User.email };
    const token = this.jwtService.sign(payload);
    return { access_token: token };
  }

  async validateToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.authRepository.findOne({
        where: { id: decoded.sub },
      });
      if (!user) {
        throw new RpcException({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Invalid token',
        } as ServiceError);
      }
      return { valid: true, user };
    } catch (error) {
      console.log(error);
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid token',
      } as ServiceError);
    }
  }

  update(updateAuthDto: UpdateAuthDto) {
    return { data: updateAuthDto };
  }

  async findById(id: string) {
    try {
      const user = await this.authRepository.findOneBy({
        id: id,
      });
      return user;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'User Not found',
      } as ServiceError);
    }
  }

  async requestPasswordReset(email: string) {
    let user: Auth | null;
    try {
      user = await this.authRepository.findOne({
        where: { email },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database query failed',
        error: error,
      } as ServiceError);
    }
    if (!user) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'User with this email does not exist',
      } as ServiceError);
    }
    const resetToken = generateOtp();
    let redisRet = await this.redis.set(
      `password-reset:${email}`,
      resetToken,
      'EX',
      3600,
    );
    const resetDto = new ResetPasswordEmailDto();
    resetDto.email = user.email;
    resetDto.name = 'User';
    resetDto.otp = resetToken;
    await firstValueFrom(
      this.notificationClient.emit(EmailPatterns.RESET_PASSWORD, withServiceAuth(resetDto, this.serviceToken)),
    );
    console.log('Redis set result:', redisRet);
    return {
      message: 'Password reset token generated',
      resetToken,
    };
  }

  async resetPassword(otp: number, email: string, newPassword: string) {
    try {
      let user: Auth | null;
      let otpStore: string | null | number;
      try {
        otpStore = await this.redis.get(`password-reset:${email}`);
        otpStore = otpStore ? parseInt(otpStore.trim(), 10) : null;
      } catch (error) {
        throw new RpcException({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Cache query failed',
          error: error,
        } as ServiceError);
      }
      console.log(`OTP from cache: ${otpStore}, provided OTP: ${otp}`);
      if (!otp || !otpStore || otp !== otpStore) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid or expired OTP',
        } as ServiceError);
      }
      try {
        user = await this.authRepository.findOne({
          where: { email },
        });
      } catch (error) {
        throw new RpcException({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database query failed',
          error: error,
        } as ServiceError);
      }
      if (!user) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'User with this email does not exist',
        } as ServiceError);
      }
      const passwordhash = await bcrypt.hash(newPassword, 10);
      user.passwordhash = passwordhash;
      return this.authRepository.save(user);
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to reset password',
        error: error,
      } as ServiceError);
    } finally {
      await this.redis.del(`password-reset:${email}`);
    }
  }

  async delete(id: string) {
    try {
      const _ = await this.authRepository.delete({ id });
      return {
        message: `User ${id} deleted successfully.`,
      };
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Unable to delete user',
        error: error,
      } as ServiceError);
    }
  }

  async softDelete(id: string) {}
}
