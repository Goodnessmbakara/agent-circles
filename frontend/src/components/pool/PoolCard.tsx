import { Link } from "react-router";
import type { Pool } from "../../lib/api";
import { formatUsdc, stateLabel, cn } from "../../lib/utils";

interface PoolCardProps {
  pool: Pool;
}

function StatePill({ state }: { state: Pool["state"] }) {
  const map: Record<Pool["state"], string> = {
    Setup: "badge-setup",
    Active: "badge-active",
    Completed: "badge-completed",
    Cancelled: "badge-cancelled",
  };
  return (
    <span className={cn("badge", map[state])}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {stateLabel(state)}
    </span>
  );
}

export function PoolCard({ pool }: PoolCardProps) {
  const totalPot = pool.contribution * pool.max_members;
  const fillPct = Math.round((pool.members.length / pool.max_members) * 100);

  return (
    <Link
      to={`/pools/${pool.contract_id}`}
      className="card card-hover block p-5"
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-mono text-xs text-zinc-500 mb-1">
            {pool.contract_id.slice(0, 8)}…{pool.contract_id.slice(-4)}
          </p>
          <p className="text-xl font-bold tabular-nums text-zinc-50">
            {formatUsdc(pool.contribution)}{" "}
            <span className="text-sm font-medium text-zinc-400">USDC / round</span>
          </p>
        </div>
        <StatePill state={pool.state} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-0.5">Pot size</p>
          <p className="text-sm font-semibold text-zinc-200 tabular-nums">
            {formatUsdc(totalPot)} USDC
          </p>
        </div>
        <div>
          <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-0.5">Round</p>
          <p className="text-sm font-semibold text-zinc-200 tabular-nums">
            {pool.current_round} / {pool.max_members}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-0.5">Fee</p>
          <p className="text-sm font-semibold text-zinc-200 tabular-nums">
            {(pool.fee_bps / 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Member fill bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wide">Members</span>
          <span className="text-[11px] text-zinc-400 tabular-nums">
            {pool.members.length} / {pool.max_members}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-cta transition-all duration-500"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
