/**
 * In-memory reminder queue sorted by remind_at (ascending).
 *
 * Best-effort delivery: reminders are lost on server restart.
 * Sufficient for MVP; swap for Redis sorted sets in production.
 */

let nextId = 1;

export interface Reminder {
  id: number;
  contractId: string;
  member: string;
  remindAt: number; // unix seconds
  message: string;
  delivered: boolean;
}

const queue: Reminder[] = [];

export function add(
  contractId: string,
  member: string,
  remindAt: number,
  message: string,
): Reminder {
  const reminder: Reminder = {
    id: nextId++,
    contractId,
    member,
    remindAt,
    message,
    delivered: false,
  };
  // Insert in sorted order (ascending by remindAt)
  const idx = queue.findIndex((r) => r.remindAt > remindAt);
  if (idx === -1) {
    queue.push(reminder);
  } else {
    queue.splice(idx, 0, reminder);
  }
  return reminder;
}

/** Returns all undelivered reminders with remindAt <= now. */
export function getDue(nowSeconds: number): Reminder[] {
  return queue.filter((r) => !r.delivered && r.remindAt <= nowSeconds);
}

export function markDelivered(id: number): void {
  const r = queue.find((r) => r.id === id);
  if (r) r.delivered = true;
}

/** For testing: reset all state. */
export function _reset(): void {
  queue.length = 0;
  nextId = 1;
}
