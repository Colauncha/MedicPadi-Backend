import { Injectable, RequestTimeoutException } from '@nestjs/common';
import {
  CreatePharmacyDto,
  UpdatePharmacyDto,
} from '@medicpadi-backend/contracts';
import { Pharmacy } from '../../entities/pharmacy.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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

  findOne(id: number) {
    return `This action returns a #${id} pharmacy`;
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

  remove(id: number) {
    return `This action removes a #${id} pharmacy`;
  }
}
