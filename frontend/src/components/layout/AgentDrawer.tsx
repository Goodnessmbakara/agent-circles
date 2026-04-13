import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../chat/ChatMessage";
import { ChatInput } from "../chat/ChatInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AgentDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AgentDrawer({ open, onClose }: AgentDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your Agent Circles assistant. I can help you create pools, check your status, contribute, and explain how savings circles work. What would you like to do?",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text: string) {
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // TODO: Wire to backend agent endpoint (Phase 4)
      const assistantMsg: Message = {
        role: "assistant",
        content: `I received your message: "${text}". Agent integration coming in Phase 4.`,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-800 flex flex-col z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 className="font-bold">Agent</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-800">
        <ChatInput onSend={handleSend} disabled={loading} />
      </div>
    </div>
  );
}
