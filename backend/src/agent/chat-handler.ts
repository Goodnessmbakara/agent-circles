import Anthropic from "@anthropic-ai/sdk";
import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";
import { config } from "../config.js";
import { getSystemPrompt } from "./system-prompt.js";
import { TOOLS } from "./tools.js";
import type { AgentAction } from "./actions.js";
import { executeTool, type ToolContext } from "./tool-executor.js";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatContext {
  walletAddress?: string;
}

const MAX_TOOL_ROUNDS = 5;

// Direct Anthropic API model ID
const ANTHROPIC_MODEL = "claude-sonnet-4-6";

function getClient(): Anthropic | AnthropicBedrock {
  if (config.llmProvider === "bedrock") {
    // Explicit keys take priority; falls back to ~/.aws/credentials or IAM role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts: any = { awsRegion: config.awsRegion };
    if (config.awsAccessKeyId && config.awsSecretAccessKey) {
      opts.awsAccessKey = config.awsAccessKeyId;
      opts.awsSecretKey = config.awsSecretAccessKey;
    }
    return new AnthropicBedrock(opts);
  }
  return new Anthropic({ apiKey: config.claudeApiKey });
}

function getModelId(): string {
  return config.llmProvider === "bedrock" ? config.bedrockModelId : ANTHROPIC_MODEL;
}

export interface AgentChatResult {
  reply: string;
  actions: AgentAction[];
}

export async function runAgentChat(
  messages: ChatMessage[],
  context: ChatContext,
): Promise<AgentChatResult> {
  const client = getClient();
  const model = getModelId();

  const systemPrompt = getSystemPrompt({
    walletAddress: context.walletAddress,
    timestamp: new Date().toISOString(),
  });

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const toolContext: ToolContext = {
    walletAddress: context.walletAddress,
    actions: [],
  };

  let toolRoundsUsed = 0;
  let currentMessages = [...anthropicMessages];

  while (true) {
    // Both SDK clients share the same .messages.create interface
    const response = await (client as Anthropic).messages.create({
      model,
      max_tokens: config.agentMaxTokens,
      system: systemPrompt,
      tools: TOOLS,
      messages: currentMessages,
    });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (toolUseBlocks.length === 0 || toolRoundsUsed >= MAX_TOOL_ROUNDS) {
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text",
      );
      return {
        reply: textBlocks.map((b) => b.text).join("\n").trim(),
        actions: toolContext.actions,
      };
    }

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

    currentMessages = [
      ...currentMessages,
      { role: "assistant", content: response.content },
      { role: "user", content: toolResults },
    ];
  }
}
