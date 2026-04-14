interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2.5`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-lg bg-brand-500/15 border border-brand-500/20 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="text-brand-400">
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3"/>
            <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor"/>
          </svg>
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-brand-500/20 border border-brand-500/25 text-zinc-200 rounded-br-sm"
            : "bg-white/[0.05] border border-white/[0.07] text-zinc-300 rounded-bl-sm"
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
