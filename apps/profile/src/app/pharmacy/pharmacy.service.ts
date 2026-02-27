import { Injectable, RequestTimeoutException } from '@nestjs/common';
import {
  CreatePharmacyDto,
  UpdatePharmacyDto,
} from '@medicpadi-backend/contracts';
import { Pharmacy } from '../../entities/pharmacy.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../../entities/admin.entity';

@Injectable()
export class PharmacyService {
  constructor(
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepository: Repository<Pharmacy>,
  ) {}

  create(createPharmacyDto: CreatePharmacyDto) {
    try {
      const pharmacyProfile = this.pharmacyRepository.create({
        ...createPharmacyDto,
      });
      this.pharmacyRepository.save(pharmacyProfile);
      return pharmacyProfile;
    } catch (error) {
      throw new RequestTimeoutException("Unable to create Pharmacy's profile");
    }
  }

  findAll() {
    return `This action returns all pharmacy`;
  }

  async findOne(id: string) {
    let profile: Pharmacy;
    try {
      profile = await this.pharmacyRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RequestTimeoutException('Unable to retrieve Pharmacy profile');
    }
    return profile;
  }

  async update(id: string, updatePharmacyDto: UpdatePharmacyDto) {
    let existingPharmacyProfile: Pharmacy;
    try {
      existingPharmacyProfile = await this.pharmacyRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RequestTimeoutException("Unable to update Pharmacy's profile");
    }
    const pharmacyProfile = await this.pharmacyRepository.update(
      { user_id: id },
      { ...updatePharmacyDto },
    );
    return pharmacyProfile;
  }

  remove(id: string) {
    return `This action removes a #${id} pharmacy`;
  }
}
