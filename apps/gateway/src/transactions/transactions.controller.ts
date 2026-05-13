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

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // Public — Paystack calls this; signature is validated inside the service
  @Post('webhook/paystack')
  handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() body: any,
  ) {
    return this.transactionsService.handleWebhook(
      signature,
      req.rawBody!,
      body,
    );
  }

  @UseGuards(AuthGuard)
  @Post()
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  create(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }

  @UseGuards(AuthGuard)
  @Get()
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.PHARMACY, AuthRole.LAB, AuthRole.ADMIN)
  findAll(@Query() query: PaginationDto) {
    return this.transactionsService.findAll(query);
  }

  @UseGuards(AuthGuard)
  @Get('verify/:reference')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  verify(@Param('reference') reference: string) {
    return this.transactionsService.verify(reference);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.PHARMACY, AuthRole.LAB, AuthRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  @Roles(AuthRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactionsService.update(id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @Roles(AuthRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.transactionsService.remove(id);
  }
}
