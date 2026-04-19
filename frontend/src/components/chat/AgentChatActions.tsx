import { useState } from "react";
import { useNavigate } from "react-router";
import type { AgentChatAction } from "../../lib/api";
import { useSubmitTx } from "../../hooks/use-tx";

interface AgentChatActionsProps {
  actions: AgentChatAction[];
  disabled?: boolean;
}

export function AgentChatActions({ actions, disabled }: AgentChatActionsProps) {
  const navigate = useNavigate();
  const submitTx = useSubmitTx();
  const [error, setError] = useState<string | null>(null);

  if (actions.length === 0) return null;

  return (
    <div className="mt-2.5 space-y-2">
      {actions.map((a, i) => {
        if (a.type === "open_join") {
          return (
            <button
              key={`${a.pool_id}-open-${i}`}
              type="button"
              disabled={disabled}
              onClick={() => navigate(`/pools/${a.pool_id}/join`)}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium
                bg-brand-500/15 border border-brand-500/30 text-brand-300 hover:bg-brand-500/25
                disabled:opacity-40 transition-colors"
            >
              Open join page
              <span className="block font-mono text-[10px] text-zinc-500 mt-0.5 truncate">
                {a.pool_id.slice(0, 12)}…
              </span>
            </button>
          );
        }
        return (
          <button
            key={`${a.pool_id}-sign-${i}`}
            type="button"
            disabled={disabled || submitTx.isPending}
            onClick={async () => {
              setError(null);
              try {
                const result = await submitTx.mutateAsync(a.unsignedXdr);
                if (result.status === "SUCCESS") {
                  navigate(`/pools/${a.pool_id}`);
                } else {
                  setError(result.error ?? result.status);
                }
              } catch (e) {
                setError(e instanceof Error ? e.message : "Transaction failed");
              }
            }}
            className="w-full px-3 py-2 rounded-lg text-xs font-semibold
              bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30
              disabled:opacity-40 transition-colors"
          >
            {submitTx.isPending ? "Signing…" : "Sign & join in wallet"}
          </button>
        );
      })}
      {error && (
        <p className="text-[11px] text-red-400/90">{error}</p>
      )}
    </div>
  );
}
