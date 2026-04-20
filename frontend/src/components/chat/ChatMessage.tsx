import type { AgentChatAction } from "../../lib/api";
import { AgentChatActions } from "./AgentChatActions";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  actions?: AgentChatAction[];
  actionsDisabled?: boolean;
}

function LineWithBold({ line }: { line: string }) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\*\*(.+)\*\*$/);
        if (m) {
          return (
            <strong key={i} className="font-semibold text-zinc-50">
              {m[1]}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function FormattedText({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  return (
    <div className={className}>
      {lines.map((line, lineIdx) => (
        <span key={lineIdx}>
          {lineIdx > 0 && <br />}
          <LineWithBold line={line} />
        </span>
      ))}
    </div>
  );
}

export function ChatMessage({ role, content, actions, actionsDisabled }: ChatMessageProps) {
  const isUser = role === "user";
  return (
    <div
      className={`flex gap-2.5 w-full min-w-0 ${isUser ? "justify-end" : "justify-start"} group/msg`}
    >
      {!isUser && (
        <div
          className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/10
            border border-brand-500/25 shadow-sm flex items-center justify-center flex-shrink-0 mt-0.5"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-brand-300" aria-hidden>
            <path
              d="M2.5 3.5C2.5 2.95 3.05 2.5 3.7 2.5h6.6c.65 0 1.2.45 1.2 1v5.2c0 .55-.55 1-1.2 1H6.8L4.8 12.5v-2.8H3.7c-.65 0-1.2-.45-1.2-1V3.5z"
              stroke="currentColor"
              strokeWidth="1.15"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      <div
        className={`min-w-0 max-w-[min(100%,20rem)] rounded-2xl px-3.5 py-3 text-[13px] leading-[1.55] shadow-sm [overflow-wrap:anywhere] break-words ${
          isUser
            ? "bg-gradient-to-br from-brand-600/35 to-brand-500/15 border border-brand-400/25 text-zinc-100 rounded-br-md shadow-lg shadow-black/25"
            : "bg-surface-1/90 border border-white/[0.08] text-zinc-200 rounded-bl-md border-l-2 border-l-brand-500/50"
        }`}
      >
        <FormattedText text={content} />
        {!isUser && actions && actions.length > 0 && (
          <AgentChatActions actions={actions} disabled={actionsDisabled} />
        )}
      </div>
    </div>
  );
}
