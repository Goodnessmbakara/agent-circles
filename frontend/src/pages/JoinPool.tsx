import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { usePool } from "../hooks/use-pools";
import { useWalletStore } from "../stores/wallet-store";
import { useSubmitTx } from "../hooks/use-tx";
import { api } from "../lib/api";
import { formatUsdc } from "../lib/utils";

export function JoinPool() {
  const { id } = useParams<{ id: string }>();
  const { data: pool, isLoading } = usePool(id!);
  const { address } = useWalletStore();
  const navigate = useNavigate();
  const submitTx = useSubmitTx();
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="py-10 mx-auto max-w-6xl px-5">
        <div className="card p-8 animate-pulse max-w-lg mx-auto">
          <div className="h-5 bg-white/[0.06] rounded w-1/2 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-white/[0.06] rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="py-10 mx-auto max-w-6xl px-5">
        <div className="card border-red-500/20 p-8 text-center max-w-lg mx-auto">
          <p className="text-red-400 mb-4">Pool not found</p>
          <Link to="/pools" className="btn-secondary text-sm inline-flex">Back to Pools</Link>
        </div>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="py-10 mx-auto max-w-6xl px-5">
        <div className="card p-12 text-center max-w-sm mx-auto">
          <p className="text-zinc-300 font-medium mb-1">Wallet required</p>
          <p className="text-zinc-500 text-sm">Sign in to join this circle.</p>
        </div>
      </div>
    );
  }

  async function handleJoin() {
    if (!address || !id) return;
    setError(null);
    try {
      const result = await api.buildJoin(id, address);
      const txResult = await submitTx.mutateAsync(result.unsignedXdr);
      if (txResult.status === "SUCCESS") {
        navigate(`/pools/${id}`);
      } else {
        setError(`Transaction failed: ${txResult.error ?? txResult.status}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join pool");
    }
  }

  const totalContribute = pool.contribution * pool.max_members;
  const netReceive = totalContribute * (1 - pool.fee_bps / 10000);
  const fillPct = Math.round((pool.members.length / pool.max_members) * 100);

  return (
    <div className="py-10">
      <div className="mx-auto max-w-6xl px-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link to="/pools" className="text-zinc-500 hover:text-zinc-300 transition-colors">Pools</Link>
          <span className="text-zinc-700">/</span>
          <Link
            to={`/pools/${pool.contract_id}`}
            className="text-zinc-500 hover:text-zinc-300 transition-colors font-mono"
          >
            {pool.contract_id.slice(0, 8)}…
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-400">Join</span>
        </div>

        <div className="grid md:grid-cols-5 gap-6 max-w-3xl">
          {/* Info card */}
          <div className="md:col-span-3">
            <div className="card p-6">
              <h1 className="text-lg font-semibold text-zinc-50 mb-1">Join Circle</h1>
              <p className="text-sm text-zinc-500 mb-6">
                Review the terms before confirming your spot.
              </p>

              <div className="space-y-3 mb-6">
                {[
                  ["Contribution per round", `${formatUsdc(pool.contribution)} USDC`],
                  ["Max members", String(pool.max_members)],
                  ["Current members", String(pool.members.length)],
                  ["Manager fee", `${(pool.fee_bps / 100).toFixed(1)}%`],
                  ["You'll contribute in total", `${formatUsdc(totalContribute)} USDC`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-zinc-500">{label}</span>
                    <span className="text-zinc-200 tabular-nums font-medium">{value}</span>
                  </div>
                ))}
                <div className="divider !my-1" />
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400 font-medium">You'll receive (net)</span>
                  <span className="text-emerald-400 tabular-nums font-semibold">
                    {formatUsdc(netReceive)} USDC
                  </span>
                </div>
              </div>

              {/* Member fill */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                  <span>Available spots</span>
                  <span>{pool.members.length} / {pool.max_members} filled</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-cta transition-all duration-500"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-4 py-3 text-xs text-amber-400/80 leading-relaxed mb-5">
                By joining you commit to contributing {formatUsdc(pool.contribution)} USDC each round for{" "}
                {pool.max_members} rounds. Your payout position is assigned at join time.
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleJoin}
                  disabled={submitTx.isPending}
                  className="btn-primary flex-1"
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
                    "Confirm and Join"
                  )}
                </button>
                <Link to={`/pools/${pool.contract_id}`} className="btn-secondary">
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
