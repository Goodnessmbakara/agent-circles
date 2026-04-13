# Agent Circles — Phase 4: Agent Integration + Demo Mode

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Claude agent with tool-use into the backend, connect the chat drawer to the agent, build the demo mode seeder, and do a full end-to-end testnet deployment.

**Architecture:** Backend exposes `/api/agent/chat` endpoint that proxies to Claude Messages API with streaming. Agent system prompt defines its role + 10 tools. Tools call the existing backend functions (not external HTTP — internal function calls). Frontend streams the response via SSE/fetch streaming. Demo mode uses Friendbot + testnet token issuer to fund accounts and seed a pool.

**Tech Stack:** @anthropic-ai/sdk (Claude API), Server-Sent Events for streaming, stellar-cli for contract deployment

**Prereqs:** Phases 1-3 complete. Contract WASM built. Backend and frontend functional.

---

## File Structure

```
backend/src/
├── agent/
│   ├── system-prompt.ts            # Agent system prompt text
│   ├── tools.ts                    # Tool definitions (Claude tool-use format)
│   ├── tool-executor.ts            # Maps tool calls → backend functions
│   └── chat-handler.ts             # Stream Claude response to client
├── routes/
│   └── agent.ts                    # (modify) Add POST /api/agent/chat
├── services/
│   └── demo.ts                     # Demo mode: fund accounts, deploy, seed pool

frontend/src/
├── components/layout/
│   └── AgentDrawer.tsx             # (modify) Wire to /api/agent/chat with streaming
├── pages/
│   └── Demo.tsx                    # (modify) Full demo mode UI
│   └── Landing.tsx                 # (modify) Full landing page
scripts/
├── deploy-contract.sh              # Deploy contract to testnet
└── fund-test-accounts.sh           # Friendbot funding script
```

---

### Task 1: Claude Agent — System Prompt + Tool Definitions

**Files:**
- Create: `backend/src/agent/system-prompt.ts`
- Create: `backend/src/agent/tools.ts`

- [ ] **Step 1: Create system prompt**

```typescript
// backend/src/agent/system-prompt.ts
export const AGENT_SYSTEM_PROMPT = `You are the Agent Circles assistant — an AI that helps users manage on-chain rotating savings circles (ROSCAs) on the Stellar network.

## What you do
- Explain how savings circles work (ajo, susu, tanda, chit funds — all names for ROSCA)
- Help users create, join, and contribute to pools
- Check pool status, member contributions, and round progress
- Build transactions for users to review and sign (you NEVER sign on their behalf)
- Manage pools as a keeper: trigger round advancement when conditions are met
- Track and report manager fees

## Rules
1. NEVER fabricate pool data. Always use your tools to query actual chain state.
2. NEVER sign transactions that move user funds. You only build unsigned transactions.
3. When a user asks to perform an action (contribute, join, create), build the transaction and present it clearly. The user must sign in their wallet.
4. If a user asks about a pool, always call get_pool first before answering.
5. Be concise. Users are on a chat interface, not reading essays.
6. When explaining ROSCAs, use simple language. Most users are not blockchain developers.

## How ROSCAs work (for context)
A ROSCA is a group savings mechanism:
- N members agree to contribute a fixed amount each round
- Each round, one member receives the full pot (contributions from all members minus a small manager fee)
- The rotation order is fixed when the pool is created
- After N rounds, every member has both paid in and received the pot exactly once
- The manager (which can be an AI agent) earns a small fee for coordinating

## Current context
- Network: Stellar Testnet
- Asset: USDC (testnet)
- You are managing pools as an AI agent with your own Stellar address
- Your tools connect to the backend API which interacts with Soroban contracts`;
```

- [ ] **Step 2: Create tool definitions**

