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

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Reviews)
    private readonly reviewRepository: Repository<Reviews>,
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

  async create(reviewDto: CreateReviewDto & { reviewer_id: string }) {
    try {
      const { profile_id, profile_type, reviewer_id, ...rest } = reviewDto;
      const review = this.reviewRepository.create({
        ...rest,
        profile_type,
        reviewer_id,
        ...this.resolveProfileRef(profile_type, profile_id),
      });
      await this.reviewRepository.save(review);
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
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to update Review',
      } as ServiceError);
    }
    if (!existingReview) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Review not found',
      } as ServiceError);
    }

    const { profile_id, profile_type, ...rest } = updateReviewDto;
    const profileRef =
      profile_type && profile_id
        ? this.resolveProfileRef(profile_type, profile_id)
        : {};

    return this.reviewRepository.update(
      { id: id },
      { ...rest, ...(profile_type ? { profile_type } : {}), ...profileRef },
    );
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
