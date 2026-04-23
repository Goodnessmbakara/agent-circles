import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { shortenAddress } from "../../lib/stellar";

export function ConnectButton() {
  const { setShowAuthFlow, primaryWallet, handleLogOut } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();

  if (isLoggedIn && primaryWallet) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-lg px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="text-xs font-mono text-zinc-300">
            {shortenAddress(primaryWallet.address)}
          </span>
        </div>
        <button
          onClick={() => handleLogOut()}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5 cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => setShowAuthFlow(true)} 
      className="btn-primary text-xs px-4 py-2 cursor-pointer"
    >
      Sign In
    </button>
  );
}
