import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateTransactionDto,
  PaginationDto,
  TransactionPatterns,
  UpdateTransactionDto,
} from '@medicpadi-backend/contracts';
import { TransactionsService } from './transactions.service';

@Controller()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @MessagePattern(TransactionPatterns.TRANSACTIONS.CREATE)
  create(@Payload() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }

  @MessagePattern(TransactionPatterns.TRANSACTIONS.FIND_ALL)
  findAll(@Payload() query: PaginationDto) {
    return this.transactionsService.findAll(query);
  }

  @MessagePattern(TransactionPatterns.TRANSACTIONS.RETRIEVE)
  findOne(@Payload() id: string) {
    return this.transactionsService.findOne(id);
  }

  @MessagePattern(TransactionPatterns.TRANSACTIONS.UPDATE)
  update(@Payload() dto: UpdateTransactionDto) {
    return this.transactionsService.update(dto.id, dto);
  }

  @MessagePattern(TransactionPatterns.TRANSACTIONS.DELETE)
  remove(@Payload() id: string) {
    return this.transactionsService.remove(id);
  }
}