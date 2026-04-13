import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

let db: Database.Database | null = null;

export function initDb(dbPath: string): Database.Database {
  mkdirSync(dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS pools (
      contract_id   TEXT PRIMARY KEY,
      admin         TEXT NOT NULL,
      token         TEXT NOT NULL,
      contribution  INTEGER NOT NULL,
      round_period  INTEGER NOT NULL,
      start_time    INTEGER,
      max_members   INTEGER NOT NULL,
      manager       TEXT NOT NULL,
      fee_bps       INTEGER NOT NULL,
      state         TEXT NOT NULL DEFAULT 'setup',
      current_round INTEGER NOT NULL DEFAULT 0,
      updated_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pool_members (
      contract_id   TEXT NOT NULL,
      member        TEXT NOT NULL,
      position      INTEGER NOT NULL,
      PRIMARY KEY (contract_id, member)
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id   TEXT NOT NULL,
      member        TEXT NOT NULL,
      remind_at     INTEGER NOT NULL,
      message       TEXT NOT NULL,
      delivered     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS agent_fees (
      contract_id   TEXT NOT NULL,
      round         INTEGER NOT NULL,
      amount        INTEGER NOT NULL,
      tx_hash       TEXT NOT NULL,
      PRIMARY KEY (contract_id, round)
    );
  `);

  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}
