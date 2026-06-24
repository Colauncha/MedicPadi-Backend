import { Injectable, RequestTimeoutException } from '@nestjs/common';
import {
  CreateAdminDto,
  UpdateAdminDto,
  PaginationDto,
  PaginationResponseDto,
  SettingsDto,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse } from '@medicpadi-backend/utils';
import { InjectRepository } from '@nestjs/typeorm';
import { Admin } from '../../entities/admin.entity';
import { ILike, Repository } from 'typeorm';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  create(createAdminDto: CreateAdminDto) {
    try {
      const adminProfile = this.adminRepository.create({ ...createAdminDto });
      this.adminRepository.save(adminProfile);
      return adminProfile;
    } catch (error) {
      throw new RequestTimeoutException('Unable to create Admin profile');
    }
  }

  async findAll(query: PaginationDto): Promise<PaginationResponseDto<Admin>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    try {
      const [data, total] = await this.adminRepository.findAndCount({
        take: limit,
        skip: (page - 1) * limit,
        where: query.search
          ? [
              { firstName: ILike(`%${query.search}%`) },
              { lastName: ILike(`%${query.search}%`) },
              { user_id: ILike(`%${query.search}%`) },
            ]
          : {},
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      throw new RequestTimeoutException('Unable to retrieve Admin profiles');
    }
  }

  async findOne(id: string) {
    let profile: Admin | null;
    try {
      profile = await this.adminRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RequestTimeoutException('Unable to retrieve Admin profile');
    }
    return profile;
  }

  async update(id: string | undefined, updateAdminDto: UpdateAdminDto) {
    let existingAdminProfile: Admin | null;
    try {
      existingAdminProfile = await this.adminRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RequestTimeoutException('Unable to update Admin profile');
    }
    const adminProfile = await this.adminRepository.update(
      { user_id: id },
      { ...updateAdminDto },
    );
    return adminProfile;
  }

  async updateSettings(id: string, settingsDto: SettingsDto) {
    try {
      await this.adminRepository.findOne({ where: { user_id: id } });
    } catch (error) {
      throw new RequestTimeoutException('Unable to update Admin settings');
    }
    return this.adminRepository.update({ user_id: id }, { settings: settingsDto });
  }

  remove(id: string) {
    return `This action removes a #${id} admin`;
  }
}
