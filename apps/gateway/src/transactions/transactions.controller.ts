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
} from '@nestjs/common';
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
@UseGuards(AuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  create(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }

  @Get()
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.PHARMACY, AuthRole.LAB, AuthRole.ADMIN)
  findAll(@Query() query: PaginationDto) {
    return this.transactionsService.findAll(query);
  }

  @Get(':id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.PHARMACY, AuthRole.LAB, AuthRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Patch(':id')
  @Roles(AuthRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(AuthRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.transactionsService.remove(id);
  }
}
