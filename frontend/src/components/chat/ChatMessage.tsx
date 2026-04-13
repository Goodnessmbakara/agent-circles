interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-800 text-gray-200"
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
