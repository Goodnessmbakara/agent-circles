import ReactMarkdown from "react-markdown";
import type { AgentChatAction } from "../../lib/api";
import { AgentChatActions } from "./AgentChatActions";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  actions?: AgentChatAction[];
  actionsDisabled?: boolean;
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
        {isUser ? (
          <span>{content}</span>
        ) : (
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <p className="font-semibold text-zinc-50 text-[14px] mb-1">{children}</p>
              ),
              h2: ({ children }) => (
                <p className="font-semibold text-zinc-50 text-[13px] mb-1">{children}</p>
              ),
              h3: ({ children }) => (
                <p className="font-semibold text-zinc-100 mb-0.5">{children}</p>
              ),
              p: ({ children }) => (
                <p className="mb-1.5 last:mb-0">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-zinc-50">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-zinc-300">{children}</em>
              ),
              ul: ({ children }) => (
                <ul className="mb-1.5 space-y-0.5 pl-3">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-1.5 space-y-0.5 pl-4 list-decimal">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="relative pl-1 before:content-['–'] before:absolute before:-left-2.5 before:text-zinc-500">
                  {children}
                </li>
              ),
              code: ({ children }) => (
                <code className="font-mono text-[11px] bg-white/[0.07] border border-white/[0.1] rounded px-1 py-0.5 text-zinc-300 break-all">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="font-mono text-[11px] bg-white/[0.05] border border-white/[0.08] rounded-lg p-2.5 overflow-x-auto mb-1.5 text-zinc-300">
                  {children}
                </pre>
              ),
              hr: () => (
                <div className="border-t border-white/[0.08] my-2" />
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-brand-500/40 pl-2.5 text-zinc-400 italic mb-1.5">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors"
                >
                  {children}
                </a>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
        {!isUser && actions && actions.length > 0 && (
          <AgentChatActions actions={actions} disabled={actionsDisabled} />
        )}
      </div>
    </div>
  );
}
