import { useState, useCallback } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || disabled) return;
      onSend(trimmed);
      setValue("");
    },
    [value, disabled, onSend],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || disabled) return;
      onSend(trimmed);
      setValue("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <textarea
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask the agent or reply 1–4…"
        className="flex-1 bg-white/[0.04] border border-white/[0.09] rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600
          focus:outline-none focus:border-brand-500/50 resize-none transition-colors duration-150 leading-relaxed"
        style={{ maxHeight: "120px" }}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="flex-shrink-0 w-9 h-9 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-30
          disabled:cursor-not-allowed flex items-center justify-center transition-all duration-150
          cursor-pointer active:scale-95"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M2 6.5H11M7 2.5L11 6.5L7 10.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </form>
  );
}
