import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  CreateTransactionDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdateTransactionDto,
} from '@medicpadi-backend/contracts';
import { Transaction } from '../../entities/transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async create(dto: CreateTransactionDto) {
    try {
      const transaction = this.transactionRepo.create(dto);
      await this.transactionRepo.save(transaction);
      return transaction;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create transaction',
      } as ServiceError);
    }
  }

  async findAll(query: PaginationDto): Promise<PaginationResponseDto<Transaction>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const response: PaginationResponseDto<Transaction> = {
      data: [],
      total: 0,
      page,
      limit,
    };
    try {
      const result = await this.transactionRepo.findAndCount({
        where: query.id ? { user_id: query.id } : {},
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: 'DESC' },
      });
      response.data = result[0];
      response.total = result[1];
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get transactions',
      } as ServiceError);
    }
    return response;
  }

  async findOne(id: string) {
    try {
      return await this.transactionRepo.findOne({ where: { id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get transaction',
      } as ServiceError);
    }
  }

  async update(id: string | undefined, dto: UpdateTransactionDto) {
    try {
      const existing = await this.transactionRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Transaction not found',
        } as ServiceError);
      }
      const result = await this.transactionRepo.update({ id }, dto);
      return result.raw;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to update transaction',
          } as ServiceError);
    }
  }

  async remove(id: string) {
    try {
      const existing = await this.findOne(id);
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Transaction not found',
        } as ServiceError);
      }
      await this.transactionRepo.remove(existing);
      return { message: 'Transaction removed successfully' };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to remove transaction',
          } as ServiceError);
    }
  }
}