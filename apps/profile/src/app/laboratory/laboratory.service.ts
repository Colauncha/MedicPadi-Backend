import { Injectable, RequestTimeoutException } from '@nestjs/common';
import {
  CreateLaboratoryDto,
  UpdateLaboratoryDto,
} from '@medicpadi-backend/contracts';
import { Laboratory } from '../../entities/laboratory.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class LaboratoryService {
  constructor(
    @InjectRepository(Laboratory)
    private readonly labRepository: Repository<Laboratory>,
  ) {}

  create(createLaboratoryDto: CreateLaboratoryDto) {
    try {
      const adminProfile = this.labRepository.create({
        ...createLaboratoryDto,
      });
      this.labRepository.save(adminProfile);
      return adminProfile;
    } catch (error) {
      throw new RequestTimeoutException('Unable to create Labs profile');
    }
  }

  findAll() {
    return `This action returns all laboratory`;
  }

  findOne(id: number) {
    return `This action returns a #${id} laboratory`;
  }

  async update(id: string, updateLaboratoryDto: UpdateLaboratoryDto) {
    let existingLaboratoryProfile: Laboratory;
    try {
      existingLaboratoryProfile = await this.labRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RequestTimeoutException(
        "Unable to update Laboratory's profile",
      );
    }
    const labProfile = await this.labRepository.update(
      { user_id: id },
      { ...updateLaboratoryDto },
    );
    return labProfile;
  }

  remove(id: number) {
    return `This action removes a #${id} laboratory`;
  }
}
