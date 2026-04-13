import { useState } from "react";
import { useParams } from "react-router";
import { usePool } from "../hooks/use-pools";
import { useWalletStore } from "../stores/wallet-store";
import { useSubmitTx } from "../hooks/use-tx";
import { api } from "../lib/api";
import { MemberList } from "../components/pool/MemberList";
import { RoundCountdown } from "../components/pool/RoundCountdown";
import { formatUsdc, stateLabel, stateColor, cn } from "../lib/utils";
import { explorerTxUrl } from "../lib/stellar";

export function PoolDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: pool, isLoading } = usePool(id!);
  const { address } = useWalletStore();
  const submitTx = useSubmitTx();
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  if (isLoading) return <p className="text-gray-500">Loading pool...</p>;
  if (!pool) return <p className="text-red-400">Pool not found</p>;

  async function handleContribute() {
    if (!address || !id) return;
    setTxStatus("Building transaction...");
    try {
      const result = await api.buildContribute(id, address);
      setTxStatus("Please sign in your wallet...");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">{pool.contract_id.slice(0, 12)}...</h1>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block", stateColor(pool.state))}>
            {stateLabel(pool.state)}
          </span>
        </div>
        {isActive && pool.start_time && (
          <RoundCountdown
            startTime={pool.start_time}
            roundPeriod={pool.round_period}
            currentRound={pool.current_round}
          />
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Contribution</p>
          <p className="text-lg font-bold">{formatUsdc(pool.contribution)} USDC</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Round</p>
          <p className="text-lg font-bold">{pool.current_round + 1} / {pool.max_members}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Members</p>
          <p className="text-lg font-bold">{pool.members.length} / {pool.max_members}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Manager Fee</p>
          <p className="text-lg font-bold">{(pool.fee_bps / 100).toFixed(1)}%</p>
        </div>
      </div>

      <MemberList members={pool.members} currentRound={pool.current_round} />

      {isActive && isMember && (
        <div className="border border-gray-800 rounded-lg p-4">
          <h2 className="font-bold mb-2">Contribute</h2>
          <p className="text-sm text-gray-400 mb-3">
            Pay {formatUsdc(pool.contribution)} USDC for round {pool.current_round + 1}
          </p>
          <button
            onClick={handleContribute}
            disabled={submitTx.isPending}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium"
          >
            {submitTx.isPending ? "Signing..." : "Contribute"}
          </button>
          {txStatus && <p className="text-sm mt-2 text-gray-400">{txStatus}</p>}
          {txHash && (
            <a
              href={explorerTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:underline mt-1 block"
            >
              View on Explorer
            </a>
          )}
        </div>
      )}

      {pool.state === "Setup" && !isMember && address && (
        <a
          href={`/pools/${pool.contract_id}/join`}
          className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium"
        >
          Join Pool
        </a>
      )}
    </div>
  );
}
