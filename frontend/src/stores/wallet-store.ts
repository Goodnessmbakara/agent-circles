import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WalletState {
  address: string | null;
  connected: boolean;
  connect: (address: string) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: null,
      connected: false,
      connect: (address: string) => set({ address, connected: true }),
      disconnect: () => set({ address: null, connected: false }),
    }),
    { name: "agent-circles-wallet" },
  ),
);
