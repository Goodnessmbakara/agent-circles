import { Address } from "@stellar/stellar-sdk";
import type { AgentAction } from "./actions.js";
import { getPoolInfo, getManagerFees } from "../stellar/pool-reader.js";
import { buildContractTx } from "../stellar/tx-builder.js";
import * as registry from "../store/pool-registry.js";
import * as reminders from "../store/reminder-queue.js";

export interface ToolContext {
  walletAddress?: string;
  actions: AgentAction[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeTool(name: string, input: Record<string, any>, context: ToolContext): Promise<string> {
  try {
    switch (name) {
      case "list_pools": {
        const ids = registry.listIds();
        if (ids.length === 0) {
          return JSON.stringify({ pools: [], message: "No pools are currently registered." });
        }
        return JSON.stringify({ pools: ids, count: ids.length });
      }

      case "get_pool": {
        const poolId = input.pool_id as string;
        if (!poolId) {
          return JSON.stringify({ error: "pool_id is required" });
        }
        const info = await getPoolInfo(poolId);
        // Serialize bigints to strings for JSON
        return JSON.stringify({
          contract_id: info.contract_id,
          state: info.state,
          current_round: info.current_round,
          members: info.members,
          member_count: info.members.length,
          config: {
            contribution_amount_stroops: info.config.contribution_amount.toString(),
            contribution_amount_usdc: (Number(info.config.contribution_amount) / 1_000_000).toFixed(6),
            max_members: info.config.max_members,
            round_period_seconds: info.config.round_period.toString(),
            start_time: info.config.start_time.toString(),
            manager_fee_bps: info.config.manager_fee_bps,
            manager_fee_percent: (info.config.manager_fee_bps / 100).toFixed(2) + "%",
          },
          manager_fees_stroops: info.manager_fees.toString(),
          manager_fees_usdc: (Number(info.manager_fees) / 1_000_000).toFixed(6),
        });
      }

      case "get_wallet_pools": {
        const walletAddress = input.wallet_address as string;
        if (!walletAddress) {
          return JSON.stringify({ error: "wallet_address is required" });
        }
        const ids = registry.listIds();
        const results: Array<{ pool_id: string; state?: string; error?: string }> = [];

        await Promise.allSettled(
          ids.map(async (id) => {
            try {
              const info = await getPoolInfo(id);
              if (info.members.includes(walletAddress)) {
                results.push({
                  pool_id: id,
                  state: info.state,
                });
              }
            } catch (err) {
              // Pool is unreachable; skip silently
            }
          }),
        );

        if (results.length === 0) {
          return JSON.stringify({
            wallet: walletAddress,
            pools: [],
            message: "This wallet is not a member of any known pool.",
          });
        }

        return JSON.stringify({
          wallet: walletAddress,
          pools: results,
          count: results.length,
        });
      }

      case "get_fee_summary": {
        const ids = registry.listIds();
        let total = 0n;
        let poolsWithFees = 0;

        await Promise.allSettled(
          ids.map(async (id) => {
            try {
              const fees = await getManagerFees(id);
              if (fees > 0n) {
                total += fees;
                poolsWithFees++;
              }
            } catch {
              // ignore unreachable pools
            }
          }),
        );

        return JSON.stringify({
          total_fees_stroops: total.toString(),
          total_fees_usdc: (Number(total) / 1_000_000).toFixed(6),
          pools_with_fees: poolsWithFees,
          total_pools_checked: ids.length,
        });
      }

      case "prepare_join": {
        const poolId = input.pool_id as string;
        if (!poolId) {
          return JSON.stringify({ error: "pool_id is required" });
        }
        if (!registry.has(poolId)) {
          return JSON.stringify({
            error: `Pool ${poolId} is not registered. Use list_pools for known contract IDs.`,
          });
        }
        try {
          const info = await getPoolInfo(poolId);
          const wallet = context.walletAddress;
          if (wallet && info.members.includes(wallet)) {
            return JSON.stringify({
              error: "This wallet is already a member of this pool.",
              pool_id: poolId,
            });
          }
          // join() only exists in Setup; after the pool is Active/Completed/Cancelled, simulation fails with WrongState.
          if (info.state !== "Setup") {
            return JSON.stringify({
              error: `This pool is **${info.state}**, not Setup. New members can only join while the pool is still filling (Setup). Once it becomes Active, joining is closed.`,
              pool_id: poolId,
              state: info.state,
              hint: "If the user needs access to an Active pool, they must have been added during Setup, or start a new pool.",
            });
          }
          if (info.members.length >= info.config.max_members) {
            return JSON.stringify({
              error: "This pool is already full (max members reached).",
              pool_id: poolId,
            });
          }
          if (wallet) {
            const result = await buildContractTx({
              contractId: poolId,
              method: "join",
              args: [new Address(wallet).toScVal()],
              sourceAddress: wallet,
            });
            const action: AgentAction = {
              type: "sign_join",
              pool_id: poolId,
              unsignedXdr: result.unsignedXdr,
              simulationResult: result.simulationResult,
            };
            context.actions.push(action);
            return JSON.stringify({
              ok: true,
              pool_id: poolId,
              prepared_unsigned_tx: true,
              message:
                "Join transaction is ready. The user can tap **Sign & join** below (wallet must sign).",
            });
          }
          context.actions.push({ type: "open_join", pool_id: poolId });
          return JSON.stringify({
            ok: true,
            pool_id: poolId,
            prepared_unsigned_tx: false,
            message:
              "No wallet connected. The user can open the join page below, connect a wallet, then join.",
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return JSON.stringify({ error: `Could not prepare join: ${message}` });
        }
      }

      case "schedule_reminder": {
        const { pool_id, member, remind_at_minutes, message } = input as {
          pool_id: string;
          member: string;
          remind_at_minutes: number;
          message: string;
        };

        if (!pool_id || !member || remind_at_minutes == null || !message) {
          return JSON.stringify({ error: "pool_id, member, remind_at_minutes, and message are all required" });
        }

        if (remind_at_minutes <= 0) {
          return JSON.stringify({ error: "remind_at_minutes must be a positive number" });
        }

        const remindAtSeconds = Math.floor(Date.now() / 1000) + Math.floor(remind_at_minutes * 60);
        const reminder = reminders.add(pool_id, member, remindAtSeconds, message);

        return JSON.stringify({
          scheduled: true,
          id: reminder.id,
          pool_id,
          member,
          remind_at_unix: remindAtSeconds,
          remind_in_minutes: remind_at_minutes,
          message,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ error: `Tool execution failed: ${message}` });
  }
}
