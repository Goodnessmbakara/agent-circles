import { useState } from "react";
import { useParams, useNavigate } from "react-router";
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

  if (isLoading) return <p className="text-gray-500">Loading pool...</p>;
  if (!pool) return <p className="text-red-400">Pool not found</p>;
  if (!address) return <p className="text-gray-500">Connect your wallet to join.</p>;

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

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Join Pool</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Contribution per round</span>
          <span className="font-medium">{formatUsdc(pool.contribution)} USDC</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Max members</span>
          <span className="font-medium">{pool.max_members}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Current members</span>
          <span className="font-medium">{pool.members.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Manager fee</span>
          <span className="font-medium">{(pool.fee_bps / 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Total you'll contribute</span>
          <span className="font-medium">
            {formatUsdc(pool.contribution * pool.max_members)} USDC
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">You'll receive (gross)</span>
          <span className="font-medium text-green-400">
            {formatUsdc(pool.contribution * pool.max_members)} USDC
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        By joining, you agree to contribute {formatUsdc(pool.contribution)} USDC each round for{" "}
        {pool.max_members} rounds. Your payout position is assigned when you join.
      </p>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        onClick={handleJoin}
        disabled={submitTx.isPending}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg font-medium"
      >
        {submitTx.isPending ? "Signing..." : "Confirm and Join"}
      </button>
    </div>
  );
}
