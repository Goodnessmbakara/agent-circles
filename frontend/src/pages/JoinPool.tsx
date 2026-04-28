import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { usePool } from "../hooks/use-pools";
import { useWalletStore } from "../stores/wallet-store";
import { useSubmitTx } from "../hooks/use-tx";
import { api } from "../lib/api";
import { formatUsdc } from "../lib/utils";
import { RampModal } from "../components/ramp/RampModal";

export function JoinPool() {
  const { id } = useParams<{ id: string }>();
  const { data: pool, isLoading } = usePool(id!);
  const { address, isAccountActive, isFunding } = useWalletStore();
  const navigate = useNavigate();
  const submitTx = useSubmitTx();
  const [error, setError] = useState<string | null>(null);
  const [isRampOpen, setIsRampOpen] = useState(false);

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

  const isAlreadyMember = pool.members.some(m => m.member === address);

  async function handleJoin() {
    if (!address || !id) return;
    if (isAlreadyMember) {
      setError("You are already a member of this savings circle.");
      return;
    }
    setError(null);
    try {
      const result = await api.buildJoin(id, address);
      const txResult = await submitTx.mutateAsync(result.unsignedXdr);
      if (txResult.status === "SUCCESS") {
        navigate(`/pools/${id}`);
      } else {
        // Try to provide a better error message from tx results
        const detail = txResult.error ? `: ${txResult.error}` : "";
        setError(`Transaction failed${detail}. This could be due to insufficient funds or network congestion.`);
      }
    } catch (err: any) {
      console.error("Pool join failure:", err);
      const msg = err.message || String(err);
      
      if (msg.includes("HostError")) {
        setError("Smart contract error: You might already be a member or the pool is full.");
      } else if (msg.includes("404") || msg.includes("not found") || msg.includes("400")) {
        setError("Account not found on-chain. Please wait a few seconds for the network to sync.");
      } else {
        setError(msg);
      }
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

              {isFunding && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/8 px-4 py-3 mb-6">
                  <div className="flex items-center gap-3">
                    <svg className="animate-spin text-blue-400" width="16" height="16" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
                      <path d="M7 1.5C4 1.5 1.5 4 1.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <p className="text-blue-400 text-xs leading-relaxed">
                      Setting up your wallet on the Stellar network... This usually takes 5-10 seconds.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 mb-4 overflow-hidden">
                  <p className="text-red-400 text-xs leading-relaxed break-words">
                    {error}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setIsRampOpen(true)}
                  disabled={submitTx.isPending || isAlreadyMember || (isFunding || !isAccountActive)}
                  className="btn-primary flex-1"
                >
                  Join with Naira
                </button>
                <button
                  onClick={handleJoin}
                  disabled={submitTx.isPending || isAlreadyMember || (isFunding || !isAccountActive)}
                  className="btn-secondary flex-1 px-4"
                >
                  Join with USDC
                </button>
                <Link to={`/pools/${pool.contract_id}`} className="btn-secondary px-4">
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>

        <RampModal 
          isOpen={isRampOpen}
          onClose={() => setIsRampOpen(false)}
          poolId={id!}
          userId={address!}
          amountUSDC={pool.contribution / 1_000_000}
          action="join"
          onSuccess={handleJoin}
        />
      </div>
    </div>
  );
}
