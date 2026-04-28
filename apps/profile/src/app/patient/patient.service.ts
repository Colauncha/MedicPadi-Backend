import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CreatePatientDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdatePatientDto,
} from '@medicpadi-backend/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../../entities/patient.entity';
import { RpcException } from '@nestjs/microservices';

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
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to create Patient's profile",
      } as ServiceError);
    }
  }

  async findAll(query: PaginationDto): Promise<PaginationResponseDto<Patient>> {
    let page = query.page || 1;
    let limit = query.limit || 10;

    let profileResponse: PaginationResponseDto<Patient> = {
      data: [],
      total: 0,
      page: page,
      limit: limit,
    };

    try {
      [profileResponse.data, profileResponse.total] =
        await this.patientRepository.findAndCount({
          take: limit,
          skip: (page - 1) * limit,
          order: {
            createdAt: 'DESC',
          },
        });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Patient profiles',
      } as ServiceError);
    }
    return profileResponse;
  }

  async findOne(id: string) {
    let profile: Patient | null;
    try {
      profile = await this.patientRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Patient profile',
      } as ServiceError);
    }
    return profile;
  }

  async update(id: string | undefined, updatePatientDto: UpdatePatientDto) {
    let existingPatientProfile: Patient | null;
    try {
      existingPatientProfile = await this.patientRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to update Patient's profile",
      } as ServiceError);
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
