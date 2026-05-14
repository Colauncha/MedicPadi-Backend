import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  TransactionPatterns,
  CreateTransactionDto,
  UpdateTransactionDto,
  PaginationDto,
} from '@medicpadi-backend/contracts';
import { withServiceAuth } from '@medicpadi-backend/utils';
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

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>('appConfig.internalServiceToken');
  }

  async create(dto: CreateTransactionDto) {
    return firstValueFrom(
      this.transactionsClient.send(TransactionPatterns.TRANSACTIONS.CREATE, withServiceAuth(dto, this.serviceToken)),
    );
  }

  async findAll(query: PaginationDto) {
    return firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.TRANSACTIONS.FIND_ALL,
        withServiceAuth(query, this.serviceToken),
      ),
    );
  }

  async findOne(id: string) {
    return firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.TRANSACTIONS.RETRIEVE,
        withServiceAuth(id, this.serviceToken),
      ),
    );
  }

  async update(id: string, dto: UpdateTransactionDto) {
    return firstValueFrom(
      this.transactionsClient.send(TransactionPatterns.TRANSACTIONS.UPDATE, withServiceAuth({ id, ...dto }, this.serviceToken)),
    );
  }

  async remove(id: string) {
    return firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.TRANSACTIONS.DELETE,
        withServiceAuth(id, this.serviceToken),
      ),
    );
  }

  async verify(reference: string) {
    return firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.TRANSACTIONS.VERIFY,
        withServiceAuth(reference, this.serviceToken),
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
      this.transactionsClient.send(TransactionPatterns.TRANSACTIONS.WEBHOOK, withServiceAuth(body, this.serviceToken)),
    );
  }
}
