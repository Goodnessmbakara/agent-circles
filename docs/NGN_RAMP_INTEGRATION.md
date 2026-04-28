# NGN On-Ramp & Off-Ramp Integration Guide
## Agent Circles — Partna API

> **Provider:** [Partna](https://getpartna.com) | **Docs:** [docs.getpartna.com](https://docs.getpartna.com)
> **Status:** Application submitted — awaiting API credentials
> **Last updated:** April 2026

---

## Overview

Agent Circles uses **Partna** as its NGN ↔ USDC fiat gateway. Partna allows Nigerian users to:

- **On-ramp**: Pay NGN via bank transfer → receive USDC in their Stellar wallet (funding a pool contribution)
- **Off-ramp**: Send USDC from their Stellar wallet → receive NGN in their Nigerian bank account (receiving a pool payout)

Partna handles all compliance, KYC/AML, and FX conversion. Agent Circles only needs to trigger API calls at the right moments in the pool lifecycle.

---

## Architecture

```
                        AGENT CIRCLES FLOW
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  USER JOINS POOL                    USER RECEIVES PAYOUT        │
│       │                                      │                  │
│       ▼                                      ▼                  │
│  [ ON-RAMP ]                         [ OFF-RAMP ]               │
│  NGN → USDC                          USDC → NGN                 │
│       │                                      │                  │
│       ▼                                      ▼                  │
│  Partna API                          Partna API                 │
│  generates virtual                   receives USDC,             │
│  bank account                        sends NGN to               │
│  for user                            user's bank                │
│       │                                      │                  │
│       ▼                                      ▼                  │
│  User pays NGN                       Stellar smart              │
│  via bank transfer                   contract releases          │
│       │                                      USDC               │
│       ▼                                      │                  │
│  Webhook fires →                     Webhook fires →            │
│  USDC credited to                    Partna confirms            │
│  user's pool wallet                  NGN sent                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Environment Setup

### Environment Variables

Add these to both `.env` (dev) and production secrets:

```env
# Partna API
PARTNA_API_KEY=your_api_key_here
PARTNA_API_SECRET=your_api_secret_here
PARTNA_WEBHOOK_SECRET=your_webhook_secret_here

# Use sandbox for dev, production for live
PARTNA_BASE_URL=https://api-sandbox.getpartna.com   # dev
# PARTNA_BASE_URL=https://api.getpartna.com         # production
```

### Base URLs
| Environment | Base URL |
|---|---|
| Sandbox | `https://api-sandbox.getpartna.com` |
| Production | `https://api.getpartna.com` |

---

## Authentication

All requests require your API key in the header:

```typescript
const headers = {
  'Authorization': `Bearer ${process.env.PARTNA_API_KEY}`,
  'Content-Type': 'application/json',
};
```

---

## On-Ramp: NGN → USDC

### When to trigger
- User clicks "Fund Pool" / "Make Contribution"
- User is joining a pool for the first time
- User needs to top up their wallet balance

### Flow

```
1. Backend calls Partna → creates an on-ramp order
2. Partna returns a virtual bank account (account number + bank name)
3. Frontend shows bank details to user
4. User makes NGN bank transfer from their bank app
5. Partna detects payment → fires webhook to your backend
6. Backend verifies webhook → credits user's Stellar wallet with USDC
7. Pool contribution is executed on Stellar
```

### API Call — Create On-Ramp Order

```typescript
// backend/src/ramp/partna.service.ts

interface OnRampOrder {
  amount: number;         // Amount in NGN
  currency: 'NGN';
  cryptoCurrency: 'USDC';
  network: 'stellar';
  walletAddress: string;  // User's Stellar wallet address
  reference: string;      // Your internal tx reference (e.g., pool-{poolId}-user-{userId})
  redirectUrl?: string;   // Optional: redirect after payment
}

interface OnRampResponse {
  orderId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  currency: string;
  expiresAt: string;
  reference: string;
}

export async function createOnRampOrder(
  order: OnRampOrder
): Promise<OnRampResponse> {
  const response = await fetch(`${process.env.PARTNA_BASE_URL}/onramp`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PARTNA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(order),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Partna on-ramp failed: ${error.message}`);
  }

  return response.json();
}
```

### Usage in Pool Contribution Flow

```typescript
// When user initiates a pool contribution
async function initiatePoolContribution(
  poolId: string,
  userId: string,
  amountNGN: number,
  stellarWalletAddress: string
) {
  const order = await createOnRampOrder({
    amount: amountNGN,
    currency: 'NGN',
    cryptoCurrency: 'USDC',
    network: 'stellar',
    walletAddress: stellarWalletAddress,
    reference: `pool-${poolId}-user-${userId}-${Date.now()}`,
  });

  // Store the order reference in your DB
  await db.pendingContributions.create({
    orderId: order.orderId,
    poolId,
    userId,
    amountNGN,
    status: 'awaiting_payment',
    bankName: order.bankName,
    accountNumber: order.accountNumber,
    expiresAt: order.expiresAt,
  });

  // Return bank details to show user in the UI
  return {
    bankName: order.bankName,
    accountNumber: order.accountNumber,
    accountName: order.accountName,
    amount: amountNGN,
    expiresAt: order.expiresAt,
  };
}
```

### Frontend — Show Bank Details to User

```tsx
// frontend/src/components/ramp/OnRampPaymentDetails.tsx

interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  expiresAt: string;
}

export function OnRampPaymentDetails({ details }: { details: BankDetails }) {
  const [copied, setCopied] = useState(false);

  const copyAccountNumber = () => {
    navigator.clipboard.writeText(details.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="payment-details-card">
      <h3>Transfer NGN to complete your contribution</h3>
      <p className="expires">
        Expires: {new Date(details.expiresAt).toLocaleTimeString()}
      </p>

      <div className="bank-detail">
        <span className="label">Bank</span>
        <span className="value">{details.bankName}</span>
      </div>

      <div className="bank-detail">
        <span className="label">Account Number</span>
        <span className="value">{details.accountNumber}</span>
        <button onClick={copyAccountNumber}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <div className="bank-detail">
        <span className="label">Account Name</span>
        <span className="value">{details.accountName}</span>
      </div>

      <div className="bank-detail amount">
        <span className="label">Amount</span>
        <span className="value">₦{details.amount.toLocaleString()}</span>
      </div>

      <p className="instruction">
        Transfer exactly this amount from your bank app. 
        Your USDC will be credited automatically once confirmed.
      </p>
    </div>
  );
}
```

---

## Off-Ramp: USDC → NGN

### When to trigger
- It is a user's turn to receive the pool payout
- User manually withdraws their balance
- Pool is dissolved and funds are returned

### Flow

```
1. Stellar smart contract releases USDC to user's wallet
2. Backend detects the on-chain event
3. Backend calls Partna → creates an off-ramp order
4. Partna receives USDC, converts to NGN
5. Partna sends NGN to user's registered bank account
6. Webhook fires → backend marks payout as complete
```

### API Call — Create Off-Ramp Order

```typescript
// backend/src/ramp/partna.service.ts

interface OffRampOrder {
  amount: number;         // Amount in USDC
  cryptoCurrency: 'USDC';
  network: 'stellar';
  currency: 'NGN';
  bankCode: string;       // Nigerian bank code (e.g., "044" for Access Bank)
  accountNumber: string;  // User's bank account number
  accountName: string;    // User's bank account name
  reference: string;      // Your internal reference
}

interface OffRampResponse {
  orderId: string;
  depositAddress: string; // Stellar address to send USDC to
  memo?: string;          // Stellar memo (IMPORTANT — include this)
  amountUSDC: number;
  estimatedNGN: number;
  fxRate: number;
  reference: string;
}

export async function createOffRampOrder(
  order: OffRampOrder
): Promise<OffRampResponse> {
  const response = await fetch(`${process.env.PARTNA_BASE_URL}/offramp`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PARTNA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(order),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Partna off-ramp failed: ${error.message}`);
  }

  return response.json();
}
```

### Usage in Pool Payout Flow

```typescript
// When the Stellar contract releases a payout
async function executePoolPayout(
  poolId: string,
  userId: string,
  amountUSDC: number,
  userBankDetails: {
    bankCode: string;
    accountNumber: string;
    accountName: string;
  }
) {
  // 1. Create the off-ramp order with Partna
  const order = await createOffRampOrder({
    amount: amountUSDC,
    cryptoCurrency: 'USDC',
    network: 'stellar',
    currency: 'NGN',
    bankCode: userBankDetails.bankCode,
    accountNumber: userBankDetails.accountNumber,
    accountName: userBankDetails.accountName,
    reference: `payout-${poolId}-user-${userId}-${Date.now()}`,
  });

  // 2. Send USDC from pool wallet to Partna's deposit address
  //    Include the memo — this is how Partna identifies your payment
  await stellarTxBuilder.sendUSDC({
    destination: order.depositAddress,
    amount: amountUSDC.toString(),
    memo: order.memo, // CRITICAL — never omit this
  });

  // 3. Store pending payout in DB
  await db.payouts.create({
    orderId: order.orderId,
    poolId,
    userId,
    amountUSDC,
    estimatedNGN: order.estimatedNGN,
    status: 'processing',
    reference: order.reference,
  });

  return order;
}
```

---

## Webhook Handler

Partna fires webhooks for both on-ramp and off-ramp events. This is how you know a payment was completed.

### Webhook Events

| Event | Description |
|---|---|
| `onramp.payment.received` | User's NGN bank transfer was received |
| `onramp.completed` | USDC has been sent to user's wallet |
| `onramp.failed` | On-ramp failed (e.g., wrong amount, expired) |
| `offramp.processing` | Partna received USDC, converting to NGN |
| `offramp.completed` | NGN has been sent to user's bank account |
| `offramp.failed` | Off-ramp failed |

### Webhook Handler Implementation

```typescript
// backend/src/ramp/partna.webhook.ts
import crypto from 'crypto';
import { Request, Response } from 'express';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}

export async function handlePartnaWebhook(req: Request, res: Response) {
  const signature = req.headers['x-partna-signature'] as string;
  const rawBody = JSON.stringify(req.body);

  // 1. Verify signature
  if (!verifyWebhookSignature(rawBody, signature, process.env.PARTNA_WEBHOOK_SECRET!)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, data } = req.body;

  try {
    switch (event) {
      case 'onramp.completed': {
        // NGN received, USDC sent to user's Stellar wallet
        const contribution = await db.pendingContributions.findOne({
          orderId: data.orderId
        });

        if (!contribution) break;

        await db.pendingContributions.update(
          { orderId: data.orderId },
          { status: 'completed', completedAt: new Date() }
        );

        // Trigger the pool contribution on Stellar
        await poolService.confirmContribution(
          contribution.poolId,
          contribution.userId,
          data.cryptoAmount
        );

        break;
      }

      case 'onramp.failed': {
        await db.pendingContributions.update(
          { orderId: data.orderId },
          { status: 'failed', failureReason: data.reason }
        );
        // Notify user
        await notificationService.send(data.userId, {
          type: 'payment_failed',
          message: 'Your NGN deposit could not be processed. Please try again.',
        });
        break;
      }

      case 'offramp.completed': {
        // NGN successfully sent to user's bank account
        await db.payouts.update(
          { orderId: data.orderId },
          { status: 'completed', completedAt: new Date() }
        );

        // Notify user
        await notificationService.send(data.reference, {
          type: 'payout_sent',
          message: `₦${data.fiatAmount.toLocaleString()} has been sent to your bank account.`,
        });
        break;
      }

      case 'offramp.failed': {
        await db.payouts.update(
          { orderId: data.orderId },
          { status: 'failed', failureReason: data.reason }
        );
        // IMPORTANT: If off-ramp fails, USDC needs to be returned to user
        await rampService.handleFailedOfframp(data.orderId);
        break;
      }
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 so Partna doesn't retry endlessly
    // Log to your error tracker
    res.status(200).json({ received: true });
  }
}
```

### Register Webhook Route

```typescript
// backend/src/routes/webhooks.ts
import express from 'express';
import { handlePartnaWebhook } from '../ramp/partna.webhook';

const router = express.Router();

// IMPORTANT: Use raw body parser for webhook signature verification
router.post(
  '/webhooks/partna',
  express.raw({ type: 'application/json' }),
  handlePartnaWebhook
);

export default router;
```

---

## Get Supported Assets & Rates

### Check Supported Assets

```typescript
async function getSupportedAssets() {
  const response = await fetch(
    `${process.env.PARTNA_BASE_URL}/supported-assets`,
    { headers: { 'Authorization': `Bearer ${process.env.PARTNA_API_KEY}` } }
  );
  return response.json();
  // Look for: { chain: 'STELLAR', asset: 'USDC' }
}
```

### Get Live NGN/USDC Rate

```typescript
async function getNGNtoUSDCRate(): Promise<{ rate: number; minimum: number; maximum: number }> {
  const response = await fetch(
    `${process.env.PARTNA_BASE_URL}/rates?from=NGN&to=USDC`,
    { headers: { 'Authorization': `Bearer ${process.env.PARTNA_API_KEY}` } }
  );
  return response.json();
}

// Usage: Show user how much USDC they'll get for their NGN
const rate = await getNGNtoUSDCRate();
const usdcAmount = ngnAmount / rate.rate;
```

---

## Nigerian Bank Codes Reference

Needed for off-ramp (bank account validation):

| Bank | Code |
|---|---|
| Access Bank | 044 |
| First Bank | 011 |
| GTBank | 058 |
| Zenith Bank | 057 |
| UBA | 033 |
| Fidelity Bank | 070 |
| FCMB | 214 |
| Stanbic IBTC | 221 |
| Sterling Bank | 232 |
| Union Bank | 032 |
| Wema Bank | 035 |
| Ecobank | 050 |
| Opay | 100004 |
| Palmpay | 100033 |
| Kuda | 50211 |
| Moniepoint | 50515 |

> For a full list, use the Partna `/banks` endpoint to fetch dynamically.

---

## UI/UX Flows

### On-Ramp UI States

```
IDLE → FETCHING_ACCOUNT → SHOWING_BANK_DETAILS → AWAITING_PAYMENT → CONFIRMED → ERROR
```

| State | What to show |
|---|---|
| `FETCHING_ACCOUNT` | Loading spinner: "Generating your payment details..." |
| `SHOWING_BANK_DETAILS` | Bank name, account number (copyable), amount, timer |
| `AWAITING_PAYMENT` | Pulsing indicator: "Waiting for your transfer..." |
| `CONFIRMED` | ✅ "Payment received! Your contribution is being processed." |
| `ERROR` | ❌ Error message + retry button |

### Off-Ramp UI States

```
IDLE → PROCESSING → SENT → ERROR
```

| State | What to show |
|---|---|
| `PROCESSING` | "Converting USDC to Naira..." |
| `SENT` | ✅ "₦X,XXX sent to your [bank name] account ending in XXXX" |
| `ERROR` | ❌ "Payout failed. Your USDC has been returned to your wallet." |

---

## Fees

| Action | Fee | Who pays |
|---|---|---|
| On-ramp (NGN → USDC) | ~1–2% | Deducted from received USDC |
| Off-ramp (USDC → NGN) | ~1–2.5% | Deducted from NGN payout |

> Always show users the **estimated amount they'll receive** (after fees) before they confirm. Fetch live rates from Partna's rates endpoint.

---

## Error Handling & Edge Cases

### Critical Edge Cases

| Scenario | Handling |
|---|---|
| On-ramp order expires | Show "Payment window expired" — allow user to generate a new one |
| User sends wrong NGN amount | Partna auto-refunds the user (handled by Partna) |
| Off-ramp fails after USDC sent | Partna should return USDC — log and monitor; notify user |
| Webhook fires twice (duplicate) | Idempotency check: `if (order.status === 'completed') return` |
| Stellar memo omitted on off-ramp | Funds may be lost — always include `memo` when sending USDC to Partna |

### Retry Strategy for Webhooks

```typescript
// If your webhook endpoint returns non-200, Partna will retry.
// Always return 200 after logging the error — handle retries internally.

// Store processed webhook IDs to prevent double-processing:
const processedWebhooks = new Set<string>();

if (processedWebhooks.has(data.webhookId)) {
  return res.status(200).json({ received: true, duplicate: true });
}
processedWebhooks.add(data.webhookId);
// (Use Redis or DB in production, not an in-memory Set)
```

---

## Testing Checklist

### Sandbox Testing
- [ ] Credentials set to sandbox URL + sandbox API keys
- [ ] Create on-ramp order → receive virtual bank account details
- [ ] Simulate NGN payment in sandbox → webhook fires → check `onramp.completed`
- [ ] Create off-ramp order → send test USDC with memo → check `offramp.completed`
- [ ] Test expired on-ramp order flow
- [ ] Test duplicate webhook idempotency
- [ ] Test off-ramp failure handling

### Production Checklist
- [ ] KYB approved by Partna
- [ ] Production API keys stored in secure secret manager (not `.env` file)
- [ ] Webhook endpoint on HTTPS with valid SSL cert
- [ ] Webhook signature verification enabled
- [ ] Monitoring & alerts on `onramp.failed` and `offramp.failed` events
- [ ] Bank account validation integrated before submitting off-ramp
- [ ] Rate display shown to user before confirming (transparency)

---

## Resources

| Resource | Link |
|---|---|
| Partna API Docs | https://docs.getpartna.com |
| Partna On-Ramp Guide | https://docs.getpartna.com/onramp |
| Partna Off-Ramp Guide | https://docs.getpartna.com/offramp |
| Partna Authentication | https://docs.getpartna.com/authentication |
| Partna Webhooks | https://docs.getpartna.com/webhooks |
| Sandbox Dashboard | https://dashboard-sandbox.getpartna.com |
| Production Dashboard | https://dashboard.getpartna.com |
| Support | support@getpartna.com |
