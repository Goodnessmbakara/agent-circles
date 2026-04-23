import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { StellarWalletConnectors } from "@dynamic-labs/stellar";

export function DynamicProvider({ children }: { children: React.ReactNode }) {
  const environmentId = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID;

  if (!environmentId || environmentId === 'your_dynamic_environment_id_here') {
    console.warn("Dynamic Environment ID is missing. Please set VITE_DYNAMIC_ENVIRONMENT_ID in your .env file.");
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: environmentId || 'bf38eac3-30a2-4e66-883a-cffad9a5d4f2',
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
