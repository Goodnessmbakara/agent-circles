import type { PoolMember } from "../../lib/api";
import { shortenAddress } from "../../lib/stellar";

interface MemberListProps {
  members: PoolMember[];
  currentRound: number;
}

export function MemberList({ members, currentRound }: MemberListProps) {
  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-800/50">
          <tr>
            <th className="text-left px-4 py-2 text-gray-400">#</th>
            <th className="text-left px-4 py-2 text-gray-400">Address</th>
            <th className="text-left px-4 py-2 text-gray-400">Payout Round</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr
              key={m.member}
              className={m.position === currentRound ? "bg-green-500/10" : ""}
            >
              <td className="px-4 py-2">{m.position + 1}</td>
              <td className="px-4 py-2 font-mono">{shortenAddress(m.member)}</td>
              <td className="px-4 py-2">
                {m.position === currentRound ? (
                  <span className="text-green-400 font-medium">Current recipient</span>
                ) : m.position < currentRound ? (
                  <span className="text-gray-500">Received</span>
                ) : (
                  <span className="text-gray-400">Round {m.position + 1}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
