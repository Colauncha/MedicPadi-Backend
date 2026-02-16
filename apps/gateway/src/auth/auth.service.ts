import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  CreateAuthDto,
  AuthPatterns,
  LoginDto,
  AdminPatterns,
  PatientPatterns,
  PharmacyPatterns,
  DoctorPatterns,
  LaboratoryPatterns,
  CreateAdminDto,
  CreateLaboratoryDto,
  CreateDoctorDto,
  CreatePatientDto,
  CreatePharmacyDto,
} from '@medicpadi-backend/contracts';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

interface patternAndDto<T = any> {
  pattern: string;
  dto: T;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('PROFILE_SERVICE') private readonly profileClient: ClientProxy,
  ) {}

  private getPatternFromRole(role: string): patternAndDto {
    console.log('role: ', role);
    switch (role) {
      case 'admin':
        return {
          pattern: AdminPatterns.CREATE,
          dto: new CreateAdminDto(),
        };

      case 'consultant':
        return {
          pattern: DoctorPatterns.CREATE,
          dto: new CreateDoctorDto(),
        };

      case 'patient':
        return {
          pattern: PatientPatterns.CREATE,
          dto: new CreatePatientDto(),
        };

      case 'pharmacy':
        return {
          pattern: PharmacyPatterns.CREATE,
          dto: new CreatePharmacyDto(),
        };

      case 'lab':
        return {
          pattern: LaboratoryPatterns.CREATE,
          dto: new CreateLaboratoryDto(),
        };

      default:
        throw new BadRequestException({ error: `Unsupported role: ${role}` });
    }
  }

  async create(createAuthDto: CreateAuthDto) {
    try {
      const user = await firstValueFrom(
        this.authClient.send(AuthPatterns.CREATE, createAuthDto),
      );

      console.log('User: ', user, '\n\n');

      let profilePattern = this.getPatternFromRole(createAuthDto.role);
      profilePattern.dto.user_id = user.id;

      console.log('Pattern', profilePattern);

      const profile = await firstValueFrom(
        this.profileClient.send(profilePattern.pattern, profilePattern.dto),
      );
      return { ...user, ...profile };
    } catch (error) {
      console.error(error);
      throw new BadRequestException({
        error: 'Account could not be created',
        cause: error,
        description: error.message,
      });
    }
  }

  login(loginDto: LoginDto) {
    return this.authClient.send(AuthPatterns.LOGIN, loginDto);
    // throw new Error('Method not implemented.');
  }
}