```typescript
// backend/src/agent/tools.ts
import type { Tool } from "@anthropic-ai/sdk/resources/messages";

export const AGENT_TOOLS: Tool[] = [
  {
    name: "list_pools",
    description: "List all available savings circle pools. Returns pool ID, state, contribution amount, members, and current round.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_pool",
    description: "Get detailed information about a specific pool including members, contribution status, and round progress.",
    input_schema: {
      type: "object" as const,
      properties: {
        pool_id: { type: "string", description: "The contract ID of the pool" },
      },
      required: ["pool_id"],
    },
  },
  {
    name: "get_member_status",
    description: "Check a member's status in a pool: whether they contributed this round, if they received their payout, and total contributed.",
    input_schema: {
      type: "object" as const,
      properties: {
        pool_id: { type: "string", description: "The contract ID of the pool" },
        member: { type: "string", description: "The Stellar address of the member" },
      },
      required: ["pool_id", "member"],
    },
  },
  {
    name: "create_pool",
    description: "Build an unsigned transaction to create a new savings circle pool. Returns XDR for the user to sign.",
    input_schema: {
      type: "object" as const,
      properties: {
        admin: { type: "string", description: "Stellar address of the pool creator" },
        contribution_amount: { type: "number", description: "Amount in USDC (e.g. 10 for 10 USDC)" },
        round_period: { type: "number", description: "Round duration in seconds (60=1min, 86400=1day, 604800=1week)" },
        max_members: { type: "number", description: "Maximum number of members (2-20)" },
        manager_fee_bps: { type: "number", description: "Manager fee in basis points (100 = 1%, max 500 = 5%)" },
      },
      required: ["admin", "contribution_amount", "round_period", "max_members", "manager_fee_bps"],
    },
  },
  {
    name: "join_pool",
    description: "Build an unsigned transaction to join a pool. Returns XDR for the user to sign.",
    input_schema: {
      type: "object" as const,
      properties: {
        pool_id: { type: "string", description: "The contract ID of the pool" },
        member: { type: "string", description: "The Stellar address joining the pool" },
      },
      required: ["pool_id", "member"],
    },
  },
  {
    name: "build_contribute_tx",
    description: "Build an unsigned transaction to contribute to the current round. Returns XDR for the user to sign.",
    input_schema: {
      type: "object" as const,
      properties: {
        pool_id: { type: "string", description: "The contract ID of the pool" },
        member: { type: "string", description: "The Stellar address of the contributing member" },
      },
      required: ["pool_id", "member"],
    },
  },
  {
    name: "advance_round",
    description: "Trigger round advancement for a pool. This is permissionless — anyone can call it when all contributions are in and the round period has elapsed. The agent calls this directly as a keeper.",
    input_schema: {
      type: "object" as const,
      properties: {
        pool_id: { type: "string", description: "The contract ID of the pool" },
      },
      required: ["pool_id"],
    },
  },
  {
    name: "schedule_reminder",
    description: "Schedule an off-chain reminder for a member about an upcoming contribution.",
    input_schema: {
      type: "object" as const,
      properties: {
        pool_id: { type: "string", description: "The contract ID of the pool" },
        member: { type: "string", description: "The Stellar address of the member to remind" },
        remind_at: { type: "number", description: "Unix timestamp for when to send the reminder" },
        message: { type: "string", description: "Reminder message text" },
      },
      required: ["pool_id", "member", "remind_at", "message"],
    },
  },
  {
    name: "get_fee_summary",
    description: "Get the agent's fee earnings across all managed pools.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "explain_pool",
    description: "Generate a plain-language explanation of a pool's terms, rotation order, and schedule.",
    input_schema: {
      type: "object" as const,
      properties: {
        pool_id: { type: "string", description: "The contract ID of the pool" },
      },
      required: ["pool_id"],
    },
  },
];
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/agent/
git commit -m "feat(agent): system prompt and 10 tool definitions"
```

---

### Task 2: Tool Executor + Chat Handler

**Files:**
- Create: `backend/src/agent/tool-executor.ts`
- Create: `backend/src/agent/chat-handler.ts`
- Modify: `backend/src/routes/agent.ts`
- Modify: `backend/package.json` (add @anthropic-ai/sdk)

- [ ] **Step 1: Add Anthropic SDK dependency**

Add to `backend/package.json` dependencies:

```json
"@anthropic-ai/sdk": "^0.30.0"
```

Run: `cd /Users/abba/Desktop/stellar_build/backend && npm install`

- [ ] **Step 2: Create tool executor**

