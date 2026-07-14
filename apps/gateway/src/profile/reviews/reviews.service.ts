import { Inject, Injectable } from '@nestjs/common';
import {
  CreateReviewDto,
  ReviewPatterns,
  ReviewQueryDto,
  UpdateReviewDto,
} from '@medicpadi-backend/contracts';
import { withServiceAuth, logError } from '@medicpadi-backend/utils';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReviewsService {
  constructor(
    @Inject('PROFILE_SERVICE') private readonly profileClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>(
      'appConfig.internalServiceToken',
    );
  }

  async create(reviewerId: string, createReviewDto: CreateReviewDto) {
    try {
      return await firstValueFrom(
        this.profileClient.send(
          ReviewPatterns.CREATE,
          withServiceAuth(
            { ...createReviewDto, reviewer_id: reviewerId },
            this.serviceToken,
          ),
        ),
      );
    } catch (error) {
      logError(error, `${ReviewsService.name}.create`);
      throw error;
    }
  }

  async findAll(query: ReviewQueryDto) {
    try {
      return await firstValueFrom(
        this.profileClient.send(
          ReviewPatterns.FIND_ALL,
          withServiceAuth(query, this.serviceToken),
        ),
      );
    } catch (error) {
      logError(error, `${ReviewsService.name}.findAll`);
      throw error;
    }
  }

  async retrieve(id: string) {
    try {
      return await firstValueFrom(
        this.profileClient.send(
          ReviewPatterns.RETRIEVE,
          withServiceAuth(id, this.serviceToken),
        ),
      );
    } catch (error) {
      logError(error, `${ReviewsService.name}.retrieve`);
      throw error;
    }
  }

  async update(id: string, updateReviewDto: UpdateReviewDto) {
    try {
      return await firstValueFrom(
        this.profileClient.send(
          ReviewPatterns.UPDATE,
          withServiceAuth({ id, ...updateReviewDto }, this.serviceToken),
        ),
      );
    } catch (error) {
      logError(error, `${ReviewsService.name}.update`);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await firstValueFrom(
        this.profileClient.send(
          ReviewPatterns.REMOVE,
          withServiceAuth(id, this.serviceToken),
        ),
      );
    } catch (error) {
      logError(error, `${ReviewsService.name}.remove`);
      throw error;
    }
  }
}
