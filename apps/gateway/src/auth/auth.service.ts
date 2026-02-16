import { Inject, Injectable } from '@nestjs/common';
import {
  CreateAuthDto,
  AuthPatterns,
  LoginDto,
  AddminPatterns,
  PatientPatterns,
  PharmacyPatterns,
  DoctorPatterns,
  LaboratoryPatterns,
} from '@medicpadi-backend/contracts';
import { ClientProxy } from '@nestjs/microservices';
// import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('PROFILE_SERVICE') private readonly profileClient: ClientProxy,
  ) {}

  private getPatternFromRole(role: string): string {
    let pattern: string;
    switch (role) {
      case 'admin':
        pattern = AddminPatterns.Create;
        break;
      case 'doctor':
        pattern = DoctorPatterns.Create;
        break;
      case 'patient':
        pattern = PatientPatterns.Create;
        break;
      case 'pharmarcy':
        pattern = PharmacyPatterns.Create;
        break;
      case 'laboratory':
        pattern = LaboratoryPatterns.Create;
        break;
    }
    return pattern;
  }

  create(createAuthDto: CreateAuthDto) {
    const user = this.authClient.send(AuthPatterns.CREATE, createAuthDto);
    const profilePattern = this.getPatternFromRole(createAuthDto.role);
    const profile = this.profileClient.send(profilePattern, {});
    return user;
  }

  login(loginDto: LoginDto) {
    return this.authClient.send(AuthPatterns.LOGIN, loginDto);
    // throw new Error('Method not implemented.');
  }
}
