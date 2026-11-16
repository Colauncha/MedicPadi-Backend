import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthRole,
  SubscribeDto,
  SubscriptionAudience,
  SubscriptionJobName,
  SubscriptionLevel,
  UpdateSubscriptionPlanDto,
} from '@medicpadi-backend/contracts';
import { AuthGuard, RequestWithUser } from '../../guards/auth/auth.guard';
import { Roles } from '../../guards/decorators/roles.decorator';
import { SubscriptionsService } from './subscriptions.service';

const validate = new ValidationPipe({ whitelist: true, transform: true });
const SUBSCRIBER_ROLES = [
  AuthRole.PATIENT,
  AuthRole.CONSULTANT,
  AuthRole.PHARMACY,
  AuthRole.LAB,
];

@ApiTags('Subscriptions')
@ApiBearerAuth('access-token')
@Controller('profile/subscriptions')
@UseGuards(AuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @Roles(...SUBSCRIBER_ROLES, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'List subscription plans',
    description:
      'Returns the active plans for the caller. Patients see Free, Basic and Premium; providers (consultants, pharmacies, labs) see Free and Professional. Admins see every plan.',
  })
  @ApiResponse({ status: 200, description: 'List of plans.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  findPlans(@Req() request: RequestWithUser) {
    return this.subscriptionsService.findPlans(request.user.role as AuthRole);
  }

  @Get('me')
  @Roles(...SUBSCRIBER_ROLES)
  @ApiOperation({
    summary: 'Get my subscription',
    description:
      'Returns the current subscription (plan, status, billing period, card on file). Users without one are on the Free plan.',
  })
  @ApiResponse({ status: 200, description: 'Current subscription.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  getMine(@Req() request: RequestWithUser) {
    return this.subscriptionsService.getMine({
      userId: request.user.id,
      role: request.user.role as AuthRole,
    });
  }

  @Post('subscribe')
  @Roles(...SUBSCRIBER_ROLES)
  @ApiOperation({
    summary: 'Subscribe to or change a plan',
    description:
      'For a paid plan, returns a Paystack `authorization_url` to complete checkout; the plan activates once payment succeeds and renews monthly on the saved card. Choosing Free on a paid plan cancels at the end of the current period. Changing between paid plans starts a new billing period on payment (no proration).',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout started or subscription updated.',
  })
  @ApiResponse({
    status: 400,
    description: 'Plan not available for your role.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 409, description: 'Already on this plan.' })
  subscribe(
    @Body(validate) dto: SubscribeDto,
    @Req() request: RequestWithUser,
  ) {
    return this.subscriptionsService.subscribe({
      ...dto,
      userId: request.user.id,
      role: request.user.role as AuthRole,
    });
  }

  @Post('cancel')
  @Roles(...SUBSCRIBER_ROLES)
  @ApiOperation({
    summary: 'Cancel my subscription',
    description:
      'Stops future charges. Access continues until the end of the current billing period, then the account moves to Free.',
  })
  @ApiResponse({ status: 201, description: 'Cancellation scheduled.' })
  @ApiResponse({ status: 400, description: 'Nothing to cancel (Free plan).' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  cancel(@Req() request: RequestWithUser) {
    return this.subscriptionsService.cancel({
      userId: request.user.id,
      role: request.user.role as AuthRole,
    });
  }

  @Patch('plans/:audience/:code')
  @Roles(AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Update a plan (admin)',
    description:
      "Edits price, name, description, features or availability of a plan. New prices apply from each subscriber's next renewal.",
  })
  @ApiParam({ name: 'audience', enum: SubscriptionAudience })
  @ApiParam({ name: 'code', enum: SubscriptionLevel })
  @ApiResponse({ status: 200, description: 'Updated plan.' })
  @ApiResponse({ status: 403, description: 'Admin role required.' })
  @ApiResponse({ status: 404, description: 'Plan not found.' })
  adminUpdatePlan(
    @Param('audience', new ParseEnumPipe(SubscriptionAudience))
    audience: SubscriptionAudience,
    @Param('code', new ParseEnumPipe(SubscriptionLevel))
    code: SubscriptionLevel,
    @Body(validate) dto: UpdateSubscriptionPlanDto,
  ) {
    return this.subscriptionsService.adminUpdatePlan({
      ...dto,
      audience,
      code,
    });
  }

  @Post('jobs/:name/run')
  @Roles(AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Run a subscription job now (admin)',
    description:
      'Enqueues one immediate run of the `reminder` (7-day renewal reminder) or `charge` (monthly billing) job.',
  })
  @ApiParam({ name: 'name', enum: SubscriptionJobName })
  @ApiResponse({ status: 201, description: 'Job queued.' })
  @ApiResponse({ status: 403, description: 'Admin role required.' })
  runJob(
    @Param('name', new ParseEnumPipe(SubscriptionJobName))
    name: SubscriptionJobName,
  ) {
    return this.subscriptionsService.runJob(name);
  }
}
