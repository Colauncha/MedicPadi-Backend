import { Injectable, RequestTimeoutException } from '@nestjs/common';
import {
  CreateDoctorDto,
  PaginationDto,
  UpdateDoctorDto,
} from '@medicpadi-backend/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { Doctor } from '../../entities/doctor.entity';
import { Repository } from 'typeorm';

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
      throw new RequestTimeoutException('Unable to create Doctor profile');
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
      throw new RequestTimeoutException('Unable to retrieve Doctor profiles');
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
      throw new RequestTimeoutException('Unable to retrieve Doctor profile');
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
      throw new RequestTimeoutException("Unable to update Doctor's profile");
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
