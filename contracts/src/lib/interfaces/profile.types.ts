import { CreateAdminDto } from '../dtos/profile/admin/create-admin.dto';
import { UpdateAdminDto } from '../dtos/profile/admin/update-admin.dto';
import { CreateDoctorDto } from '../dtos/profile/doctor/create-doctor.dto';
import { UpdateDoctorDto } from '../dtos/profile/doctor/update-doctor.dto';
import { CreateLaboratoryDto } from '../dtos/profile/laboratory/create-laboratory.dto';
import { UpdateLaboratoryDto } from '../dtos/profile/laboratory/update-laboratory.dto';
import { DoctorQueryDto, LaboratoryQueryDto, PaginationDto, PharmacyQueryDto } from '../dtos/profile/pagination.dto';
import { CreatePatientDto } from '../dtos/profile/patient/create-patient.dto';
import { UpdatePatientDto } from '../dtos/profile/patient/update-patient.dto';
import { CreatePharmacyDto } from '../dtos/profile/pharmacy/create-pharmacy.dto';
import { UpdatePharmacyDto } from '../dtos/profile/pharmacy/update-pharmacy.dto';
import { BusinessHoursDto } from '../dtos/profile/update-business-hours.dto';

export type ProfileDtoType =
  | CreateAdminDto
  | CreateDoctorDto
  | CreatePatientDto
  | CreatePharmacyDto
  | CreateLaboratoryDto;

export type UpdateProfileDtoType =
  | UpdateAdminDto
  | UpdateDoctorDto
  | UpdatePatientDto
  | UpdatePharmacyDto
  | UpdateLaboratoryDto;

export type ProfileQueryDtoType = DoctorQueryDto | PharmacyQueryDto | LaboratoryQueryDto | PaginationDto;