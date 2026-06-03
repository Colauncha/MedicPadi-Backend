import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { TransactionsService } from './transactions.service';
import {
  AuthRole,
  CreateTransactionDto,
  UpdateTransactionDto,
  PaginationDto,
} from '@medicpadi-backend/contracts';
import { AuthGuard } from '../guards/auth/auth.guard';
import { Roles } from '../guards/decorators/roles.decorator';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('webhook/paystack')
  @ApiOperation({
    summary: 'Paystack webhook receiver',
    description:
      'Public endpoint that receives payment event notifications from Paystack. The HMAC-SHA512 signature in the `x-paystack-signature` header is verified against the raw request body before any event is processed. Do not call this endpoint directly.',
  })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'HMAC-SHA512 signature of the raw request body, computed using the Paystack secret key.',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Webhook received and processed.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing signature.' })
  handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() body: any,
  ) {
    console.log('Received Paystack webhook:', body);
    return this.transactionsService.handleWebhook(
      signature,
      req.rawBody!,
      body,
    );
  }

  @UseGuards(AuthGuard)
  @Post()
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Initiate a transaction',
    description:
      'Creates a new payment transaction and returns a Paystack payment link for the user to complete checkout. Accessible by `patient` and `admin` roles.',
  })
  @ApiResponse({ status: 201, description: 'Transaction initiated. Response includes a Paystack authorization URL.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — patient or admin role required.' })
  create(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }

  @UseGuards(AuthGuard)
  @Get()
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.PHARMACY, AuthRole.LAB, AuthRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List transactions',
    description: 'Returns a paginated list of transactions. All authenticated roles can access this endpoint; results are scoped to the caller.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of transactions.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  findAll(@Query() query: PaginationDto) {
    return this.transactionsService.findAll(query);
  }

  @UseGuards(AuthGuard)
  @Get('verify/:reference')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Verify a transaction by Paystack reference',
    description:
      'Queries Paystack to confirm the final status of a transaction using its reference code. Useful for manual verification after a redirect. Accessible by `patient` and `admin` roles.',
  })
  @ApiParam({ name: 'reference', description: 'The Paystack transaction reference string.' })
  @ApiResponse({ status: 200, description: 'Transaction verification result from Paystack.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — patient or admin role required.' })
  @ApiResponse({ status: 404, description: 'Transaction reference not found.' })
  verify(@Param('reference') reference: string) {
    return this.transactionsService.verify(reference);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.PHARMACY, AuthRole.LAB, AuthRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get a transaction by ID',
    description: 'Returns a single transaction record. All authenticated roles can access this endpoint.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the transaction.' })
  @ApiResponse({ status: 200, description: 'Transaction found.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  @Roles(AuthRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update a transaction',
    description: 'Allows an admin to manually update transaction metadata or status. Requires the `admin` role.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the transaction to update.' })
  @ApiResponse({ status: 200, description: 'Transaction updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — admin role required.' })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactionsService.update(id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @Roles(AuthRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete a transaction',
    description: 'Permanently removes a transaction record. Requires the `admin` role.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the transaction to delete.' })
  @ApiResponse({ status: 200, description: 'Transaction deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — admin role required.' })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  remove(@Param('id') id: string) {
    return this.transactionsService.remove(id);
  }
}
