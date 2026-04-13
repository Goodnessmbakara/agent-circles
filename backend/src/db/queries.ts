import { getDb } from "./schema.js";

export interface PoolRow {
  contract_id: string;
  admin: string;
  token: string;
  contribution: number;
  round_period: number;
  start_time: number | null;
  max_members: number;
  manager: string;
  fee_bps: number;
  state: string;
  current_round: number;
  updated_at: number;
}

export interface PoolMemberRow {
  contract_id: string;
  member: string;
  position: number;
}

export interface ReminderRow {
  id: number;
  contract_id: string;
  member: string;
  remind_at: number;
  message: string;
  delivered: number;
}

export function upsertPool(pool: PoolRow): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO pools (contract_id, admin, token, contribution, round_period, start_time,
                       max_members, manager, fee_bps, state, current_round, updated_at)
    VALUES (@contract_id, @admin, @token, @contribution, @round_period, @start_time,
            @max_members, @manager, @fee_bps, @state, @current_round, @updated_at)
    ON CONFLICT(contract_id) DO UPDATE SET
      state         = @state,
      current_round = @current_round,
      start_time    = @start_time,
      updated_at    = @updated_at
  `).run(pool);
}

export function getPool(contractId: string): PoolRow | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM pools WHERE contract_id = ?").get(contractId) as PoolRow | undefined;
}

export function listPools(): PoolRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM pools ORDER BY updated_at DESC").all() as PoolRow[];
}

export function upsertPoolMember(contractId: string, member: string, position: number): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO pool_members (contract_id, member, position)
    VALUES (?, ?, ?)
    ON CONFLICT(contract_id, member) DO UPDATE SET position = ?
  `).run(contractId, member, position, position);
}

export function getPoolMembers(contractId: string): PoolMemberRow[] {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM pool_members WHERE contract_id = ? ORDER BY position"
  ).all(contractId) as PoolMemberRow[];
}

export function addReminder(
  contractId: string,
  member: string,
  remindAt: number,
  message: string,
): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO reminders (contract_id, member, remind_at, message) VALUES (?, ?, ?, ?)"
  ).run(contractId, member, remindAt, message);
}

export function getDueReminders(now: number): ReminderRow[] {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM reminders WHERE delivered = 0 AND remind_at <= ?"
  ).all(now) as ReminderRow[];
}

export function markReminderDelivered(id: number): void {
  const db = getDb();
  db.prepare("UPDATE reminders SET delivered = 1 WHERE id = ?").run(id);
}

export function recordAgentFee(
  contractId: string,
  round: number,
  amount: number,
  txHash: string,
): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO agent_fees (contract_id, round, amount, tx_hash)
    VALUES (?, ?, ?, ?)
  `).run(contractId, round, amount, txHash);
}

export function getAgentFeeSummary(manager: string): { total: number; pools: number } {
  const db = getDb();
  const row = db.prepare(`
    SELECT COALESCE(SUM(af.amount), 0) as total, COUNT(DISTINCT af.contract_id) as pools
    FROM agent_fees af
    JOIN pools p ON af.contract_id = p.contract_id
    WHERE p.manager = ?
  `).get(manager) as { total: number; pools: number } | undefined;
  return row ?? { total: 0, pools: 0 };
}