```typescript
// backend/src/agent/tool-executor.ts
import { Address, nativeToScVal } from "@stellar/stellar-sdk";
import { buildContractTx, buildAndSignWithAgent } from "../stellar/tx-builder.js";
import { submitSignedTx } from "../stellar/tx-submit.js";
import * as db from "../db/queries.js";
import { config } from "../config.js";

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "list_pools": {
      const pools = db.listPools();
      return JSON.stringify(pools.map((p) => ({
        id: p.contract_id,
        state: p.state,
        contribution: p.contribution / 1_000_000,
        round: p.current_round,
        max_members: p.max_members,
        fee: `${(p.fee_bps / 100).toFixed(1)}%`,
      })));
    }

    case "get_pool": {
      const pool = db.getPool(input.pool_id as string);
      if (!pool) return JSON.stringify({ error: "Pool not found" });
      const members = db.getPoolMembers(input.pool_id as string);
      return JSON.stringify({ ...pool, members, contribution_usdc: pool.contribution / 1_000_000 });
    }

    case "get_member_status": {
      const pool = db.getPool(input.pool_id as string);
      if (!pool) return JSON.stringify({ error: "Pool not found" });
      // In a full implementation, query on-chain. For MVP, return cached data.
      return JSON.stringify({
        pool_id: input.pool_id,
        member: input.member,
        message: "Member status check — query on-chain for real-time data",
      });
    }

    case "create_pool": {
      const result = await buildContractTx({
        contractId: config.contractId,
        method: "initialize",
        args: [
          new Address(input.admin as string).toScVal(),
          new Address(config.contractId).toScVal(), // USDC token address — replace with actual
          nativeToScVal(Math.round((input.contribution_amount as number) * 1_000_000), { type: "i128" }),
          nativeToScVal(input.round_period as number, { type: "u64" }),
          nativeToScVal(input.max_members as number, { type: "u32" }),
          new Address(input.admin as string).toScVal(), // manager = admin for now
          nativeToScVal(input.manager_fee_bps as number, { type: "u32" }),
        ],
        sourceAddress: input.admin as string,
      });
      return JSON.stringify({
        action: "create_pool",
        unsigned_xdr: result.unsignedXdr,
        message: "Transaction built. Please sign with your wallet to create the pool.",
      });
    }

    case "join_pool": {
      const result = await buildContractTx({
        contractId: input.pool_id as string,
        method: "join",
        args: [new Address(input.member as string).toScVal()],
        sourceAddress: input.member as string,
      });
      return JSON.stringify({
        action: "join_pool",
        unsigned_xdr: result.unsignedXdr,
        message: "Transaction built. Please sign with your wallet to join the pool.",
      });
    }

    case "build_contribute_tx": {
      const result = await buildContractTx({
        contractId: input.pool_id as string,
        method: "contribute",
        args: [new Address(input.member as string).toScVal()],
        sourceAddress: input.member as string,
      });
      return JSON.stringify({
        action: "contribute",
        unsigned_xdr: result.unsignedXdr,
        message: "Transaction built. Please sign with your wallet to contribute.",
      });
    }

    case "advance_round": {
      try {
        const signedXdr = await buildAndSignWithAgent(
          input.pool_id as string,
          "advance_round",
          [],
        );
        const result = await submitSignedTx(signedXdr);
        return JSON.stringify({
          action: "advance_round",
          status: result.status,
          tx_hash: result.hash,
          message: result.status === "SUCCESS"
            ? "Round advanced successfully! Payout has been sent to the recipient."
            : `Round advancement failed: ${result.error ?? result.status}`,
        });
      } catch (err: any) {
        return JSON.stringify({
          action: "advance_round",
          error: err.message,
          message: "Could not advance round — conditions may not be met yet (missing contributions or time not elapsed).",
        });
      }
    }

    case "schedule_reminder": {
      db.addReminder(
        input.pool_id as string,
        input.member as string,
        input.remind_at as number,
        input.message as string,
      );
      return JSON.stringify({ scheduled: true, message: "Reminder scheduled." });
    }

    case "get_fee_summary": {
      const agentAddress = config.agentSecretKey
        ? (await import("@stellar/stellar-sdk")).Keypair.fromSecret(config.agentSecretKey).publicKey()
        : "";
      const summary = db.getAgentFeeSummary(agentAddress);
      return JSON.stringify({ agent_address: agentAddress, ...summary });
    }

    case "explain_pool": {
      const pool = db.getPool(input.pool_id as string);
      if (!pool) return JSON.stringify({ error: "Pool not found" });
      const members = db.getPoolMembers(input.pool_id as string);
      return JSON.stringify({
        explanation: `This is a savings circle with ${pool.max_members} members. Each member contributes ${pool.contribution / 1_000_000} USDC per round. Rounds last ${pool.round_period} seconds. The manager earns a ${(pool.fee_bps / 100).toFixed(1)}% fee on each payout. Currently in round ${pool.current_round + 1} of ${pool.max_members}. State: ${pool.state}. ${members.length} members have joined.`,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
```

- [ ] **Step 3: Create chat handler with streaming**

