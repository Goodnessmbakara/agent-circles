import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { StellarWalletsKit, NETWORK_PASSPHRASE } from "../lib/stellar";

export function useSubmitTx() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (unsignedXdr: string) => {
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(unsignedXdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      return api.submitTx(signedTxXdr);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pools"] });
    },
  });
}
