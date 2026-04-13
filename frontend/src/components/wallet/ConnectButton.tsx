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

  // Initialize kit and subscribe to state changes once
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
        <span className="text-sm font-mono bg-gray-800 px-3 py-1 rounded">
          {shortenAddress(address)}
        </span>
        <button
          onClick={handleDisconnect}
          className="text-sm text-gray-400 hover:text-white"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg font-medium"
    >
      Connect Wallet
    </button>
  );
}