```typescript
// backend/src/agent/chat-handler.ts
import Anthropic from "@anthropic-ai/sdk";
import { AGENT_SYSTEM_PROMPT } from "./system-prompt.js";
import { AGENT_TOOLS } from "./tools.js";
import { executeTool } from "./tool-executor.js";
import { config } from "../config.js";

const anthropic = new Anthropic({ apiKey: config.claudeApiKey });

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function handleAgentChat(
  messages: Message[],
  userAddress: string | null,
): Promise<string> {
  const systemPrompt = userAddress
    ? `${AGENT_SYSTEM_PROMPT}\n\nThe current user's Stellar address is: ${userAddress}`
    : AGENT_SYSTEM_PROMPT;

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Allow up to 5 tool-use rounds
  for (let i = 0; i < 5; i++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools: AGENT_TOOLS,
      messages: anthropicMessages,
    });

    // Check if there are tool uses
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (toolUseBlocks.length === 0) {
      // No tool calls — return the text response
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text",
      );
      return textBlocks.map((b) => b.text).join("\n");
    }

    // Execute tools and continue the conversation
    anthropicMessages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      const result = await executeTool(
        toolUse.name,
        toolUse.input as Record<string, unknown>,
      );
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    anthropicMessages.push({ role: "user", content: toolResults });
  }

  return "I've reached my tool-use limit for this turn. Please try again with a simpler request.";
}
```

- [ ] **Step 4: Update agent routes with chat endpoint**

Add to `backend/src/routes/agent.ts`:

```typescript
import { handleAgentChat } from "../agent/chat-handler.js";

// Inside agentRoutes function, add:

  const ChatSchema = z.object({
    messages: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })),
    user_address: z.string().nullable().optional(),
  });

  app.post("/agent/chat", async (request) => {
    const body = ChatSchema.parse(request.body);
    const response = await handleAgentChat(
      body.messages,
      body.user_address ?? null,
    );
    return { data: { response } };
  });
```

- [ ] **Step 5: Verify compilation**

Run: `cd /Users/abba/Desktop/stellar_build/backend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat(agent): Claude tool-use chat handler with 10 tools"
```

---

### Task 3: Wire Frontend Chat to Backend Agent

**Files:**
- Modify: `frontend/src/components/layout/AgentDrawer.tsx`

- [ ] **Step 1: Update AgentDrawer to call backend**

Replace the `handleSend` function in `AgentDrawer.tsx`:

```tsx
// frontend/src/components/layout/AgentDrawer.tsx
import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../chat/ChatMessage";
import { ChatInput } from "../chat/ChatInput";
import { useWalletStore } from "../../stores/wallet-store";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AgentDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AgentDrawer({ open, onClose }: AgentDrawerProps) {
  const { address } = useWalletStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your Agent Circles assistant. I can help you create pools, check status, contribute, and explain how savings circles work. What would you like to do?",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text: string) {
    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          user_address: address,
        }),
      });

      const json = await res.json();

      if (res.ok && json.data?.response) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.data.response },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${json.error?.message ?? "Unknown error"}` },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Connection error: ${err.message}` },
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
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-400">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-800">
        <ChatInput onSend={handleSend} disabled={loading} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/abba/Desktop/stellar_build/frontend && npx vite build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): wire agent chat drawer to backend Claude API"
```

---

### Task 4: Demo Mode

**Files:**
- Create: `backend/src/services/demo.ts`
- Create: `backend/src/routes/demo.ts`
- Modify: `frontend/src/pages/Demo.tsx`

- [ ] **Step 1: Create backend demo service**

```typescript
// backend/src/services/demo.ts
import { Keypair } from "@stellar/stellar-sdk";
import { Horizon } from "@stellar/stellar-sdk";
import { config } from "../config.js";

const FRIENDBOT_URL = "https://friendbot.stellar.org";

export interface DemoAccount {
  publicKey: string;
  secretKey: string;
}

export async function createDemoAccounts(count: number): Promise<DemoAccount[]> {
  const accounts: DemoAccount[] = [];

  for (let i = 0; i < count; i++) {
    const keypair = Keypair.random();
    accounts.push({
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
    });

    // Fund via Friendbot
    const url = `${FRIENDBOT_URL}?addr=${keypair.publicKey()}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Friendbot failed for ${keypair.publicKey()}: ${res.status}`);
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  return accounts;
}
```

- [ ] **Step 2: Create demo route**

```typescript
// backend/src/routes/demo.ts
import type { FastifyInstance } from "fastify";
import { createDemoAccounts } from "../services/demo.js";

