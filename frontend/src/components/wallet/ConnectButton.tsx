import { useCallback, useEffect } from "react";
import { useWalletStore } from "../../stores/wallet-store";
import {
  StellarWalletsKit,
  KitEventType,
  initWalletKit,
  shortenAddress,
} from "../../lib/stellar";

export function ConnectButton() {
  const { address, connected, connect, disconnect } = useWalletStore();

  useEffect(() => {
    initWalletKit();
    const unsubscribe = StellarWalletsKit.on(KitEventType.STATE_UPDATED, async () => {
      try {
        const { address: addr } = await StellarWalletsKit.getAddress();
        if (addr) connect(addr);
      } catch {
        // wallet not yet connected
      }
    });
    const unsubDisconnect = StellarWalletsKit.on(KitEventType.DISCONNECT, () => {
      disconnect();
    });
    return () => {
      unsubscribe();
      unsubDisconnect();
    };
  }, [connect, disconnect]);

  const handleConnect = useCallback(async () => {
    try {
      await StellarWalletsKit.authModal();
    } catch (err) {
      console.error("Wallet connect failed:", err);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    await StellarWalletsKit.disconnect();
    disconnect();
  }, [disconnect]);

  if (connected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-lg px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="text-xs font-mono text-zinc-300">{shortenAddress(address)}</span>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5 cursor-pointer"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button onClick={handleConnect} className="btn-primary text-xs px-4 py-2 cursor-pointer">
      Sign In
    </button>
  );
}
