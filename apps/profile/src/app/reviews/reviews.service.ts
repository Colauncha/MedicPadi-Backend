import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Reviews } from '../../entities/reviews.entity';
import {
  FindOptionsOrderValue,
  FindOptionsWhere,
  ILike,
  Repository,
} from 'typeorm';
import {
  ServiceError,
  CreateReviewDto,
  UpdateReviewDto,
  ReviewQueryDto,
  ReviewedProfileType,
  PaginationResponseDto,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse } from '@medicpadi-backend/utils';
import { RpcException } from '@nestjs/microservices';
import { LaboratoryService } from '../laboratory/laboratory.service';
import { PharmacyService } from '../pharmacy/pharmacy.service';
import { DoctorsService } from '../doctors/doctors.service';
import { PatientService } from '../patient/patient.service';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Reviews)
    private readonly reviewRepository: Repository<Reviews>,
    private readonly doctorService: DoctorsService,
    private readonly pharmacyService: PharmacyService,
    private readonly laboratoryService: LaboratoryService,
    private readonly patientService: PatientService,
  ) {}

  private resolveProfileRef(
    profile_type: ReviewedProfileType,
    profile_id: string,
  ) {
    if (profile_type === ReviewedProfileType.Doctor)
      return { doctor_id: profile_id };
    if (profile_type === ReviewedProfileType.Pharmacy)
      return { pharmacy_id: profile_id };
    return { laboratory_id: profile_id };
  }

  async updateProviderRating(
    profile_type: ReviewedProfileType,
    profile_id: string,
    rating: number,
    totalReviews: number,
  ) {
    console.log('Check 2');
    if (profile_type === ReviewedProfileType.Doctor) {
      await this.doctorService.updateRating(profile_id, rating, totalReviews);
    } else if (profile_type === ReviewedProfileType.Pharmacy) {
      await this.pharmacyService.updateRating(profile_id, rating, totalReviews);
    } else if (profile_type === ReviewedProfileType.Laboratory) {
      await this.laboratoryService.updateRating(
        profile_id,
        rating,
        totalReviews,
      );
    }
    console.log('Check 3');
  }

  async create(reviewDto: CreateReviewDto & { reviewer_id: string }) {
    try {
      const { profile_id, profile_type, reviewer_id, rating, message } =
        reviewDto;
      const final_rating = Math.min(Math.max(rating, 1), 5);

      const totalReviews = await this.reviewRepository.count({
        where: this.resolveProfileRef(profile_type, profile_id),
      });

      const patient = await this.patientService.findBy({
        user_id: reviewer_id,
      });
      if (!patient) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Reviewer not found',
        } as ServiceError);
      }

      console.log('Check 1');
      const review = this.reviewRepository.create({
        message,
        rating: final_rating,
        profile_type,
        reviewer_id: patient.id,
        ...this.resolveProfileRef(profile_type, profile_id),
      });
      await this.reviewRepository.save(review);
      await this.updateProviderRating(
        profile_type,
        profile_id,
        final_rating,
        totalReviews,
      );
      return review;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create Review',
        error,
      } as ServiceError);
    }
  }

  async retrive(id: string) {
    let review: Reviews | null;
    try {
      review = await this.reviewRepository.findOne({
        where: { id: id },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Review',
      } as ServiceError);
    }
    return review;
  }

  async findAll(
    query: ReviewQueryDto,
  ): Promise<PaginationResponseDto<Reviews>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { id, order, search, profile_type } = query;
    try {
      const baseFilter: FindOptionsWhere<Reviews> = {};
      if (profile_type) baseFilter.profile_type = profile_type;

      if (id) {
        if (profile_type === ReviewedProfileType.Doctor)
          baseFilter.doctor_id = id;
        else if (profile_type === ReviewedProfileType.Pharmacy)
          baseFilter.pharmacy_id = id;
        else if (profile_type === ReviewedProfileType.Laboratory)
          baseFilter.laboratory_id = id;
        else baseFilter.reviewer_id = id;
      }

      const where: FindOptionsWhere<Reviews> = search
        ? { ...baseFilter, message: ILike(`%${search}%`) }
        : baseFilter;

      const [data, total] = await this.reviewRepository.findAndCount({
        where,
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: order as FindOptionsOrderValue },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Reviews',
      } as ServiceError);
    }
  }

  async update(id: string | undefined, updateReviewDto: UpdateReviewDto) {
    let existingReview: Reviews | null;
    try {
      existingReview = await this.reviewRepository.findOne({
        where: { id: id },
      });
      if (!existingReview) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Review not found',
        } as ServiceError);
      }

      const { profile_id, profile_type, message, rating } = updateReviewDto;
      const profileRef =
        profile_type && profile_id
          ? this.resolveProfileRef(profile_type, profile_id)
          : {};

      const formatedRating = rating ? Math.min(Math.max(rating, 1), 5) : 1;

      const updateResponse = await this.reviewRepository.update(
        { id: id },
        {
          message,
          rating: formatedRating,
          ...(profile_type ? { profile_type } : {}),
          ...profileRef,
        },
      );
      await this.updateProviderRating(
        existingReview.profile_type,
        existingReview.doctor_id ||
          existingReview.pharmacy_id ||
          existingReview.laboratory_id ||
          '',
        formatedRating,
        await this.reviewRepository.count({
          where: this.resolveProfileRef(
            existingReview.profile_type,
            existingReview.doctor_id ||
              existingReview.pharmacy_id ||
              existingReview.laboratory_id ||
              '',
          ),
        }),
      );
      return updateResponse;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to update Review',
      } as ServiceError);
    }
  }

  async remove(id: string) {
    let existingReview: Reviews | null;
    try {
      existingReview = await this.reviewRepository.findOne({
        where: { id: id },
      });
      if (!existingReview) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Review not found',
        } as ServiceError);
      }

      await this.reviewRepository.remove(existingReview);
      return { message: 'Review removed successfully' };
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to update Review',
      } as ServiceError);
    }
  }
}
