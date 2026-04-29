import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useWalletStore } from "../stores/wallet-store";
import { api } from "../lib/api";
import { useSubmitTx } from "../hooks/use-tx";
import { friendbotUrl } from "../lib/stellar";
import { formatSubmitError } from "../lib/format-submit-error";

/** `round_period` is seconds on-chain. Short values = faster rounds for testnet / keeper demos. */
const PERIOD_OPTIONS = [
  { label: "30 seconds (fast demo)", value: 30 },
  { label: "1 minute (demo)", value: 60 },
  { label: "1 hour", value: 3600 },
  { label: "1 day", value: 86400 },
  { label: "1 week", value: 604800 },
];

function randomSaltHex(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export function CreatePool() {
  const { address, isAccountActive, isFunding } = useWalletStore();
  const navigate = useNavigate();
  const submitTx = useSubmitTx();

  const [poolName, setPoolName] = useState("");
  /** Server-side automation: keeper submits advance_round when rules allow (separate from chat assistant). */
  const keeperEnabled = true;
  const [contribution, setContribution] = useState("10");
  const [period, setPeriod] = useState(30);
  const [maxMembers, setMaxMembers] = useState(5);
  const feeBps = 200; // fixed 2% platform agent fee
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
          <p className="text-zinc-500 text-sm">Sign in to create a savings circle.</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setLoading(true);
    setError(null);

    try {
      // Backend agent uploads WASM and creates the contract — avoids Dynamic
      // WaaS XDR-parse error on Protocol-22 V2 contract-creation auth entries.
      const salt = randomSaltHex();
      const deployed = await api.deployPoolContract(salt);
      const cid = deployed.contract_id;

      const init = await api.buildCreatePool({
        contract_id: cid,
        admin: address,
        contribution_amount: Math.round(parseFloat(contribution) * 1_000_000),
        round_period: period,
        max_members: maxMembers,
        manager: address,
        manager_fee_bps: feeBps,
      });

      const tx3 = await submitTx.mutateAsync(init.unsignedXdr);
      if (tx3.status !== "SUCCESS") {
        setError(`Initialize pool failed: ${formatSubmitError(tx3)}`);
        return;
      }

      await api.registerPool(cid, poolName.trim(), keeperEnabled);
      navigate("/pools");
    } catch (err: any) {
      console.error("Pool creation failure:", err);
      const msg = err.message || String(err);
      
      if (msg.includes("404") || msg.includes("not found") || msg.includes("400") || (err.code === "account_not_funded")) {
        setError("Account not found on-chain. Please wait a few seconds for the network to sync. If you just funded your wallet, it may take 10-15 seconds.");
      } else {
        setError(msg);
      }
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
                Configure your savings circle. Your wallet will be opened once to sign the initialize call
                with the settings below; deployment is handled server-side.
              </p>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 mb-6 text-xs text-amber-200/90 leading-relaxed">
                <strong className="text-amber-100">Testnet:</strong> Your wallet must be{" "}
                <span className="text-zinc-300">funded on Stellar testnet</span> before any transaction
                can be built. If you see “Account not found”, open{" "}
                <a
                  href={friendbotUrl(address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 underline hover:text-brand-300"
                >
                  Friendbot
                </a>{" "}
                to receive free XLM, wait a few seconds, then try again. In Freighter, use{" "}
                <span className="text-zinc-300">Test network</span> (not Mainnet).
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label">Circle name</label>
                  <input
                    type="text"
                    value={poolName}
                    onChange={(e) => setPoolName(e.target.value)}
                    className="input"
                    placeholder="e.g. Friday friends fund"
                    maxLength={80}
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1.5">
                    Shown on the pool list so you can spot this circle easily.
                  </p>
                </div>

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
                  <p className="mt-1.5 text-xs text-zinc-500">
                    Use 30s or 1m on testnet to watch the keeper advance rounds quickly; longer periods for production-like runs.
                  </p>
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
                  <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 overflow-hidden">
                    <p className="text-red-400 text-xs leading-relaxed break-words">
                      {error}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || submitTx.isPending || (isFunding || !isAccountActive)}
                  className="btn-primary w-full py-3"
                >
                  {loading || submitTx.isPending ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
                        <path d="M7 1.5C4 1.5 1.5 4 1.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      Creating circle…
                    </>
                  ) : isFunding || !isAccountActive ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
                        <path d="M7 1.5C4 1.5 1.5 4 1.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      Activating Wallet…
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
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500 shrink-0">Name</span>
                  <span className="text-zinc-200 text-right truncate min-w-0">
                    {poolName.trim() || "—"}
                  </span>
                </div>
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
                  <span className="text-zinc-500">Agent fee <span className="text-zinc-600">(2%)</span></span>
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
                A 2% agent fee is collected by the platform from each round's payout.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
