import { RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { of } from 'rxjs';
import {
  NotificationEvents,
  PaymentGateway,
  PaymentStatus,
  SubscriptionPatterns,
  TransactionSourceType,
  WithdrawalStatus,
} from '@medicpadi-backend/contracts';
import { TransactionsService } from './transactions.service';
import { Transaction } from '../../entities/transaction.entity';
import { Wallet } from '../../entities/wallet.entity';
import { PayoutAccount } from '../../entities/payout-account.entity';
import { Withdrawal } from '../../entities/withdrawal.entity';

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
  ({ id: 'wallet-1', user_id: 'doctor-1', balance, currency: 'NGN' }) as Wallet;

const makeAccount = () =>
  ({ user_id: 'doctor-1', recipient_code: 'RCP_1' }) as PayoutAccount;

const makeWithdrawal = (overrides: Partial<Withdrawal> = {}) =>
  ({
    id: 'wd-1',
    user_id: 'doctor-1',
    amount: 5000,
    currency: 'NGN',
    status: WithdrawalStatus.PROCESSING,
    reference: 'wd-ref-1',
    recipient_code: 'RCP_1',
    ...overrides,
  }) as Withdrawal;

const paystackReply = (body: object, status = 200) =>
  ({ status, json: async () => body }) as Response;

describe('TransactionsService', () => {
  let service: TransactionsService;
  let manager: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  let queryRunner: Record<string, jest.Mock | typeof manager>;
  let config: Record<string, unknown>;
  let client: ClientProxy;
  let withdrawalRepo: { findOne: jest.Mock; update: jest.Mock };
  let transactionRepo: {
    findOne: jest.Mock;
    update: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let profileClient: ClientProxy;

  beforeEach(() => {
    manager = {
      findOne: jest.fn(),
      save: jest.fn((e) => e),
      create: jest.fn((_entity, data) => ({ ...data })),
    };
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
      'appConfig.minWithdrawal': 1000,
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
    client = {
      send: jest.fn(),
      emit: jest.fn(),
    } as unknown as ClientProxy;
    withdrawalRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    transactionRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(async (e) => ({ id: 'tx-new', ...e })),
      create: jest.fn((d) => ({ ...d })),
    };
    profileClient = {
      send: jest.fn(),
      emit: jest.fn(),
    } as unknown as ClientProxy;

    service = new TransactionsService(
      transactionRepo as unknown as Repository<Transaction>,
      {} as Repository<Wallet>,
      {} as Repository<PayoutAccount>,
      withdrawalRepo as unknown as Repository<Withdrawal>,
      dataSource,
      configService,
      client,
      client,
      client,
      profileClient,
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

  describe('withdrawals', () => {
    let fetchMock: jest.SpyInstance;
    let wallet: Wallet;
    let rows: Map<unknown, unknown>;

    beforeEach(() => {
      fetchMock = jest.spyOn(global, 'fetch');
      wallet = makeWallet(20000);
      rows = new Map<unknown, unknown>([
        [Wallet, wallet],
        [PayoutAccount, makeAccount()],
        [Withdrawal, null],
      ]);
      // Honours the In(...) status filter used for the in-flight check
      manager.findOne.mockImplementation(
        async (
          entity: unknown,
          options: { where?: { status?: { value?: unknown } } },
        ) => {
          const row = rows.get(entity) as { status?: string } | null;
          const allowed = options?.where?.status?.value;
          if (row && Array.isArray(allowed) && !allowed.includes(row.status)) {
            return null;
          }
          return row ?? null;
        },
      );
      withdrawalRepo.findOne.mockResolvedValue(null);
    });

    describe('createWithdrawal', () => {
      it('holds the amount and sends the transfer to Paystack', async () => {
        fetchMock.mockResolvedValue(
          paystackReply({
            status: true,
            data: { status: 'pending', transfer_code: 'TRF_1' },
          }),
        );

        await service.createWithdrawal({ user_id: 'doctor-1', amount: 5000 });

        expect(wallet.balance).toBe(15000);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://api.paystack.co/transfer');
        expect(JSON.parse(init.body)).toMatchObject({
          source: 'balance',
          amount: 500000,
          recipient: 'RCP_1',
        });
        expect(withdrawalRepo.update).toHaveBeenCalledWith(
          expect.objectContaining({ status: WithdrawalStatus.PENDING }),
          { status: WithdrawalStatus.PROCESSING, transfer_code: 'TRF_1' },
        );
      });

      it.each([
        ['below the minimum', 500, undefined],
        ['above the balance', 25000, undefined],
        ['without a payout account', 5000, PayoutAccount],
      ])('rejects a withdrawal %s', async (_case, amount, missing) => {
        if (missing) rows.set(missing, null);

        await expect(
          service.createWithdrawal({ user_id: 'doctor-1', amount }),
        ).rejects.toBeInstanceOf(RpcException);
        expect(wallet.balance).toBe(20000);
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it('rejects while another withdrawal is in progress', async () => {
        rows.set(Withdrawal, makeWithdrawal());

        await expect(
          service.createWithdrawal({ user_id: 'doctor-1', amount: 5000 }),
        ).rejects.toBeInstanceOf(RpcException);
        expect(wallet.balance).toBe(20000);
        expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      });

      it('returns the hold when Paystack declines the transfer', async () => {
        fetchMock.mockResolvedValue(
          paystackReply(
            { status: false, message: 'Insufficient balance' },
            400,
          ),
        );
        // finalizeWithdrawal re-reads the withdrawal that holdWithdrawal saved
        manager.save.mockImplementation((e) => {
          if (e.reference) rows.set(Withdrawal, e);
          return e;
        });

        await expect(
          service.createWithdrawal({ user_id: 'doctor-1', amount: 5000 }),
        ).rejects.toBeInstanceOf(RpcException);
        expect(wallet.balance).toBe(20000);
        expect((rows.get(Withdrawal) as Withdrawal).status).toBe(
          WithdrawalStatus.FAILED,
        );
      });

      it('keeps the hold when the Paystack outcome is unknown', async () => {
        fetchMock.mockRejectedValue(new Error('socket hang up'));

        await service.createWithdrawal({ user_id: 'doctor-1', amount: 5000 });

        expect(wallet.balance).toBe(15000);
      });
    });

    describe('transfer webhooks', () => {
      it('marks a withdrawal successful without touching the wallet', async () => {
        const wd = makeWithdrawal();
        rows.set(Withdrawal, wd);

        await service.handleWebhook({
          event: 'transfer.success',
          data: { reference: 'wd-ref-1' },
        });

        expect(wd.status).toBe(WithdrawalStatus.SUCCESS);
        expect(wallet.balance).toBe(20000);
        expect(client.emit).toHaveBeenCalledWith(
          NotificationEvents.WITHDRAWAL_SUCCESS,
          expect.anything(),
        );
      });

      it.each([
        ['transfer.failed', WithdrawalStatus.FAILED],
        ['transfer.reversed', WithdrawalStatus.REVERSED],
      ])('%s returns the amount to the wallet', async (event, status) => {
        const wd = makeWithdrawal();
        rows.set(Withdrawal, wd);

        await service.handleWebhook({
          event,
          data: { reference: 'wd-ref-1', reason: 'Bank unavailable' },
        });

        expect(wd.status).toBe(status);
        expect(wd.failure_reason).toBe('Bank unavailable');
        expect(wallet.balance).toBe(25000);
        expect(client.emit).toHaveBeenCalledWith(
          NotificationEvents.WITHDRAWAL_FAILED,
          expect.anything(),
        );
      });

      it('re-credits a transfer reversed after it succeeded', async () => {
        rows.set(
          Withdrawal,
          makeWithdrawal({ status: WithdrawalStatus.SUCCESS }),
        );

        await service.handleWebhook({
          event: 'transfer.reversed',
          data: { reference: 'wd-ref-1' },
        });

        expect(wallet.balance).toBe(25000);
      });

      it('does not credit twice when a failure webhook is replayed', async () => {
        rows.set(Withdrawal, makeWithdrawal());
        const event = {
          event: 'transfer.failed',
          data: { reference: 'wd-ref-1' },
        };

        await service.handleWebhook(event);
        await service.handleWebhook(event);

        expect(wallet.balance).toBe(25000);
        expect(client.emit).toHaveBeenCalledTimes(1);
      });

      it('ignores a success that arrives after a failure', async () => {
        rows.set(
          Withdrawal,
          makeWithdrawal({ status: WithdrawalStatus.FAILED }),
        );

        await service.handleWebhook({
          event: 'transfer.success',
          data: { reference: 'wd-ref-1' },
        });

        expect((rows.get(Withdrawal) as Withdrawal).status).toBe(
          WithdrawalStatus.FAILED,
        );
        expect(client.emit).not.toHaveBeenCalled();
      });
    });

    describe('reconciling a stale withdrawal', () => {
      it('releases the hold when Paystack never received the transfer', async () => {
        const stale = makeWithdrawal({ status: WithdrawalStatus.PENDING });
        withdrawalRepo.findOne.mockResolvedValueOnce(stale);
        rows.set(Withdrawal, stale);
        fetchMock
          .mockResolvedValueOnce(
            paystackReply(
              { status: false, message: 'Transfer not found' },
              404,
            ),
          )
          .mockResolvedValueOnce(
            paystackReply({ status: true, data: { status: 'pending' } }),
          );

        await service.createWithdrawal({ user_id: 'doctor-1', amount: 5000 });

        expect(stale.status).toBe(WithdrawalStatus.FAILED);
        expect(fetchMock.mock.calls[0][0]).toBe(
          'https://api.paystack.co/transfer/verify/wd-ref-1',
        );
        // 20000 + 5000 released - 5000 held for the new withdrawal
        expect(wallet.balance).toBe(20000);
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('subscriptions', () => {
    const unwrap = (payload: any) => payload?.data ?? payload;
    let fetchMock: jest.SpyInstance;

    beforeEach(() => {
      fetchMock = jest.spyOn(global, 'fetch');
      (profileClient.send as jest.Mock).mockReturnValue(of({ id: 'sub-1' }));
    });

    const subscriptionTx = (overrides: Partial<Transaction> = {}) =>
      makeTransaction({
        id: 'tx-sub',
        user_id: 'patient-1',
        source_type: TransactionSourceType.SUBSCRIPTION,
        source_id: 'sub-1',
        provider_id: undefined,
        amount: 2500,
        payment_status: PaymentStatus.PENDING,
        gateway_reference: 'ref-sub',
        ...overrides,
      });

    const authorization = {
      authorization_code: 'AUTH_abc',
      reusable: true,
      last4: '4081',
    };

    describe('charge.success webhook for a subscription', () => {
      it('activates the plan in the profile service and marks the transaction paid', async () => {
        const tx = subscriptionTx();
        transactionRepo.findOne.mockResolvedValue(tx);
        fetchMock.mockResolvedValue(
          paystackReply({
            status: true,
            data: {
              status: 'success',
              reference: 'ref-sub',
              amount: 250000,
              currency: 'NGN',
              metadata: {
                user_id: 'patient-1',
                source_type: 'subscription',
                source_id: 'sub-1',
              },
              authorization,
              customer: { email: 'p@test.com' },
            },
          }),
        );

        await service.handleWebhook({
          event: 'charge.success',
          data: { reference: 'ref-sub' },
        });

        const activate = (profileClient.send as jest.Mock).mock.calls.find(
          ([pattern]) => pattern === SubscriptionPatterns.ACTIVATE,
        );
        expect(activate).toBeDefined();
        expect(unwrap(activate![1])).toEqual({
          subscriptionId: 'sub-1',
          reference: 'ref-sub',
          amount: 2500,
          currency: 'NGN',
          customerEmail: 'p@test.com',
          authorization,
        });
        expect(transactionRepo.update).toHaveBeenCalledWith('tx-sub', {
          payment_status: PaymentStatus.PAID,
        });
        // Subscription payments get their own notification from the profile service.
        expect(client.emit).not.toHaveBeenCalledWith(
          NotificationEvents.PAYMENT_SUCCESS,
          expect.anything(),
        );
      });

      it('still emits the generic payment notification for non-subscription sources', async () => {
        const tx = makeTransaction({
          source_type: TransactionSourceType.APPOINTMENT,
        });
        transactionRepo.findOne.mockResolvedValue(tx);
        fetchMock.mockResolvedValue(
          paystackReply({
            status: true,
            data: {
              status: 'success',
              reference: 'ref-123',
              amount: 1000000,
              currency: 'NGN',
              metadata: {},
            },
          }),
        );

        await service.handleWebhook({
          event: 'charge.success',
          data: { reference: 'ref-123' },
        });

        expect(profileClient.send).not.toHaveBeenCalled();
        expect(client.emit).toHaveBeenCalledWith(
          NotificationEvents.PAYMENT_SUCCESS,
          expect.anything(),
        );
      });
    });

    describe('chargeAuthorization', () => {
      const dto = {
        user_id: 'patient-1',
        email: 'p@test.com',
        amount: 2500,
        currency: 'NGN',
        authorization_code: 'AUTH_abc',
        reference: 'sub_1_20261115_a1',
        source_id: 'sub-1',
      };

      it('creates a pending transaction, charges the card and marks it paid', async () => {
        transactionRepo.findOne.mockResolvedValue(null);
        fetchMock.mockResolvedValue(
          paystackReply({
            status: true,
            data: {
              status: 'success',
              reference: dto.reference,
              gateway_response: 'Approved',
              authorization,
            },
          }),
        );

        const result = await service.chargeAuthorization(dto);

        expect(transactionRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            source_type: TransactionSourceType.SUBSCRIPTION,
            source_id: 'sub-1',
            amount: 2500,
            payment_status: PaymentStatus.PENDING,
            gateway_reference: dto.reference,
          }),
        );
        expect(fetchMock).toHaveBeenCalledWith(
          'https://api.paystack.co/transaction/charge_authorization',
          expect.objectContaining({ method: 'POST' }),
        );
        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body).toMatchObject({
          email: 'p@test.com',
          amount: 250000,
          authorization_code: 'AUTH_abc',
          reference: dto.reference,
        });
        expect(transactionRepo.update).toHaveBeenCalledWith('tx-new', {
          payment_status: PaymentStatus.PAID,
        });
        expect(result).toEqual({
          success: true,
          reference: dto.reference,
          status: 'success',
          gatewayResponse: 'Approved',
          authorization,
        });
      });

      it('returns success:false when Paystack declines the card', async () => {
        transactionRepo.findOne.mockResolvedValue(null);
        fetchMock.mockResolvedValue(
          paystackReply({ status: false, message: 'Insufficient Funds' }, 400),
        );

        const result = await service.chargeAuthorization(dto);

        expect(result).toMatchObject({
          success: false,
          status: 'failed',
          gatewayResponse: 'Insufficient Funds',
        });
        expect(transactionRepo.update).toHaveBeenCalledWith('tx-new', {
          payment_status: PaymentStatus.FAILED,
        });
      });

      it('returns success:false when the charge comes back failed', async () => {
        transactionRepo.findOne.mockResolvedValue(null);
        fetchMock.mockResolvedValue(
          paystackReply({
            status: true,
            data: { status: 'failed', gateway_response: 'Declined' },
          }),
        );
        const result = await service.chargeAuthorization(dto);
        expect(result).toMatchObject({
          success: false,
          status: 'failed',
          gatewayResponse: 'Declined',
        });
      });

      it('throws and keeps the transaction pending when the outcome is unknown', async () => {
        transactionRepo.findOne.mockResolvedValue(null);
        fetchMock.mockResolvedValue(
          paystackReply({ status: false, message: 'gateway timeout' }, 503),
        );

        await expect(service.chargeAuthorization(dto)).rejects.toBeInstanceOf(
          RpcException,
        );
        expect(transactionRepo.update).not.toHaveBeenCalled();
      });

      it('is idempotent: a paid reference is not charged again', async () => {
        transactionRepo.findOne.mockResolvedValue(
          subscriptionTx({ payment_status: PaymentStatus.PAID }),
        );
        const result = await service.chargeAuthorization(dto);
        expect(result).toEqual({
          success: true,
          reference: dto.reference,
          status: 'success',
        });
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it('verifies instead of re-charging a reference that is still pending', async () => {
        transactionRepo.findOne.mockResolvedValue(
          subscriptionTx({ payment_status: PaymentStatus.PENDING }),
        );
        fetchMock.mockResolvedValue(
          paystackReply({
            status: true,
            data: { status: 'success', gateway_response: 'Approved' },
          }),
        );

        const result = await service.chargeAuthorization(dto);

        expect(fetchMock).toHaveBeenCalledWith(
          `https://api.paystack.co/transaction/verify/${dto.reference}`,
          expect.not.objectContaining({ method: 'POST' }),
        );
        expect(transactionRepo.save).not.toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });
  });
});
