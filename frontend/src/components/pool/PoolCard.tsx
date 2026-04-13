import { Link } from "react-router";
import type { Pool } from "../../lib/api";
import { formatUsdc, stateLabel, stateColor, cn } from "../../lib/utils";

interface PoolCardProps {
  pool: Pool;
}

export function PoolCard({ pool }: PoolCardProps) {
  return (
    <Link
      to={`/pools/${pool.contract_id}`}
      className="block border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-sm text-gray-500">
          {pool.contract_id.slice(0, 8)}...
        </span>
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", stateColor(pool.state))}>
          {stateLabel(pool.state)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Contribution</span>
          <p className="font-medium">{formatUsdc(pool.contribution)} USDC</p>
        </div>
        <div>
          <span className="text-gray-500">Round</span>
          <p className="font-medium">{pool.current_round} / {pool.max_members}</p>
        </div>
        <div>
          <span className="text-gray-500">Max Members</span>
          <p className="font-medium">{pool.max_members}</p>
        </div>
        <div>
          <span className="text-gray-500">Fee</span>
          <p className="font-medium">{(pool.fee_bps / 100).toFixed(1)}%</p>
        </div>
      </div>
    </Link>
  );
}
