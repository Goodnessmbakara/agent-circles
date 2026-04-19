import { useState } from "react";
import { useParams, Link } from "react-router";
import { usePool } from "../hooks/use-pools";
import { useWalletStore } from "../stores/wallet-store";
import { useSubmitTx } from "../hooks/use-tx";
import { api } from "../lib/api";
import { MemberList } from "../components/pool/MemberList";
import { RoundCountdown } from "../components/pool/RoundCountdown";
import { formatUsdc, stateLabel, cn } from "../lib/utils";
import { explorerTxUrl } from "../lib/stellar";
import type { Pool } from "../lib/api";

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

export function PoolDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: pool, isLoading } = usePool(id!);
  const { address } = useWalletStore();
  const submitTx = useSubmitTx();
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="py-10 mx-auto max-w-6xl px-5">
        <div className="card p-8 animate-pulse space-y-4">
          <div className="h-6 bg-white/[0.06] rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-white/[0.06] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="py-10 mx-auto max-w-6xl px-5">
        <div className="card border-red-500/20 p-8 text-center">
          <p className="text-red-400">Pool not found</p>
          <Link to="/pools" className="btn-secondary text-sm mt-4 inline-flex">
            Back to Pools
          </Link>
        </div>
      </div>
    );
  }

  async function handleContribute() {
    if (!address || !id) return;
    setTxStatus("Building transaction...");
    setTxHash(null);
    try {
      const result = await api.buildContribute(id, address);
      setTxStatus("Waiting for signature...");
      const txResult = await submitTx.mutateAsync(result.unsignedXdr);
      if (txResult.status === "SUCCESS") {
        setTxStatus("Contribution confirmed!");
        setTxHash(txResult.hash);
      } else {
        setTxStatus(`Failed: ${txResult.error ?? txResult.status}`);
      }
    } catch (err: unknown) {
      setTxStatus(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  const isMember = pool.members.some((m) => m.member === address);
  const isActive = pool.state === "Active";
  const isSetup = pool.state === "Setup";

  return (
    <div className="py-10">
      <div className="mx-auto max-w-6xl px-5 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link
                to="/pools"
                className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm flex items-center gap-1"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Pools
              </Link>
              <span className="text-zinc-700">/</span>
              <span className="font-mono text-sm text-zinc-400">
                {pool.contract_id.slice(0, 8)}…{pool.contract_id.slice(-6)}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-zinc-50">
                {pool.name?.trim() ? pool.name.trim() : "Circle"}
              </h1>
              <StatePill state={pool.state} />
            </div>
            <p className="text-xs text-zinc-500">
              Server automation:{" "}
              <span className="text-zinc-400">
                {pool.keeper_enabled ? "on — keeper may advance rounds when rules allow" : "off"}
              </span>
            </p>
          </div>

          {isActive && pool.start_time && (
            <RoundCountdown
              startTime={pool.start_time}
              roundPeriod={pool.round_period}
              currentRound={pool.current_round}
            />
          )}
        </div>

        {/* Stat tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="stat-tile">
            <p className="stat-label">Contribution</p>
            <p className="stat-value">{formatUsdc(pool.contribution)}</p>
            <p className="stat-sub">USDC per round</p>
          </div>
          <div className="stat-tile">
            <p className="stat-label">Round</p>
            <p className="stat-value">{pool.current_round + 1}</p>
            <p className="stat-sub">of {pool.max_members}</p>
          </div>
          <div className="stat-tile">
            <p className="stat-label">Members</p>
            <p className="stat-value">{pool.members.length}</p>
            <p className="stat-sub">of {pool.max_members} slots</p>
          </div>
          <div className="stat-tile">
            <p className="stat-label">Manager Fee</p>
            <p className="stat-value">{(pool.fee_bps / 100).toFixed(1)}%</p>
            <p className="stat-sub">per round</p>
          </div>
        </div>

        {/* Member list */}
        <MemberList members={pool.members} currentRound={pool.current_round} />

        {/* Contribute panel */}
        {isActive && isMember && (
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold text-zinc-100 mb-1">Contribute to Round {pool.current_round + 1}</h2>
                <p className="text-sm text-zinc-500">
                  Send {formatUsdc(pool.contribution)} USDC to the circle for this round.
                </p>
              </div>
              <div className="amount-sm text-zinc-200">{formatUsdc(pool.contribution)} USDC</div>
            </div>

            <button
              onClick={handleContribute}
              disabled={submitTx.isPending}
              className="btn-primary"
            >
              {submitTx.isPending ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
                    <path d="M7 1.5C4 1.5 1.5 4 1.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Signing…
                </>
              ) : (
                "Contribute"
              )}
            </button>

            {txStatus && (
              <div className={cn(
                "mt-3 text-sm flex items-center gap-2",
                txStatus.startsWith("Error") || txStatus.startsWith("Failed")
                  ? "text-red-400"
                  : txStatus === "Contribution confirmed!"
                  ? "text-emerald-400"
                  : "text-zinc-400"
              )}>
                {txStatus}
              </div>
            )}
            {txHash && (
              <a
                href={explorerTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1"
              >
                View on Stellar Expert
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 8L8 2M4 2H8V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            )}
          </div>
        )}

        {/* Join CTA */}
        {isSetup && !isMember && address && (
          <div className="card p-6 flex items-center justify-between">
            <div>
              <p className="text-zinc-100 font-medium">Spots available</p>
              <p className="text-sm text-zinc-500 mt-0.5">
                {pool.max_members - pool.members.length} of {pool.max_members} slots remaining
              </p>
            </div>
            <Link to={`/pools/${pool.contract_id}/join`} className="btn-primary">
              Join Circle
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
