import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReviewQueryDto,
  AuthRole,
} from '@medicpadi-backend/contracts';
import { AuthGuard, RequestWithUser } from '../../guards/auth/auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../guards/decorators/roles.decorator';

@ApiTags('Reviews')
@ApiBearerAuth('access-token')
@Controller('profile/reviews')
@UseGuards(AuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles(AuthRole.PATIENT)
  @ApiOperation({
    summary: 'Create a review',
    description:
      'Creates a review for a doctor, pharmacy, or laboratory profile. Only patients can submit reviews.',
  })
  @ApiResponse({ status: 201, description: 'Review created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions — patient role required.',
  })
  create(
    @Body() createReviewDto: CreateReviewDto,
    @Req() request: RequestWithUser,
  ) {
    return this.reviewsService.create(request.user.id, createReviewDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all reviews',
    description:
      'Returns a paginated list of reviews, optionally filtered by profile type and/or profile id.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of reviews.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  findAll(@Query() query: ReviewQueryDto) {
    return this.reviewsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a review by ID',
  })
  @ApiParam({ name: 'id', description: 'UUID of the review to retrieve.' })
  @ApiResponse({ status: 200, description: 'Review found.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  retrieve(@Param('id') id: string) {
    return this.reviewsService.retrieve(id);
  }

  @Patch(':id')
  @Roles(AuthRole.PATIENT)
  @ApiOperation({
    summary: 'Update a review',
    description: 'Updates a review. Only the reviewing patient can edit it.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the review to update.' })
  @ApiResponse({ status: 200, description: 'Review updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, updateReviewDto);
  }

  @Delete(':id')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Delete a review',
  })
  @ApiParam({ name: 'id', description: 'UUID of the review to delete.' })
  @ApiResponse({ status: 200, description: 'Review deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}
