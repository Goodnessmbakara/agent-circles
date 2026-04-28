import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { isStellarWallet } from "@dynamic-labs/stellar";

export function useSubmitTx() {
  const queryClient = useQueryClient();
  const { primaryWallet } = useDynamicContext();

  return useMutation({
    mutationFn: async (unsignedXdr: string) => {
      if (!primaryWallet || !isStellarWallet(primaryWallet)) {
        throw new Error("No Stellar wallet connected");
      }

      // After page refresh the WaaS connector loses its activeAccountAddress.
      // setActiveAccountAddress() is the public setter — call it before signing.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connector = (primaryWallet as any)._connector;
      if (connector?.setActiveAccountAddress && primaryWallet.address) {
        connector.setActiveAccountAddress(primaryWallet.address);
      }

      const signedTxXdr = await primaryWallet.signTransaction(unsignedXdr);
      return api.submitTx(signedTxXdr);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pools"] });
    },
  });
}
