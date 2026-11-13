import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reviews } from '../../entities/reviews.entity';
import { ReviewService } from './reviews.service';
import { ReviewController } from './reviews.controller';
import { DoctorsModule } from '../doctors/doctors.module';
import { LaboratoryModule } from '../laboratory/laboratory.module';
import { PharmacyModule } from '../pharmacy/pharmacy.module';
import { PatientModule } from '../patient/patient.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reviews]),
    DoctorsModule,
    LaboratoryModule,
    PharmacyModule,
    PatientModule,
  ],
  providers: [ReviewService],
  controllers: [ReviewController],
})
export class ReviewsModule {}
