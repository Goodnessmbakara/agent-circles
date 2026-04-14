import { Link } from "react-router";
import { usePools } from "../hooks/use-pools";
import { PoolCard } from "../components/pool/PoolCard";
import { useWalletStore } from "../stores/wallet-store";

export function Dashboard() {
  const { data: pools, isLoading, error } = usePools();
  const { connected } = useWalletStore();

  return (
    <div className="py-10">
      <div className="mx-auto max-w-6xl px-5">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-50">Pools</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Browse and manage savings circles</p>
          </div>
          {connected && (
            <Link to="/pools/create" className="btn-primary text-sm">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
              New Circle
            </Link>
          )}
        </div>

        {/* States */}
        {!connected && (
          <div className="card p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-brand-400">
                <rect x="2" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7 6V5C7 3.34 8.34 2 10 2H12C13.66 2 15 3.34 15 5V6" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="11" cy="12.5" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            <p className="text-zinc-300 font-medium mb-1">Connect your wallet</p>
            <p className="text-zinc-500 text-sm">Connect to view and manage your savings circles.</p>
          </div>
        )}

        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-4 bg-white/[0.06] rounded mb-3 w-1/3" />
                <div className="h-7 bg-white/[0.06] rounded mb-4 w-2/3" />
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-10 bg-white/[0.06] rounded" />
                  ))}
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="card border-red-500/20 p-5">
            <p className="text-red-400 text-sm">
              Failed to load pools: {(error as Error).message}
            </p>
          </div>
        )}

        {pools && pools.length === 0 && (
          <div className="card p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-zinc-500">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 7V11L14 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-zinc-300 font-medium mb-1">No pools yet</p>
            <p className="text-zinc-500 text-sm mb-5">
              Be the first — create a savings circle or try the demo.
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/pools/create" className="btn-primary text-sm">
                Create Pool
              </Link>
              <Link to="/demo" className="btn-secondary text-sm">
                Try Demo
              </Link>
            </div>
          </div>
        )}

        {pools && pools.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pools.map((pool) => (
              <PoolCard key={pool.contract_id} pool={pool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
