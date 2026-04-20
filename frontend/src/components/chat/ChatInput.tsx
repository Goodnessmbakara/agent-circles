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
    <form onSubmit={handleSubmit} className="flex items-end gap-2.5">
      <textarea
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask a question or reply 1–4…"
        className="flex-1 min-h-[44px] bg-surface-2/80 border border-white/[0.1] rounded-2xl px-4 py-3 text-[13px] text-zinc-100 placeholder-zinc-600
          focus:outline-none focus:border-brand-500/45 focus:ring-2 focus:ring-brand-500/15 resize-none transition-[border-color,box-shadow] duration-150 leading-relaxed shadow-inner"
        style={{ maxHeight: "120px" }}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 disabled:opacity-35
          disabled:cursor-not-allowed flex items-center justify-center transition-all duration-150
          cursor-pointer active:scale-[0.97] shadow-md shadow-[0_4px_20px_rgba(99,102,241,0.22)]"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
          <path
            d="M2.5 7.5H12.5M8 3L12.5 7.5L8 12"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}
