import { useEffect, useRef } from "react";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { useWalletStore } from "../../stores/wallet-store";
import { checkAccountExists, fundWithFriendbot } from "../../lib/stellar";

/**
 * WalletSync component bridges the gap between Dynamic's authentication state
 * and the application's internal Zustand store.
 * 
 * It also handles automatic testnet funding for new accounts.
 */
export function WalletSync() {
  const { primaryWallet } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const { 
    connect, 
    disconnect, 
    address: storedAddress, 
    setAccountActive, 
    setFunding 
  } = useWalletStore();
  
  const fundingTried = useRef<string | null>(null);

  useEffect(() => {
    if (isLoggedIn && primaryWallet?.address) {
      const address = primaryWallet.address;

      // 1. Sync store address
      if (storedAddress !== address) {
        connect(address);
      }

      // 2. Auto-fund and Sync check
      const syncAccount = async () => {
        // First check if already active
        const exists = await checkAccountExists(address);
        
        if (exists) {
          setAccountActive(true);
          fundingTried.current = address;
          return;
        }

        // If not active and we haven't tried funding this session, fund it
        if (fundingTried.current !== address) {
          setFunding(true);
          console.log(`Account ${address} not found on testnet. Funding via Friendbot...`);
          const success = await fundWithFriendbot(address);
          
          if (success) {
            console.log(`Friendbot request successful for ${address}. Waiting for ledger close...`);
            
            // Poll for activation
            let attempts = 0;
            const maxAttempts = 15;
            
            const poll = setInterval(async () => {
              attempts++;
              const nowExists = await checkAccountExists(address);
              if (nowExists) {
                console.log(`Account ${address} is now active on-chain.`);
                clearInterval(poll);
                setAccountActive(true);
                setFunding(false);
                fundingTried.current = address;
              } else if (attempts >= maxAttempts) {
                console.warn(`Account activation timed out for ${address}`);
                clearInterval(poll);
                setFunding(false);
              }
            }, 2000);
          } else {
            setFunding(false);
          }
        }
      };

      syncAccount();
    } else if (!isLoggedIn && storedAddress) {
      disconnect();
    }
  }, [isLoggedIn, primaryWallet?.address, storedAddress, connect, disconnect, setAccountActive, setFunding]);

  return null;
}
