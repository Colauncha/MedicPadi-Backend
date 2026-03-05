import { Injectable, RequestTimeoutException } from '@nestjs/common';
import {
  CreatePatientDto,
  PaginationDto,
  UpdatePatientDto,
} from '@medicpadi-backend/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../../entities/patient.entity';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  create(createPatientDto: CreatePatientDto) {
    try {
      const patientProfile = this.patientRepository.create({
        ...createPatientDto,
      });
      this.patientRepository.save(patientProfile);
      return patientProfile;
    } catch (error) {
      throw new RequestTimeoutException("Unable to create Patient's profile");
    }
  }

  async findAll(query: PaginationDto) {
    let profile: Patient[];
    try {
      profile = await this.patientRepository.find({
        take: query.limit,
        skip: (query.page - 1) * query.limit,
      });
    } catch (error) {
      throw new RequestTimeoutException('Unable to retrieve Patient profiles');
    }
    return profile;
  }

  async findOne(id: string) {
    let profile: Patient;
    try {
      profile = await this.patientRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RequestTimeoutException('Unable to retrieve Patient profile');
    }
    return profile;
  }

  async update(id: string, updatePatientDto: UpdatePatientDto) {
    let existingPatientProfile: Patient;
    try {
      existingPatientProfile = await this.patientRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RequestTimeoutException("Unable to update Patient's profile");
    }
    const patientProfile = await this.patientRepository.update(
      { user_id: id },
      { ...updatePatientDto },
    );
    return patientProfile;
  }

  remove(id: string) {
    return `This action removes a #${id} patient`;
  }
}
