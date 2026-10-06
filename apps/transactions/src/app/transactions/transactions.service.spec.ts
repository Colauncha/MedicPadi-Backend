import { RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { PaymentGateway, PaymentStatus } from '@medicpadi-backend/contracts';
import { TransactionsService } from './transactions.service';
import { Transaction } from '../../entities/transaction.entity';
import { Wallet } from '../../entities/wallet.entity';

const makeTransaction = (overrides: Partial<Transaction> = {}) =>
  ({
    id: 'tx-1',
    source_id: 'appointment-1',
    provider_id: 'doctor-1',
    amount: 10000,
    payment_status: PaymentStatus.ESCROW,
    gateway: PaymentGateway.PAYSTACK,
    gateway_reference: 'ref-123',
    ...overrides,
  }) as Transaction;

const makeWallet = (balance: number) =>
  ({ id: 'wallet-1', user_id: 'doctor-1', balance }) as Wallet;

describe('TransactionsService', () => {
  let service: TransactionsService;
  let manager: { findOne: jest.Mock; save: jest.Mock };
  let queryRunner: Record<string, jest.Mock | typeof manager>;
  let config: Record<string, unknown>;

  beforeEach(() => {
    manager = { findOne: jest.fn(), save: jest.fn((e) => e) };
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager,
    };
    config = {
      'appConfig.medicpadiCommission': 0.05,
      'appConfig.internalServiceToken': 'token',
      'paystackConfig.paystackApiUrl': 'https://api.paystack.co',
      'paystackConfig.secretKey': 'sk_test',
    };
    const configService = {
      get: jest.fn((key: string) => config[key]),
      getOrThrow: jest.fn((key: string) => config[key]),
    } as unknown as ConfigService;
    const dataSource = {
      createQueryRunner: () => queryRunner,
    } as unknown as DataSource;
    const client = {
      send: jest.fn(),
      emit: jest.fn(),
    } as unknown as ClientProxy;

    service = new TransactionsService(
      {} as Repository<Transaction>,
      {} as Repository<Wallet>,
      dataSource,
      configService,
      client,
      client,
      client,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const findReturns = (tx: Transaction | null, wallet?: Wallet | null) => {
    manager.findOne.mockImplementation(async (entity: unknown) =>
      entity === Transaction ? tx : (wallet ?? null),
    );
  };

  describe('creditProviderWallet', () => {
    it('credits the payment minus commission and marks it paid', async () => {
      const tx = makeTransaction();
      const wallet = makeWallet(0);
      findReturns(tx, wallet);

      const result = await service.creditProviderWallet('appointment-1');

      expect(wallet.balance).toBe(9500);
      expect(tx.payment_status).toBe(PaymentStatus.PAID);
      expect(result).toMatchObject({
        amount: 10000,
        commission: 500,
        payout: 9500,
      });
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('adds numerically to decimal values even if they arrive as strings', async () => {
      const tx = makeTransaction({ amount: '2500.00' as unknown as number });
      const wallet = makeWallet('100.50' as unknown as number);
      findReturns(tx, wallet);

      await service.creditProviderWallet('appointment-1');

      expect(wallet.balance).toBe(2475.5); // 100.50 + 2500 * 0.95
    });

    it('locks the transaction and wallet rows', async () => {
      findReturns(makeTransaction(), makeWallet(0));

      await service.creditProviderWallet('appointment-1');

      for (const [, options] of manager.findOne.mock.calls) {
        expect(options.lock).toEqual({ mode: 'pessimistic_write' });
      }
    });

    it('is a no-op when the transaction is already paid', async () => {
      findReturns(makeTransaction({ payment_status: PaymentStatus.PAID }));

      const result = await service.creditProviderWallet('appointment-1');

      expect(result).toEqual({ message: 'Provider wallet already credited' });
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('rejects a refunded transaction', async () => {
      findReturns(makeTransaction({ payment_status: PaymentStatus.REFUNDED }));

      await expect(
        service.creditProviderWallet('appointment-1'),
      ).rejects.toBeInstanceOf(RpcException);
      expect(manager.save).not.toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('rejects an invalid commission configuration', async () => {
      config['appConfig.medicpadiCommission'] = 1.5;
      findReturns(makeTransaction(), makeWallet(0));

      await expect(
        service.creditProviderWallet('appointment-1'),
      ).rejects.toBeInstanceOf(RpcException);
      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('refundTransaction', () => {
    let fetchMock: jest.SpyInstance;

    beforeEach(() => {
      fetchMock = jest.spyOn(global, 'fetch');
    });

    it('refunds an escrowed Paystack payment and marks it refunded', async () => {
      const tx = makeTransaction();
      findReturns(tx);
      fetchMock.mockResolvedValue({
        json: async () => ({ status: true, message: 'Refund queued' }),
      } as Response);

      await service.refundTransaction('appointment-1');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.paystack.co/refund',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ transaction: 'ref-123' }),
        }),
      );
      expect(tx.payment_status).toBe(PaymentStatus.REFUNDED);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('does not mark refunded when Paystack rejects the refund', async () => {
      const tx = makeTransaction();
      findReturns(tx);
      fetchMock.mockResolvedValue({
        json: async () => ({ status: false, message: 'Insufficient balance' }),
      } as Response);

      await expect(
        service.refundTransaction('appointment-1'),
      ).rejects.toBeInstanceOf(RpcException);
      expect(tx.payment_status).toBe(PaymentStatus.ESCROW);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('is a no-op when already refunded', async () => {
      findReturns(makeTransaction({ payment_status: PaymentStatus.REFUNDED }));

      const result = await service.refundTransaction('appointment-1');

      expect(result).toEqual({ message: 'Transaction already refunded' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('refuses to refund money already paid out to the provider', async () => {
      findReturns(makeTransaction({ payment_status: PaymentStatus.PAID }));

      await expect(
        service.refundTransaction('appointment-1'),
      ).rejects.toBeInstanceOf(RpcException);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
