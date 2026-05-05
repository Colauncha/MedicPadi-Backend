import { Inject, Injectable } from '@nestjs/common';
import {
  TransactionPatterns,
  CreateTransactionDto,
  UpdateTransactionDto,
  PaginationDto,
} from '@medicpadi-backend/contracts';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject('TRANSACTIONS_SERVICE')
    private readonly transactionsClient: ClientProxy,
  ) {}

  async create(dto: CreateTransactionDto) {
    return firstValueFrom(
      this.transactionsClient.send(TransactionPatterns.TRANSACTIONS.CREATE, dto),
    );
  }

  async findAll(query: PaginationDto) {
    return firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.TRANSACTIONS.FIND_ALL,
        query,
      ),
    );
  }

  async findOne(id: string) {
    return firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.TRANSACTIONS.RETRIEVE,
        id,
      ),
    );
  }

  async update(id: string, dto: UpdateTransactionDto) {
    return firstValueFrom(
      this.transactionsClient.send(TransactionPatterns.TRANSACTIONS.UPDATE, {
        id,
        ...dto,
      }),
    );
  }

  async remove(id: string) {
    return firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.TRANSACTIONS.DELETE,
        id,
      ),
    );
  }
}
