import {
  AdminPatterns,
  DoctorPatterns,
  PatientPatterns,
  PharmacyPatterns,
  LaboratoryPatterns,
  CreateAdminDto,
  CreateDoctorDto,
  CreatePatientDto,
  CreatePharmacyDto,
  CreateLaboratoryDto,
} from '@medicpadi-backend/contracts';
import { BadRequestException } from '@nestjs/common';

interface patternAndDto<Z = any, T = any> {
  pattern: Z;
  dto: T;
}

export const getPatternFromRole = async (
  role: string,
): Promise<patternAndDto> => {
  switch (role) {
    case 'admin':
      return {
        pattern: AdminPatterns,
        dto: new CreateAdminDto(),
      };

    case 'consultant':
      return {
        pattern: DoctorPatterns,
        dto: new CreateDoctorDto(),
      };

    case 'patient':
      return {
        pattern: PatientPatterns,
        dto: new CreatePatientDto(),
      };

    case 'pharmacy':
      return {
        pattern: PharmacyPatterns,
        dto: new CreatePharmacyDto(),
      };

    case 'lab':
      return {
        pattern: LaboratoryPatterns,
        dto: new CreateLaboratoryDto(),
      };

    default:
      throw new BadRequestException({ error: `Unsupported role: ${role}` });
  }
};
