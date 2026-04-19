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

    // Send full history (excluding welcome) to the agent
    const chatHistory = history.filter((m) => m !== WELCOME);

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

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[380px] flex flex-col
          bg-[#0e0e10] border-l border-white/[0.07]
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-500/15 border border-brand-500/25 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-brand-400">
                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
                <circle cx="6.5" cy="6.5" r="2" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">Assistant</p>
              <p className="text-[11px] text-zinc-500 -mt-0.5 leading-snug">
                Chat help for pools — not on-chain automation
              </p>
              <p className="text-[10px] text-zinc-600 mt-0.5">Powered by Claude</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 2L11 11M11 2L2 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-1">
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
            <div className="flex items-center gap-2 text-zinc-500 text-sm py-2">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </span>
              <span className="text-xs text-zinc-600">Thinking…</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/[0.07]">
          <ChatInput onSend={handleSend} disabled={loading} />
        </div>
      </div>
    </>
  );
}
