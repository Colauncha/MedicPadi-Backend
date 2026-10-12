import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Query,
  Headers,
  RawBodyRequest,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { TransactionsService } from './transactions.service';
import {
  AuthRole,
  CreateTransactionDto,
  CreateWithdrawalDto,
  UpdateTransactionDto,
  PaginationDto,
  SavePayoutAccountDto,
} from '@medicpadi-backend/contracts';
import { AuthGuard, RequestWithUser } from '../guards/auth/auth.guard';
import { Roles } from '../guards/decorators/roles.decorator';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

// The gateway has no global ValidationPipe, so validate at the edge.
const validate = new ValidationPipe({ whitelist: true, transform: true });

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
    description: 'Returns a paginated list of transactions. All authenticated roles can access this endpoint; results are scoped to transactions the caller paid or received. Admins may pass `id` to list a given user\'s transactions, or omit it to list all.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of transactions.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  findAll(@Query(validate) query: PaginationDto, @Req() req: RequestWithUser) {
    // Only admins may list another user's (or everyone's) transactions
    const id = req.user.role === AuthRole.ADMIN ? query.id : req.user.id;
    return this.transactionsService.findAll({
      page: query.page,
      limit: query.limit,
      id,
    });
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
  @Get('banks')
  @Roles(AuthRole.CONSULTANT, AuthRole.PHARMACY, AuthRole.LAB, AuthRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List supported banks',
    description:
      'Returns the Nigerian banks Paystack can pay out to. Use a bank `code` when saving a payout account. Accessible by `consultant`, `pharmacy`, `lab` and `admin` roles.',
  })
  @ApiResponse({ status: 200, description: 'List of banks with their codes.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 502, description: 'Paystack could not be reached.' })
  listBanks() {
    return this.transactionsService.listBanks();
  }

  @UseGuards(AuthGuard)
  @Get('payout-account')
  @Roles(AuthRole.CONSULTANT, AuthRole.PHARMACY, AuthRole.LAB)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get my payout account',
    description:
      'Returns the bank account withdrawals are paid into, or null if none is saved. Accessible by `consultant`, `pharmacy` and `lab` roles.',
  })
  @ApiResponse({ status: 200, description: 'The saved payout account, or null.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  getPayoutAccount(@Req() req: RequestWithUser) {
    return this.transactionsService.getPayoutAccount(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Put('payout-account')
  @Roles(AuthRole.CONSULTANT, AuthRole.PHARMACY, AuthRole.LAB)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Save my payout account',
    description:
      'Verifies the bank account with Paystack and saves it as the destination for withdrawals, replacing any previous account. Accessible by `consultant`, `pharmacy` and `lab` roles.',
  })
  @ApiResponse({ status: 200, description: 'Payout account saved; includes the resolved account name.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 502, description: 'Paystack could not resolve or register the account.' })
  savePayoutAccount(
    @Body(validate) dto: SavePayoutAccountDto,
    @Req() req: RequestWithUser,
  ) {
    return this.transactionsService.savePayoutAccount({
      ...dto,
      user_id: req.user.id,
    });
  }

  @UseGuards(AuthGuard)
  @Post('withdrawals')
  @Roles(AuthRole.CONSULTANT, AuthRole.PHARMACY, AuthRole.LAB)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Withdraw from my wallet',
    description:
      'Debits the amount from the wallet and transfers it to the saved payout account via Paystack. The withdrawal starts as `pending`/`processing` and becomes `success`, or `failed`/`reversed` with the amount returned to the wallet. Only one withdrawal can be in progress at a time. Accessible by `consultant`, `pharmacy` and `lab` roles.',
  })
  @ApiResponse({ status: 201, description: 'Withdrawal created.' })
  @ApiResponse({ status: 400, description: 'Below the minimum, insufficient balance, or no payout account.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 409, description: 'A withdrawal is already in progress.' })
  @ApiResponse({ status: 502, description: 'Paystack declined the transfer; the amount was returned to the wallet.' })
  createWithdrawal(
    @Body(validate) dto: CreateWithdrawalDto,
    @Req() req: RequestWithUser,
  ) {
    return this.transactionsService.createWithdrawal({
      ...dto,
      user_id: req.user.id,
    });
  }

  @UseGuards(AuthGuard)
  @Get('withdrawals')
  @Roles(AuthRole.CONSULTANT, AuthRole.PHARMACY, AuthRole.LAB)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List my withdrawals',
    description:
      'Returns a paginated list of the caller\'s withdrawals, newest first. Accessible by `consultant`, `pharmacy` and `lab` roles.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of withdrawals.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  findWithdrawals(
    @Query(validate) query: PaginationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.transactionsService.findWithdrawals({
      page: query.page,
      limit: query.limit,
      id: req.user.id,
    });
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.PHARMACY, AuthRole.LAB, AuthRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get a transaction by ID',
    description: 'Returns a single transaction record. Non-admins can only retrieve transactions they paid or received; any other id returns 404.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the transaction.' })
  @ApiResponse({ status: 200, description: 'Transaction found.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.transactionsService.findOne(id, req.user);
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
