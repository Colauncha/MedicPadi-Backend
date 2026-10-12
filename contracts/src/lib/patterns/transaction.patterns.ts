export const TransactionPatterns = {
  STATUS: 'transactions.status',
  TRANSACTIONS: {
    CREATE: 'transactions.create',
    UPDATE: 'transactions.update',
    RETRIEVE: 'transactions.retrieve',
    FIND_BY_ORDER_ID: 'transactions.findByOrderId',
    FIND_ALL: 'transactions.findAll',
    DELETE: 'transactions.delete',
    VERIFY: 'transactions.verify',
    WEBHOOK: 'transactions.webhook',
    CREDIT_PROVIDER: 'transactions.creditProvider',
    REFUND: 'transactions.refund',
  },
  WALLET: {
    CREATE: 'transactions.wallet.create',
    RETRIEVE: 'transactions.wallet.retrieve',
  },
  PAYOUT: {
    LIST_BANKS: 'transactions.payout.listBanks',
    SAVE_ACCOUNT: 'transactions.payout.saveAccount',
    GET_ACCOUNT: 'transactions.payout.getAccount',
  },
  WITHDRAWAL: {
    CREATE: 'transactions.withdrawal.create',
    FIND_ALL: 'transactions.withdrawal.findAll',
  },
};