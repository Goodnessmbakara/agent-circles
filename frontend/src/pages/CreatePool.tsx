import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useWalletStore } from "../stores/wallet-store";
import { api } from "../lib/api";
import { useSubmitTx } from "../hooks/use-tx";

const PERIOD_OPTIONS = [
  { label: "1 minute (demo)", value: 60 },
  { label: "1 hour", value: 3600 },
  { label: "1 day", value: 86400 },
  { label: "1 week", value: 604800 },
];

export function CreatePool() {
  const { address } = useWalletStore();
  const navigate = useNavigate();
  const submitTx = useSubmitTx();

  const [contribution, setContribution] = useState("10");
  const [period, setPeriod] = useState(60);
  const [maxMembers, setMaxMembers] = useState(5);
  const [feeBps, setFeeBps] = useState(200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!address) {
    return (
      <div className="py-10 mx-auto max-w-6xl px-5">
        <div className="card p-12 text-center max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-brand-400">
              <rect x="2" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 6V5C7 3.34 8.34 2 10 2H12C13.66 2 15 3.34 15 5V6" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <p className="text-zinc-300 font-medium mb-1">Wallet required</p>
          <p className="text-zinc-500 text-sm">Connect your wallet to create a savings circle.</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await api.buildCreatePool({
        admin: address,
        contribution_amount: Math.round(parseFloat(contribution) * 1_000_000),
        round_period: period,
        max_members: maxMembers,
        manager: address,
        manager_fee_bps: feeBps,
      });

      const txResult = await submitTx.mutateAsync(result.unsignedXdr);

      if (txResult.status === "SUCCESS") {
        navigate("/pools");
      } else {
        setError(`Transaction failed: ${txResult.error ?? txResult.status}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create pool");
    } finally {
      setLoading(false);
    }
  }

  const totalPot = (parseFloat(contribution) || 0) * maxMembers;
  const feeAmount = totalPot * (feeBps / 10000);
  const netPayout = totalPot - feeAmount;

  return (
    <div className="py-10">
      <div className="mx-auto max-w-6xl px-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link to="/pools" className="text-zinc-500 hover:text-zinc-300 transition-colors">Pools</Link>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-400">New Circle</span>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Form */}
          <div className="md:col-span-3">
            <div className="card p-6">
              <h1 className="text-lg font-semibold text-zinc-50 mb-1">Create a Circle</h1>
              <p className="text-sm text-zinc-500 mb-6">
                Configure your savings circle. Members join during setup, then contributions begin.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label">Contribution per round (USDC)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={contribution}
                    onChange={(e) => setContribution(e.target.value)}
                    className="input"
                    placeholder="10.00"
                  />
                </div>

                <div>
                  <label className="label">Round period</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value))}
                    className="select"
                  >
                    {PERIOD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Max members (2–100)</label>
                  <input
                    type="number"
                    min={2}
                    max={100}
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(Number(e.target.value))}
                    className="input"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label !mb-0">Manager fee</label>
                    <span className="text-sm font-medium text-zinc-300 tabular-nums">
                      {(feeBps / 100).toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={500}
                    step={50}
                    value={feeBps}
                    onChange={(e) => setFeeBps(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-600 mt-1">
                    <span>0%</span><span>2.5%</span><span>5%</span>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || submitTx.isPending}
                  className="btn-primary w-full py-3"
                >
                  {loading || submitTx.isPending ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
                        <path d="M7 1.5C4 1.5 1.5 4 1.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      Creating…
                    </>
                  ) : (
                    "Create Circle"
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Summary */}
          <div className="md:col-span-2">
            <div className="card p-5 sticky top-20 space-y-4">
              <h2 className="text-sm font-medium text-zinc-400">Circle Summary</h2>
              <div className="divider !my-0" />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Contribution</span>
                  <span className="text-zinc-200 tabular-nums">
                    {parseFloat(contribution) > 0 ? `${contribution} USDC` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Members</span>
                  <span className="text-zinc-200 tabular-nums">{maxMembers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Total rounds</span>
                  <span className="text-zinc-200 tabular-nums">{maxMembers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Gross pot</span>
                  <span className="text-zinc-200 tabular-nums">
                    {totalPot > 0 ? `${totalPot.toFixed(2)} USDC` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Manager fee</span>
                  <span className="text-zinc-200 tabular-nums">
                    {totalPot > 0 ? `-${feeAmount.toFixed(2)} USDC` : "—"}
                  </span>
                </div>
                <div className="divider !my-0" />
                <div className="flex justify-between font-medium">
                  <span className="text-zinc-400">Net payout each</span>
                  <span className="text-emerald-400 tabular-nums">
                    {netPayout > 0 ? `${netPayout.toFixed(2)} USDC` : "—"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-xs text-zinc-500 leading-relaxed">
                You'll be set as the circle manager and will receive the fee from each round's payout.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
