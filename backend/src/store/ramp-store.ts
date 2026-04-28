import * as fs from "fs";
import * as path from "path";

/**
 * File-backed store for Partna on-ramp and off-ramp orders.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const RAMP_FILE = path.join(DATA_DIR, "ramp_orders.json");

export type RampStatus = 'awaiting_payment' | 'processing' | 'completed' | 'failed';

export interface RampOrder {
  orderId: string;
  type: 'onramp' | 'offramp';
  poolId: string;
  userId: string;
  amountFiat: number;
  currencyFiat: string;
  amountCrypto: number;
  currencyCrypto: string;
  status: RampStatus;
  reference: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  expiresAt?: string;
  failureReason?: string;
  completedAt?: string;
  createdAt: string;
}

function loadFromDisk(): Record<string, RampOrder> {
  try {
    if (!fs.existsSync(RAMP_FILE)) return {};
    const raw = fs.readFileSync(RAMP_FILE, "utf-8");
    return JSON.parse(raw) as Record<string, RampOrder>;
  } catch {
    return {};
  }
}

function saveToDisk(orders: Record<string, RampOrder>): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    RAMP_FILE,
    JSON.stringify(orders, null, 2),
    "utf-8",
  );
}

const orders: Record<string, RampOrder> = loadFromDisk();

export function saveOrder(order: RampOrder): void {
  orders[order.orderId] = order;
  saveToDisk(orders);
}

export function getOrder(orderId: string): RampOrder | undefined {
  return orders[orderId];
}

export function updateOrderStatus(orderId: string, status: RampStatus, extra: Partial<RampOrder> = {}): void {
  if (orders[orderId]) {
    orders[orderId] = { ...orders[orderId], status, ...extra };
    if (status === 'completed') {
      orders[orderId].completedAt = new Date().toISOString();
    }
    saveToDisk(orders);
  }
}

export function listOrdersForUser(userId: string): RampOrder[] {
  return Object.values(orders).filter(o => o.userId === userId);
}
