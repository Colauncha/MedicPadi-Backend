import { Injectable, RequestTimeoutException } from '@nestjs/common';
import { CreateAdminDto, UpdateAdminDto } from '@medicpadi-backend/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { Admin } from '../../entities/admin.entity';
import { Repository } from 'typeorm';

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

  findAll() {
    return `This action returns all admin`;
  }

  findOne(id: string) {
    return `This action returns a #${id} admin`;
  }

  async update(id: string, updateAdminDto: UpdateAdminDto) {
    let existingAdminProfile: Admin;
    try {
      existingAdminProfile = await this.adminRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RequestTimeoutException('Unable to create Admin profile');
    }
    const adminProfile = await this.adminRepository.update(
      { user_id: id },
      { ...updateAdminDto },
    );
    return adminProfile;
  }

  remove(id: string) {
    return `This action removes a #${id} admin`;
  }
}
