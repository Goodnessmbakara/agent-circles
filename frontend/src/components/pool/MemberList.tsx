import type { PoolMember } from "../../lib/api";
import { shortenAddress } from "../../lib/stellar";

interface MemberListProps {
  members: PoolMember[];
  currentRound: number;
}

export function MemberList({ members, currentRound }: MemberListProps) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">Members</h2>
        <span className="text-xs text-zinc-500">{members.length} total</span>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {members.map((m) => {
          const isCurrent = m.position === currentRound;
          const isPast = m.position < currentRound;

          return (
            <div
              key={m.member}
              className={`flex items-center justify-between px-5 py-3 text-sm ${
                isCurrent ? "bg-emerald-500/[0.06]" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Position badge */}
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0 ${
                    isCurrent
                      ? "bg-emerald-500/20 text-emerald-400"
                      : isPast
                      ? "bg-white/[0.04] text-zinc-600"
                      : "bg-white/[0.06] text-zinc-400"
                  }`}
                >
                  {m.position + 1}
                </span>

                <span className="font-mono text-zinc-400 text-xs">{shortenAddress(m.member)}</span>
              </div>

              <div>
                {isCurrent ? (
                  <span className="badge-active text-[11px] px-2 py-0.5">
                    <span className="w-1 h-1 rounded-full bg-current" />
                    Current recipient
                  </span>
                ) : isPast ? (
                  <span className="text-xs text-zinc-600">Received</span>
                ) : (
                  <span className="text-xs text-zinc-500">Round {m.position + 1}</span>
                )}
              </div>
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-zinc-600">
            No members yet — be the first to join.
          </div>
        )}
      </div>
    </div>
  );
}
