import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ReviewedProfileType } from '../../../enums/reviews.enum';

export class CreateReviewDto {
  @ApiProperty({ description: 'Review message/comment' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({
    description: 'Type of profile being reviewed',
    enum: ReviewedProfileType,
  })
  @IsEnum(ReviewedProfileType)
  profile_type!: ReviewedProfileType;

  @ApiProperty({
    description: 'ID of the doctor, pharmacy, or laboratory being reviewed',
  })
  @IsUUID()
  profile_id!: string;

  @ApiProperty({ description: 'Rating from 1 to 5', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;
}
