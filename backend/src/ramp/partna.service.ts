import { config } from "../config.js";
import * as rampStore from "../store/ramp-store.js";

export interface OnRampOrderRequest {
  amount: number;         // Amount in NGN
  currency: 'NGN';
  cryptoCurrency: 'USDC';
  network: 'stellar';
  walletAddress: string;  // User's Stellar wallet address
  reference: string;      // Internal reference
}

export interface OnRampResponse {
  orderId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  currency: string;
  expiresAt: string;
  reference: string;
}

export interface OffRampOrderRequest {
  amount: number;         // Amount in USDC
  cryptoCurrency: 'USDC';
  network: 'stellar';
  currency: 'NGN';
  bankCode: string;       // Nigerian bank code
  accountNumber: string;  // User's bank account number
  accountName: string;    // User's bank account name
  reference: string;      // Internal reference
}

export interface OffRampResponse {
  orderId: string;
  depositAddress: string; // Stellar address to send USDC to
  memo?: string;          // Stellar memo
  amountUSDC: number;
  estimatedNGN: number;
  fxRate: number;
  reference: string;
}

export class PartnaService {
  private static async request<T>(endpoint: string, body: any): Promise<T> {
    const response = await fetch(`${config.partnaBaseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.partnaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Partna API error: ${error.message}`);
    }

    return response.json();
  }

  static async createOnRamp(
    poolId: string,
    userId: string,
    req: OnRampOnRampOrderRequest
  ): Promise<OnRampResponse> {
    const data = await this.request<OnRampResponse>('/onramp', req);

    rampStore.saveOrder({
      orderId: data.orderId,
      type: 'onramp',
      poolId,
      userId,
      amountFiat: req.amount,
      currencyFiat: req.currency,
      amountCrypto: 0, // Will be updated when webhook fires
      currencyCrypto: req.cryptoCurrency,
      status: 'awaiting_payment',
      reference: req.reference,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      accountName: data.accountName,
      expiresAt: data.expiresAt,
      createdAt: new Date().toISOString(),
    });

    return data;
  }

  static async createOffRamp(
    poolId: string,
    userId: string,
    req: OffRampOrderRequest
  ): Promise<OffRampResponse> {
    const data = await this.request<OffRampResponse>('/offramp', req);

    rampStore.saveOrder({
      orderId: data.orderId,
      type: 'offramp',
      poolId,
      userId,
      amountFiat: data.estimatedNGN,
      currencyFiat: req.currency,
      amountCrypto: req.amount,
      currencyCrypto: req.cryptoCurrency,
      status: 'processing',
      reference: req.reference,
      createdAt: new Date().toISOString(),
    });

    return data;
  }

  static async getOrder(orderId: string) {
    return rampStore.getOrder(orderId);
  }
}

// Add a type helper since I made a typo in the param name above
type OnRampOnRampOrderRequest = OnRampOrderRequest;
