export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    amount: number;
    currency: string;
    transaction_date: string;
    status: string;
    reference: string;
    domain: string;
    metadata: any;
    gateway_response: string;
    message: string;
    channel: string;
    ip_address: string;
  };
}

export interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
  meta?: { next?: string | null };
}

export interface PaystackBank {
  id: number;
  name: string;
  code: string;
  currency: string;
  type: string;
  active: boolean;
}

export interface PaystackResolvedAccount {
  account_number: string;
  account_name: string;
  bank_id: number;
}

export interface PaystackTransferRecipient {
  recipient_code: string;
  name: string;
  details: {
    account_number: string;
    account_name: string | null;
    bank_code: string;
    bank_name: string;
  };
}

export interface PaystackTransfer {
  reference: string;
  transfer_code: string;
  amount: number;
  currency: string;
  // 'otp' means the Paystack account requires OTP confirmation, which this flow does not support
  status: 'pending' | 'success' | 'failed' | 'reversed' | 'otp' | 'received';
}
