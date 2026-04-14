import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { getSystemPrompt } from "./system-prompt.js";
import { TOOLS } from "./tools.js";
import { executeTool, type ToolContext } from "./tool-executor.js";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatContext {
  walletAddress?: string;
}

const MAX_TOOL_ROUNDS = 5;

export async function runAgentChat(
  messages: ChatMessage[],
  context: ChatContext,
): Promise<string> {
  const client = new Anthropic({ apiKey: config.claudeApiKey });

  const systemPrompt = getSystemPrompt({
    walletAddress: context.walletAddress,
    timestamp: new Date().toISOString(),
  });

  // Convert to Anthropic message format
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const toolContext: ToolContext = { walletAddress: context.walletAddress };

  let toolRoundsUsed = 0;
  let currentMessages = [...anthropicMessages];

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages: currentMessages,
    });

    // If no tool use or we've hit the max, extract and return text
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (toolUseBlocks.length === 0 || toolRoundsUsed >= MAX_TOOL_ROUNDS) {
      // Extract final text content
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text",
      );
      return textBlocks.map((b) => b.text).join("\n").trim();
    }

    // Execute all tool calls in this round in parallel
    toolRoundsUsed++;

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (toolUse) => {
        const result = await executeTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          toolContext,
        );
        return {
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: result,
        };
      }),
    );

    // Append assistant response + tool results for next round
    currentMessages = [
      ...currentMessages,
      { role: "assistant", content: response.content },
      { role: "user", content: toolResults },
    ];
  }
}
