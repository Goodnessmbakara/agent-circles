/** Structured UI actions returned alongside agent text (chat-driven onboarding). */
export type AgentAction =
  | { type: "open_join"; pool_id: string }
  | {
      type: "sign_join";
      pool_id: string;
      unsignedXdr: string;
      simulationResult: { minResourceFee: string; transactionData: string };
    };
