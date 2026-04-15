import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CreateDoctorDto,
  PaginationDto,
  ServiceError,
  UpdateDoctorDto,
} from '@medicpadi-backend/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { Doctor } from '../../entities/doctor.entity';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorsRepository: Repository<Doctor>,
  ) {}

  create(createDoctorDto: CreateDoctorDto) {
    try {
      const adminProfile = this.doctorsRepository.create({
        ...createDoctorDto,
      });
      this.doctorsRepository.save(adminProfile);
      return adminProfile;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to Create Doctor's profile",
      } as ServiceError);
    }
  }

  async findAll(query: PaginationDto) {
    let profile: Doctor[];
    try {
      profile = await this.doctorsRepository.find({
        take: query.limit,
        skip: (query.page - 1) * query.limit,
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Doctors profiles',
      } as ServiceError);
    }
    return profile;
  }

  async findOne(id: string) {
    let profile: Doctor;
    try {
      profile = await this.doctorsRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to retrieve Doctor's profile",
      } as ServiceError);
    }
    return profile;
  }

  async update(id: string, updateDoctorDto: UpdateDoctorDto) {
    let existingDoctorProfile: Doctor;
    try {
      existingDoctorProfile = await this.doctorsRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to update Doctor's profile",
      } as ServiceError);
    }
    const doctorsProfile = await this.doctorsRepository.update(
      { user_id: id },
      { ...updateDoctorDto },
    );
    return doctorsProfile;
  }

  remove(id: string) {
    return `This action removes a #${id} doctor`;
  }
}
