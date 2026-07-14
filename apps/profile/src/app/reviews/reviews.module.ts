import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reviews } from '../../entities/reviews.entity';
import { ReviewService } from './reviews.service';
import { ReviewController } from './reviews.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Reviews])],
  providers: [ReviewService],
  controllers: [ReviewController],
})
export class ReviewsModule {}
