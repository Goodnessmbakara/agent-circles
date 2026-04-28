# NGN Ramp Integration — Implementation Overview

This document explains the technical architecture and user flow for the Nigerian Naira (NGN) ↔ USDC on-ramp/off-ramp integration using **Partna**.

## 🏗️ Architecture

The integration follows a **Hybrid Asynchronous Flow**. Since bank transfers are not instant and the final pool action requires a user signature (non-custodial), the system is split into three layers:

### 1. Backend (The Orchestrator)
- **Partna Service**: (`backend/src/ramp/partna.service.ts`) A wrapper around Partna's REST API. It handles order creation and status retrieval.
- **Ramp Store**: (`backend/src/store/ramp-store.ts`) A file-based persistence layer (`data/ramp_orders.json`) that tracks pending orders, user IDs, and payment status.
- **Webhook Handler**: (`backend/src/ramp/partna.webhook.ts`) A secure endpoint that listens for `onramp.completed` events from Partna. It uses **SHA-256 HMAC** to verify that requests actually come from Partna.

### 2. Frontend (The UI Orchestrator)
- **API Wrapper**: (`frontend/src/lib/api.ts`) Updated to support the new ramp endpoints.
- **RampModal**: (`frontend/src/components/ramp/RampModal.tsx`) The core UI component that manages the multi-step state machine (Method Selection → Bank Details → Polling → Confirmation).
- **Payment Details**: (`frontend/src/components/ramp/OnRampPaymentDetails.tsx`) A premium component displaying account numbers, bank names, and a countdown timer.

### 3. Smart Contract (The Trust Layer)
- The integration ensures that the user **still signs** the final `join` or `contribute` transaction. This maintains the non-custodial nature of the app; the backend never touches the user's secret keys.

---

## 🔄 User Flow (On-Ramp)

1. **Initiation**: User clicks "Contribute Naira" or "Join with Naira" in the UI.
2. **Order Creation**: Frontend calls `/api/ramp/onramp`. Backend requests a virtual bank account from Partna and saves the pending order to the `RampStore`.
3. **Payment**: User sees the bank details and transfers NGN via their bank app.
4. **Detection**:
   - **Webhook (Push)**: Partna hits `/api/webhooks/partna`. Backend verifies the signature and marks the order as `completed` in the `RampStore`.
   - **Polling (Pull)**: The `RampModal` polls `/api/ramp/order/:id` every 5 seconds.
5. **Finalization**: Once status is `completed`, the UI reveals a "Sign & Complete" button. User signs the Stellar transaction to move the received USDC into the pool contract.

---

## 🔒 Security & Robustness

- **Signature Verification**: Every webhook request is validated against `PARTNA_WEBHOOK_SECRET` using a timing-safe equality check.
- **Persistence**: Orders are saved to disk, so even if the server restarts during a 30-minute bank transfer window, the payment will still be processed correctly when it arrives.
- **Error Handling**: The `RampModal` handles timeouts, expired orders, and Partna API failures with user-friendly error messages.

---

## 🚀 Testing Guide

### 1. Sandbox Setup
Ensure your `backend/.env` has the following:
```env
PARTNA_BASE_URL=https://api-sandbox.getpartna.com
PARTNA_API_KEY=your_sandbox_key
PARTNA_WEBHOOK_SECRET=your_webhook_secret
```

### 2. Manual Test Flow
1. Open a Pool Detail page.
2. Click **Contribute Naira**.
3. Copy the virtual bank details.
4. **Simulate Payment**: In the Partna Sandbox Dashboard, find the order and click "Simulate Success".
5. Observe the UI: The loading state should automatically transition to "Funds Received!"
6. Click **Sign & Complete** to finish the on-chain contribution.

---

## 📈 Future Improvements
- **Off-Ramp UI**: Add a "Withdraw to Bank" button for pool payouts.
- **Push Notifications**: Use WebSockets or Push APIs to notify the user immediately when funds arrive, even if they've closed the tab.
- **Live Rates**: Fetch real-time NGN/USDC rates from Partna instead of using a hardcoded estimate.
