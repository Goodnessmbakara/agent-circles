import { Link } from "react-router";
import { usePools } from "../hooks/use-pools";
import { PoolCard } from "../components/pool/PoolCard";
import { useWalletStore } from "../stores/wallet-store";

export function Dashboard() {
  const { data: pools, isLoading, error } = usePools();
  const { connected } = useWalletStore();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Pools</h1>
        {connected && (
          <Link
            to="/pools/create"
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg font-medium"
          >
            Create Pool
          </Link>
        )}
      </div>

      {!connected && (
        <p className="text-gray-500">Connect your wallet to view and manage pools.</p>
      )}

      {isLoading && <p className="text-gray-500">Loading pools...</p>}

      {error && (
        <p className="text-red-400">Failed to load pools: {(error as Error).message}</p>
      )}

      {pools && pools.length === 0 && (
        <p className="text-gray-500">No pools yet. Create one or check out the Demo.</p>
      )}

      {pools && pools.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {pools.map((pool) => (
            <PoolCard key={pool.contract_id} pool={pool} />
          ))}
        </div>
      )}
    </div>
  );
}
