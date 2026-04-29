import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../chat/ChatMessage";
import { ChatInput } from "../chat/ChatInput";
import { api, type AgentChatAction } from "../../lib/api";
import { useWalletStore } from "../../stores/wallet-store";

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: AgentChatAction[];
}

interface AgentDrawerProps {
  open: boolean;
  onClose: () => void;
}

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hi! I'm your pool assistant (chat help). What would you like to do?\n\n1. Show pools you're a member of\n2. Check the status of a specific pool\n3. Explain how savings circles work\n4. Set up a contribution reminder\n\nReply with a number (1–4) or type a question.",
};

export function AgentDrawer({ open, onClose }: AgentDrawerProps) {
  const { address } = useWalletStore();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text: string) {
    const userMsg: Message = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    // Send full history to the agent so numbered replies have context
    const chatHistory = history.map(({ role, content }) => ({ role, content }));

    try {
      const { reply, actions } = await api.agentChat(chatHistory, address ?? undefined);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, actions: actions?.length ? actions : undefined },
      ]);
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer — inset below app header (60px) and above bottom; not full viewport height */}
      <div
        className={`fixed right-0 z-50 w-[min(100vw,400px)] flex flex-col min-h-0
          top-[60px] bottom-4
          max-md:bottom-[calc(4rem+0.75rem+env(safe-area-inset-bottom,0px))]
          rounded-l-2xl border border-white/[0.06] border-r-0 overflow-hidden
          bg-gradient-to-b from-surface-1 via-[#0a0a0c] to-surface-0
          shadow-[-16px_0_48px_rgba(0,0,0,0.55)]
          transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header — starts below main site header; no extra safe-area-top here */}
        <div className="relative shrink-0 border-b border-white/[0.06] bg-gradient-to-b from-brand-500/[0.06] to-transparent">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/25 to-transparent" />
          <div className="px-4 pb-3 pt-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/25 to-brand-600/10
                  border border-brand-500/30 shadow-sm flex items-center justify-center flex-shrink-0"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-brand-300" aria-hidden>
                  <path
                    d="M3.5 4.5C3.5 3.67 4.17 3 5 3h8c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5h-2.8L9 16.5V13H5c-.83 0-1.5-.67-1.5-1.5v-7z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <p className="text-[15px] font-semibold text-zinc-100 tracking-tight">Assistant</p>
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md
                      bg-white/[0.06] text-zinc-500 border border-white/[0.08]"
                  >
                    Claude
                  </span>
                </div>
                <p className="text-[12px] text-zinc-500 mt-1 leading-snug">
                  Chat help for pools — not on-chain automation
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close assistant"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500
                hover:text-zinc-200 hover:bg-white/[0.07] active:bg-white/[0.1] transition-colors cursor-pointer flex-shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages — min-h-0 so flex allows this region to shrink and scroll (see CSS flex min-height:auto) */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3 space-y-4
            bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,rgba(99,102,241,0.07)_0%,transparent_55%)]"
        >
          {messages.map((msg, i) => (
            <ChatMessage
              key={i}
              role={msg.role}
              content={msg.content}
              actions={msg.actions}
              actionsDisabled={loading && i === messages.length - 1}
            />
          ))}

          {loading && (
            <div className="flex items-center gap-3 pl-10 py-1">
              <span className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-brand-400/70 animate-bounce"
                    style={{ animationDelay: `${i * 140}ms` }}
                  />
                ))}
              </span>
              <span className="text-xs text-zinc-500 font-medium">Thinking…</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 pt-3 pb-3 border-t border-white/[0.06] bg-surface-0/80 backdrop-blur-md">
          <ChatInput onSend={handleSend} disabled={loading} />
        </div>
      </div>
    </>
  );
}
