import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ReviewService } from './reviews.service';
import {
  CreateReviewDto,
  ReviewPatterns,
  ReviewQueryDto,
  UpdateReviewDto,
} from '@medicpadi-backend/contracts';

@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @MessagePattern(ReviewPatterns.CREATE)
  create(
    @Payload('data') createReviewDto: CreateReviewDto & { reviewer_id: string },
  ) {
    return this.reviewService.create(createReviewDto);
  }

  @MessagePattern(ReviewPatterns.FIND_ALL)
  findAll(@Payload('data') query: ReviewQueryDto) {
    return this.reviewService.findAll(query);
  }

  @MessagePattern(ReviewPatterns.RETRIEVE)
  retrieve(@Payload('data') id: string) {
    return this.reviewService.retrive(id);
  }

  @MessagePattern(ReviewPatterns.UPDATE)
  update(@Payload('data') updateReviewDto: UpdateReviewDto & { id: string }) {
    const { id, ...rest } = updateReviewDto;
    return this.reviewService.update(id, rest);
  }

  @MessagePattern(ReviewPatterns.REMOVE)
  remove(@Payload('data') id: string) {
    return this.reviewService.remove(id);
  }
}
