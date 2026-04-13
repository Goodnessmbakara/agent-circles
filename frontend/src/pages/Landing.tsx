import { Link } from "react-router";

export function Landing() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-5xl font-bold mb-4">Agent Circles</h1>
      <p className="text-xl text-gray-400 mb-8 max-w-xl mx-auto">
        On-chain rotating savings with autonomous operators. Join a circle, contribute each round,
        and receive the pooled payout when it's your turn.
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          to="/pools"
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium"
        >
          View Pools
        </Link>
        <Link
          to="/demo"
          className="border border-gray-700 hover:border-gray-500 text-gray-300 px-6 py-3 rounded-lg font-medium"
        >
          Try Demo
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-20 text-left max-w-3xl mx-auto">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <div className="text-2xl mb-2">🔄</div>
          <h3 className="font-bold mb-1">Rotating Payouts</h3>
          <p className="text-sm text-gray-400">
            Each member takes turns receiving the full pool payout. Everyone saves, everyone wins.
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <div className="text-2xl mb-2">🤖</div>
          <h3 className="font-bold mb-1">Autonomous Operations</h3>
          <p className="text-sm text-gray-400">
            An on-chain agent advances rounds automatically when conditions are met.
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <div className="text-2xl mb-2">⛓️</div>
          <h3 className="font-bold mb-1">Fully On-Chain</h3>
          <p className="text-sm text-gray-400">
            Built on Stellar/Soroban. Trustless, permissionless, and transparent.
          </p>
        </div>
      </div>
    </div>
  );
}
