import {
  BadRequestException,
  Injectable,
  NotFoundException,
  RequestTimeoutException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CreateAuthDto,
  UpdateAuthDto,
  LoginDto,
} from '@medicpadi-backend/contracts';
import { Repository } from 'typeorm';
import { Auth } from './entities/auth.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly jwtService: JwtService,
  ) {}

  async create(createAuthDto: CreateAuthDto) {
    let existingUser: Auth | undefined;
    try {
      existingUser = await this.authRepository.findOne({
        where: { email: createAuthDto.email },
      });
    } catch (error) {
      throw new RequestTimeoutException('Database query timed out', {
        cause: error,
      });
    }
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }
    const passwordhash = await bcrypt.hash(createAuthDto.password, 10);
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
      throw new RequestTimeoutException('Database query timed out', {
        cause: error,
      });
    }
    if (!User) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      User.passwordhash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
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
        throw new BadRequestException('Invalid token');
      }
      return { valid: true, user };
    } catch (error) {
      throw new BadRequestException('Invalid token', { cause: error });
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
      throw new NotFoundException('User Not found');
    }
  }
}