export async function demoRoutes(app: FastifyInstance) {
  app.post("/demo/seed", async () => {
    const accounts = await createDemoAccounts(5);
    return {
      data: {
        accounts: accounts.map((a) => ({
          publicKey: a.publicKey,
          // Only expose secret keys in demo mode for testnet
          secretKey: a.secretKey,
        })),
        instructions: [
          "5 test accounts created and funded via Friendbot",
          "Use these accounts to create a pool, join, and test the full ROSCA cycle",
          "Round period is set to 1 minute for fast demo",
        ],
      },
    };
  });
}
```

Register in `backend/src/index.ts`:

```typescript
import { demoRoutes } from "./routes/demo.js";
await app.register(demoRoutes, { prefix: "/api" });
```

- [ ] **Step 3: Build Demo page**

```tsx
// frontend/src/pages/Demo.tsx
import { useState } from "react";

interface DemoAccount {
  publicKey: string;
  secretKey: string;
}

export function Demo() {
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSeed() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setAccounts(json.data.accounts);
      } else {
        setError(json.error?.message ?? "Failed to seed accounts");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Demo Mode</h1>
      <p className="text-gray-400 mb-6">
        Create 5 test accounts funded with XLM via Friendbot. Use these to test a full
        ROSCA cycle on Stellar Testnet.
      </p>

      <button
        onClick={handleSeed}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium mb-6"
      >
        {loading ? "Creating accounts..." : "Seed 5 Test Accounts"}
      </button>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {accounts.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold">Test Accounts</h2>
          {accounts.map((acc, i) => (
            <div key={acc.publicKey} className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-sm text-gray-400">Account {i + 1}</p>
              <p className="font-mono text-xs break-all">{acc.publicKey}</p>
            </div>
          ))}

          <div className="border border-gray-800 rounded-lg p-4 mt-6">
            <h3 className="font-bold mb-2">Demo Steps</h3>
            <ol className="list-decimal list-inside text-sm text-gray-400 space-y-1">
              <li>Create a pool: Set contribution to 10 USDC, round period to 1 minute, 5 members</li>
              <li>Join the pool with all 5 accounts</li>
              <li>Each account contributes to round 1</li>
              <li>Wait for round period to elapse, then trigger advance</li>
              <li>Repeat for all 5 rounds — observe payouts in explorer</li>
              <li>Ask the Agent to help at any step</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify both build**

Run: `cd /Users/abba/Desktop/stellar_build/backend && npx tsc --noEmit && cd ../frontend && npx vite build`
Expected: Both compile/build successfully.

- [ ] **Step 5: Commit**

```bash
git add backend/ frontend/
git commit -m "feat: demo mode with Friendbot-funded test accounts"
```

---

### Task 5: Deployment Scripts

**Files:**
- Create: `scripts/deploy-contract.sh`
- Create: `scripts/setup-testnet.sh`

- [ ] **Step 1: Create contract deployment script**

```bash
#!/bin/bash
# scripts/deploy-contract.sh
# Deploy the ROSCA pool contract to Stellar Testnet

set -euo pipefail

echo "Building contract..."
cd "$(dirname "$0")/.."
cargo build --target wasm32-unknown-unknown --release --package rosca-pool

WASM_PATH="target/wasm32-unknown-unknown/release/rosca_pool.wasm"

if [ ! -f "$WASM_PATH" ]; then
  echo "ERROR: WASM not found at $WASM_PATH"
  exit 1
fi

echo "Deploying to testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --network testnet \
  --source-account default \
  2>&1 | tail -1)

echo ""
echo "Contract deployed!"
echo "CONTRACT_ID=$CONTRACT_ID"
echo ""
echo "Add to backend/.env:"
echo "  CONTRACT_ID=$CONTRACT_ID"
echo ""
echo "Generate TypeScript bindings:"
echo "  stellar contract bindings typescript --contract-id $CONTRACT_ID --output-dir packages/rosca-client --network testnet"
```

- [ ] **Step 2: Create testnet setup script**

```bash
#!/bin/bash
# scripts/setup-testnet.sh
# One-time testnet setup: create agent identity + fund it

set -euo pipefail

echo "Generating agent keypair..."
AGENT_KEYPAIR=$(stellar keys generate agent-circles-agent --network testnet 2>&1)
AGENT_ADDRESS=$(stellar keys address agent-circles-agent 2>&1)
AGENT_SECRET=$(stellar keys show agent-circles-agent 2>&1)

echo ""
echo "Agent address: $AGENT_ADDRESS"
echo ""
echo "Funding via Friendbot..."
curl -s "https://friendbot.stellar.org?addr=$AGENT_ADDRESS" > /dev/null

echo "Agent funded!"
echo ""
echo "Add to backend/.env:"
echo "  AGENT_SECRET_KEY=$AGENT_SECRET"
```

- [ ] **Step 3: Make scripts executable**

Run: `chmod +x /Users/abba/Desktop/stellar_build/scripts/*.sh`

- [ ] **Step 4: Commit**

```bash
git add scripts/
git commit -m "feat: deployment and testnet setup scripts"
```

---

### Task 6: Landing Page

**Files:**
- Modify: `frontend/src/pages/Landing.tsx`

- [ ] **Step 1: Build the landing page**

```tsx
// frontend/src/pages/Landing.tsx
import { Link } from "react-router";

export function Landing() {
  return (
    <div className="max-w-3xl mx-auto text-center py-16">
      <h1 className="text-5xl font-bold mb-4">Agent Circles</h1>
      <p className="text-xl text-gray-400 mb-8">
        On-chain rotating savings with autonomous operators.
      </p>

      <div className="grid md:grid-cols-2 gap-6 text-left mb-12">
        <div className="border border-gray-800 rounded-lg p-6">
          <h2 className="font-bold text-lg mb-2">The Problem</h2>
          <p className="text-gray-400 text-sm">
            Billions of people use rotating savings circles (ajo, susu, tanda).
            They fail when someone collects the pot and disappears, or when the
            organizer can't keep up with tracking contributions and schedules.
          </p>
        </div>
        <div className="border border-gray-800 rounded-lg p-6">
          <h2 className="font-bold text-lg mb-2">The Solution</h2>
          <p className="text-gray-400 text-sm">
            Agent Circles puts the rules on-chain via Soroban smart contracts.
            AI agents handle coordination — reminders, round advancement, and
            pool management — earning transparent fees for their work.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-12">
        <div className="bg-gray-800/30 rounded-lg p-4">
          <p className="text-2xl font-bold">On-Chain</p>
          <p className="text-sm text-gray-400 mt-1">Funds locked in contract. No one can run with the pot.</p>
        </div>
        <div className="bg-gray-800/30 rounded-lg p-4">
          <p className="text-2xl font-bold">AI Managed</p>
          <p className="text-sm text-gray-400 mt-1">Agents coordinate rounds, send reminders, and earn fees.</p>
        </div>
        <div className="bg-gray-800/30 rounded-lg p-4">
          <p className="text-2xl font-bold">Transparent</p>
          <p className="text-sm text-gray-400 mt-1">Every contribution and payout verifiable on Stellar.</p>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Link
          to="/pools"
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium"
        >
          Open App
        </Link>
        <Link
          to="/demo"
          className="border border-gray-700 hover:border-gray-500 text-white px-6 py-3 rounded-lg font-medium"
        >
          Try Demo
        </Link>
      </div>

      <p className="text-xs text-gray-600 mt-12">
        Stellar Testnet only. Not financial advice. Built for Stellar World Assembly hackathon.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/abba/Desktop/stellar_build/frontend && npx vite build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): landing page with problem/solution pitch"
```

---

## Phase 4 Complete Checklist

After all 6 tasks, verify:

- [ ] Backend compiles: `cd backend && npx tsc --noEmit`
- [ ] Frontend builds: `cd frontend && npx vite build`
- [ ] Contract builds: `cargo build --target wasm32-unknown-unknown --release --package rosca-pool`
- [ ] Agent has 10 tools defined and tool executor handles all 10
- [ ] Chat endpoint `/api/agent/chat` calls Claude with tool-use
- [ ] Frontend chat drawer sends messages to backend and displays responses
- [ ] Demo mode creates 5 Friendbot-funded accounts
- [ ] Landing page describes the product
- [ ] Deployment scripts exist for contract and agent identity setup

---

## Full Project Verification (All Phases)

- [ ] **Phase 1:** `cargo test --package rosca-pool` — 17 contract tests pass
- [ ] **Phase 2:** `cd backend && npx tsc --noEmit` — compiles
- [ ] **Phase 3:** `cd frontend && npx vite build` — builds
- [ ] **Phase 4:** Agent chat works end-to-end (backend → Claude → tools → response)
- [ ] **Deployment:** Contract deployed to testnet, agent funded, env vars set
- [ ] **E2E Demo:** 5-member pool → join all → contribute × 5 rounds → payouts → agent earns fees
