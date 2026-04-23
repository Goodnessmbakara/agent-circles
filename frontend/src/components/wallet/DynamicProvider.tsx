import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { StellarWalletConnectors } from "@dynamic-labs/stellar";

export function DynamicProvider({ children }: { children: React.ReactNode }) {
  // Use env var if present, otherwise fallback to the primary production ID
  const environmentId = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || 'bf38eac3-30a2-4e66-883a-cffad9a5d4f2';

  return (
    <DynamicContextProvider
      settings={{
        environmentId,
        walletConnectors: [StellarWalletConnectors],
        initialAuthenticationMode: 'connect-only',
        events: {
          onAuthFailure: (method, reason) => {
            console.error('Dynamic Auth Failure:', method, reason);
          }
        }
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
