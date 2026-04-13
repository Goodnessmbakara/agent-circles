import { useState } from "react";
import { useNavigate } from "react-router";
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
  const [managerSelf, setManagerSelf] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!address) {
    return <p className="text-gray-500">Connect your wallet to create a pool.</p>;
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
        manager: managerSelf ? address : address,
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

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Create Pool</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Contribution per round (USDC)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={contribution}
            onChange={(e) => setContribution(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Round period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Max members (2–20)</label>
          <input
            type="number"
            min={2}
            max={20}
            value={maxMembers}
            onChange={(e) => setMaxMembers(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Manager fee: {(feeBps / 100).toFixed(1)}%
          </label>
          <input
            type="range"
            min={0}
            max={500}
            step={50}
            value={feeBps}
            onChange={(e) => setFeeBps(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={managerSelf}
            onChange={(e) => setManagerSelf(e.target.checked)}
            id="manager-self"
          />
          <label htmlFor="manager-self" className="text-sm text-gray-400">I am the manager</label>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || submitTx.isPending}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg font-medium"
        >
          {loading || submitTx.isPending ? "Creating..." : "Create Pool"}
        </button>
      </form>
    </div>
  );
}
