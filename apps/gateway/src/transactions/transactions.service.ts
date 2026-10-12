import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  TransactionPatterns,
  AuthRole,
  CreateTransactionDto,
  CreateWithdrawalDto,
  UpdateTransactionDto,
  PaginationDto,
  SavePayoutAccountDto,
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

  async findOne(id: string, user: { id: string; role: string }) {
    const transaction = await firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.TRANSACTIONS.RETRIEVE,
        withServiceAuth(id, this.serviceToken),
      ),
    );
    // Non-admins only see transactions they paid or received; others look missing
    const isParty =
      transaction?.user_id === user.id || transaction?.provider_id === user.id;
    if (!transaction || (user.role !== AuthRole.ADMIN && !isParty)) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
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

  async listBanks() {
    return firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.PAYOUT.LIST_BANKS,
        withServiceAuth({}, this.serviceToken),
      ),
    );
  }

  async getPayoutAccount(userId: string) {
    return firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.PAYOUT.GET_ACCOUNT,
        withServiceAuth(userId, this.serviceToken),
      ),
    );
  }

  async savePayoutAccount(dto: SavePayoutAccountDto) {
    return firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.PAYOUT.SAVE_ACCOUNT,
        withServiceAuth(dto, this.serviceToken),
      ),
    );
  }

  async createWithdrawal(dto: CreateWithdrawalDto) {
    return firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.WITHDRAWAL.CREATE,
        withServiceAuth(dto, this.serviceToken),
      ),
    );
  }

  async findWithdrawals(query: PaginationDto) {
    return firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.WITHDRAWAL.FIND_ALL,
        withServiceAuth(query, this.serviceToken),
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
