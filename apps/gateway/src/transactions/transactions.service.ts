import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  TransactionPatterns,
  CreateTransactionDto,
  UpdateTransactionDto,
  PaginationDto,
} from '@medicpadi-backend/contracts';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject('TRANSACTIONS_SERVICE')
    private readonly transactionsClient: ClientProxy,
    @Inject() private readonly configService: ConfigService,
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

  async verify(reference: string) {
    return firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.TRANSACTIONS.VERIFY,
        reference,
      ),
    );
  }

  async handleWebhook(signature: string, rawBody: Buffer, body: any) {
    const secret = this.configService.get<string>('paystackConfig.secretKey');
    const hash = createHmac('sha512', secret ?? '')
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      throw new UnauthorizedException('Invalid Paystack signature');
    }

    return firstValueFrom(
      this.transactionsClient.send(TransactionPatterns.TRANSACTIONS.WEBHOOK, body),
    );
  }
}
