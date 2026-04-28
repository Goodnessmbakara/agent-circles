import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WalletState {
  address: string | null;
  connected: boolean;
  isAccountActive: boolean;
  isFunding: boolean;
  connect: (address: string) => void;
  disconnect: () => void;
  setAccountActive: (active: boolean) => void;
  setFunding: (funding: boolean) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: null,
      connected: false,
      isAccountActive: false,
      isFunding: false,
      connect: (address: string) => set({ address, connected: true }),
      disconnect: () => set({ address: null, connected: false, isAccountActive: false, isFunding: false }),
      setAccountActive: (active: boolean) => set({ isAccountActive: active }),
      setFunding: (funding: boolean) => set({ isFunding: funding }),
    }),
    { name: "agent-circles-wallet" },
  ),
);
