export enum TransactionSourceType {
  APPOINTMENT = 'appointment',
  DRUG_REQUISITION = 'drug_requisition',
  TEST_REQUISITION = 'test_requisition',
  SUBSCRIPTION = 'subscription',
}

export enum PaymentGateway {
  PAYSTACK = 'paystack',
  FLUTTERWAVE = 'flutterwave',
  HMO_CLAIM = 'hmo_claim',
}