import type Anthropic from "@anthropic-ai/sdk";

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "list_pools",
    description:
      "List all known pool contract IDs registered in the system. Returns an array of contract IDs.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_pool",
    description:
      "Get detailed information about a specific pool including its config, state, current round, members, and accrued manager fees. Amounts are in stroops (divide by 1,000,000 for USDC).",
    input_schema: {
      type: "object",
      properties: {
        pool_id: {
          type: "string",
          description: "The contract ID of the pool to look up.",
        },
      },
      required: ["pool_id"],
    },
  },
  {
    name: "get_wallet_pools",
    description:
      "Find all pools where a given wallet address is a member. Returns pool IDs and state for each matching pool.",
    input_schema: {
      type: "object",
      properties: {
        wallet_address: {
          type: "string",
          description: "The Stellar wallet address (public key) to search for.",
        },
      },
      required: ["wallet_address"],
    },
  },
  {
    name: "get_fee_summary",
    description:
      "Get the total manager fees accrued across all known pools. Returns total fees in stroops and the number of pools with non-zero fees.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "schedule_reminder",
    description:
      "Schedule a contribution reminder for a pool member. The reminder will fire after the specified number of minutes from now.",
    input_schema: {
      type: "object",
      properties: {
        pool_id: {
          type: "string",
          description: "The contract ID of the pool.",
        },
        member: {
          type: "string",
          description: "The Stellar wallet address of the member to remind.",
        },
        remind_at_minutes: {
          type: "number",
          description: "Number of minutes from now when the reminder should fire.",
        },
        message: {
          type: "string",
          description: "The reminder message text (max 500 characters).",
        },
      },
      required: ["pool_id", "member", "remind_at_minutes", "message"],
    },
  },
  {
    name: "prepare_join",
    description:
      "Start the join flow for a pool. When the user picks a pool to join, call this with that pool_id. If a wallet is connected, builds an unsigned join transaction for them to sign in-app. If not, returns a navigation action to the join page. Does not sign anything server-side.",
    input_schema: {
      type: "object",
      properties: {
        pool_id: {
          type: "string",
          description: "Contract ID of the pool the user wants to join.",
        },
      },
      required: ["pool_id"],
    },
  },
];
