import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CreateDoctorDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdateDoctorDto,
} from '@medicpadi-backend/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { Doctor } from '../../entities/doctor.entity';
import { ILike, Repository } from 'typeorm';
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

  async findAll(query: PaginationDto): Promise<PaginationResponseDto<Doctor>> {
    let page = query.page || 1;
    let limit = query.limit || 10;

    let profileResponse: PaginationResponseDto<Doctor> = {
      data: [],
      total: 0,
      page: page || 1,
      limit: limit || 10,
    };
    try {
      [profileResponse.data, profileResponse.total] =
        await this.doctorsRepository.findAndCount({
          take: limit,
          skip: (page - 1) * limit,
          where: query.search
            ? [
                { firstName: ILike(`%${query.search}%`) },
                { lastName: ILike(`%${query.search}%`) },
                { licenceNumber: ILike(`%${query.search}%`) },
              ]
            : {},
          order: { createdAt: 'DESC' },
        });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Doctors profiles',
      } as ServiceError);
    }
    return profileResponse;
  }

  async findOne(id: string) {
    let profile: Doctor | null;
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

  async update(id: string | undefined, updateDoctorDto: UpdateDoctorDto) {
    let existingDoctorProfile: Doctor | null;
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
