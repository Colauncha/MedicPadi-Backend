import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
  RequestTimeoutException,
} from '@nestjs/common';
import {
  CreateAuthDto,
  UpdateAuthDto,
  LoginDto,
  ServiceError,
} from '@medicpadi-backend/contracts';
import { Repository } from 'typeorm';
import { Auth } from './entities/auth.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  getStatus() {
    return {
      status: 'Ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async create(createAuthDto: CreateAuthDto) {
    let existingUser: Auth | undefined;
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
    let User: Auth | undefined;
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
