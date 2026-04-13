# Agent Circles — Phase 3: Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Vite + React/TypeScript SPA with wallet connection, pool CRUD screens, transaction signing flow, and agent chat drawer.

**Architecture:** Vite SPA. React Router for navigation. zustand for wallet/app state. @tanstack/react-query for server state (pool data, tx status). @creit-tech/stellar-wallets-kit for multi-wallet support. shadcn/ui + Tailwind for rapid UI. Agent chat via streaming fetch to backend.

**Tech Stack:** Vite 6, React 18, TypeScript, Tailwind CSS, shadcn/ui, zustand, @tanstack/react-query, @creit-tech/stellar-wallets-kit, react-router v7

**Prereqs:** Phase 2 backend running on localhost:3001. Contract deployed to testnet.

---

## File Structure

```
frontend/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── index.html
├── src/
│   ├── main.tsx                        # React root + providers
│   ├── App.tsx                         # Router setup
│   ├── lib/
│   │   ├── api.ts                      # Backend API client (fetch wrapper)
│   │   ├── stellar.ts                  # Wallet kit setup + helpers
│   │   └── utils.ts                    # Formatting, time helpers
│   ├── stores/
│   │   └── wallet-store.ts             # zustand: address, connected, network
│   ├── hooks/
│   │   ├── use-pools.ts                # react-query: list/get pools
│   │   └── use-tx.ts                   # react-query: submit + poll tx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx              # Logo + wallet button + agent toggle
│   │   │   └── AgentDrawer.tsx         # Slide-out chat panel
│   │   ├── wallet/
│   │   │   └── ConnectButton.tsx       # Connect/disconnect + address display
│   │   ├── pool/
│   │   │   ├── PoolCard.tsx            # Pool summary card for list view
│   │   │   ├── MemberList.tsx          # Member table with contribution status
│   │   │   ├── RoundCountdown.tsx      # Countdown timer to round end
│   │   │   └── TxPreview.tsx           # Transaction simulation preview + sign CTA
│   │   └── chat/
│   │       ├── ChatInput.tsx           # Message input
│   │       ├── ChatMessage.tsx         # Single message bubble
│   │       └── TxCard.tsx              # Transaction proposal card in chat
│   ├── pages/
│   │   ├── Landing.tsx                 # S1: Problem/solution + CTA
│   │   ├── Dashboard.tsx               # S3: Pool list
│   │   ├── CreatePool.tsx              # S4: Create pool form
│   │   ├── PoolDetail.tsx              # S5: Pool detail + contribute + payout
│   │   ├── JoinPool.tsx                # S6: Confirm join terms
│   │   └── Demo.tsx                    # S15: Demo mode seeder
│   └── styles/
│       └── globals.css                 # Tailwind base + custom vars
```

---

### Task 1: Scaffold Vite + React + Tailwind Project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/styles/globals.css`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "agent-circles-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router": "^7.0.0",
    "@tanstack/react-query": "^5.60.0",
    "zustand": "^5.0.0",
    "@stellar/stellar-sdk": "^13.0.0",
    "@creit-tech/stellar-wallets-kit": "^1.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

```typescript
// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  define: {
    global: "globalThis",
  },
});
```

- [ ] **Step 3: Create tailwind.config.ts**

```typescript
// frontend/tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agent Circles — On-Chain Rotating Savings</title>
  </head>
  <body class="bg-gray-950 text-gray-100">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create globals.css**

```css
/* frontend/src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

- [ ] **Step 7: Create main.tsx**

```tsx
// frontend/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchInterval: 15_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 8: Create App.tsx with routes**

```tsx
// frontend/src/App.tsx
import { Routes, Route } from "react-router";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { CreatePool } from "./pages/CreatePool";
import { PoolDetail } from "./pages/PoolDetail";
import { JoinPool } from "./pages/JoinPool";
import { Demo } from "./pages/Demo";
import { Header } from "./components/layout/Header";

export function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pools" element={<Dashboard />} />
          <Route path="/pools/create" element={<CreatePool />} />
          <Route path="/pools/:id" element={<PoolDetail />} />
          <Route path="/pools/:id/join" element={<JoinPool />} />
          <Route path="/demo" element={<Demo />} />
        </Routes>
      </main>
    </div>
  );
}
```

- [ ] **Step 9: Create placeholder pages**

Create each page as a simple placeholder:

```tsx
// frontend/src/pages/Landing.tsx
export function Landing() {
  return <div><h1 className="text-4xl font-bold">Agent Circles</h1><p className="mt-4 text-gray-400">On-chain rotating savings with autonomous operators.</p></div>;
}
```

```tsx
// frontend/src/pages/Dashboard.tsx
export function Dashboard() {
  return <div><h1 className="text-2xl font-bold">Your Pools</h1></div>;
}
```

```tsx
// frontend/src/pages/CreatePool.tsx
export function CreatePool() {
  return <div><h1 className="text-2xl font-bold">Create Pool</h1></div>;
}
```

```tsx
// frontend/src/pages/PoolDetail.tsx
export function PoolDetail() {
  return <div><h1 className="text-2xl font-bold">Pool Detail</h1></div>;
}
```

```tsx
// frontend/src/pages/JoinPool.tsx
export function JoinPool() {
  return <div><h1 className="text-2xl font-bold">Join Pool</h1></div>;
}
```

```tsx
// frontend/src/pages/Demo.tsx
export function Demo() {
  return <div><h1 className="text-2xl font-bold">Demo Mode</h1></div>;
}
```

```tsx
// frontend/src/components/layout/Header.tsx
import { Link } from "react-router";

export function Header() {
  return (
    <header className="border-b border-gray-800 px-4 py-3">
      <div className="container mx-auto max-w-5xl flex items-center justify-between">
        <Link to="/" className="text-xl font-bold">Agent Circles</Link>
        <nav className="flex gap-4 text-sm text-gray-400">
          <Link to="/pools" className="hover:text-white">Pools</Link>
          <Link to="/demo" className="hover:text-white">Demo</Link>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 10: Install dependencies and verify**

Run: `cd /Users/abba/Desktop/stellar_build/frontend && npm install && npx vite build`
Expected: Build succeeds.

- [ ] **Step 11: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): scaffold Vite + React + Tailwind with routing"
```

---

### Task 2: Wallet Store + Connect Button

**Files:**
- Create: `frontend/src/lib/stellar.ts`
- Create: `frontend/src/stores/wallet-store.ts`
- Create: `frontend/src/components/wallet/ConnectButton.tsx`
- Modify: `frontend/src/components/layout/Header.tsx`

- [ ] **Step 1: Create stellar.ts wallet kit setup**

```typescript
// frontend/src/lib/stellar.ts
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from "@creit-tech/stellar-wallets-kit";

let kit: StellarWalletsKit | null = null;

export function getWalletKit(): StellarWalletsKit {
  if (!kit) {
    kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }
  return kit;
}

export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const EXPLORER_URL = "https://stellar.expert/explorer/testnet";

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
```

- [ ] **Step 2: Create wallet zustand store**

```typescript
// frontend/src/stores/wallet-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WalletState {
  address: string | null;
  connected: boolean;
  connect: (address: string) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: null,
      connected: false,
      connect: (address: string) => set({ address, connected: true }),
      disconnect: () => set({ address: null, connected: false }),
    }),
    { name: "agent-circles-wallet" },
  ),
);
```

- [ ] **Step 3: Create ConnectButton**

```tsx
// frontend/src/components/wallet/ConnectButton.tsx
import { useCallback } from "react";
import { useWalletStore } from "../../stores/wallet-store";
import { getWalletKit, shortenAddress } from "../../lib/stellar";

export function ConnectButton() {
  const { address, connected, connect, disconnect } = useWalletStore();

  const handleConnect = useCallback(async () => {
    try {
      const kit = getWalletKit();
      await kit.openModal({
        onWalletSelected: async (option) => {
          kit.setWallet(option.id);
          const { address: addr } = await kit.getAddress();
          connect(addr);
        },
      });
    } catch (err) {
      console.error("Wallet connect failed:", err);
    }
  }, [connect]);

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  if (connected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono bg-gray-800 px-3 py-1 rounded">
          {shortenAddress(address)}
        </span>
        <button
          onClick={handleDisconnect}
          className="text-sm text-gray-400 hover:text-white"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg font-medium"
    >
      Connect Wallet
    </button>
  );
}
```

- [ ] **Step 4: Update Header to include ConnectButton**

```tsx
// frontend/src/components/layout/Header.tsx
import { Link } from "react-router";
import { ConnectButton } from "../wallet/ConnectButton";

export function Header() {
  return (
    <header className="border-b border-gray-800 px-4 py-3">
      <div className="container mx-auto max-w-5xl flex items-center justify-between">
        <Link to="/" className="text-xl font-bold">Agent Circles</Link>
        <nav className="flex items-center gap-6">
          <Link to="/pools" className="text-sm text-gray-400 hover:text-white">Pools</Link>
          <Link to="/demo" className="text-sm text-gray-400 hover:text-white">Demo</Link>
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Verify build**

Run: `cd /Users/abba/Desktop/stellar_build/frontend && npx vite build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): wallet connection with stellar-wallets-kit + zustand"
```

---

### Task 3: API Client + React Query Hooks

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/hooks/use-pools.ts`
- Create: `frontend/src/hooks/use-tx.ts`

- [ ] **Step 1: Create API client**

```typescript
// frontend/src/lib/api.ts
const API_BASE = "/api";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new ApiError(
      json.error?.code ?? "unknown",
      json.error?.message ?? "Request failed",
      res.status,
    );
  }

  return json.data as T;
}

// --- Pool endpoints ---

export interface Pool {
  contract_id: string;
  admin: string;
  token: string;
  contribution: number;
  round_period: number;
  start_time: number | null;
  max_members: number;
  manager: string;
  fee_bps: number;
  state: string;
  current_round: number;
  updated_at: number;
}

export interface PoolMember {
  contract_id: string;
  member: string;
  position: number;
}

export interface PoolDetail extends Pool {
  members: PoolMember[];
}

export interface TxBuildResult {
  unsignedXdr: string;
  simulationResult: { minResourceFee: string; transactionData: string };
}

export interface TxSubmitResult {
  hash: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  ledger?: number;
  error?: string;
}

export const api = {
  listPools: () => request<Pool[]>("/pools"),
  getPool: (id: string) => request<PoolDetail>(`/pools/${id}`),
  buildCreatePool: (body: Record<string, unknown>) =>
    request<TxBuildResult>("/pools", { method: "POST", body: JSON.stringify(body) }),
  buildJoin: (poolId: string, member: string) =>
    request<TxBuildResult>(`/pools/${poolId}/join`, { method: "POST", body: JSON.stringify({ member }) }),
  buildContribute: (poolId: string, member: string) =>
    request<TxBuildResult>(`/pools/${poolId}/contribute`, { method: "POST", body: JSON.stringify({ member }) }),
  buildAdvance: (poolId: string) =>
    request<TxBuildResult>(`/pools/${poolId}/advance`, { method: "POST" }),
  submitTx: (signedXdr: string) =>
    request<TxSubmitResult>("/tx/submit", { method: "POST", body: JSON.stringify({ signed_xdr: signedXdr }) }),
  getTxStatus: (hash: string) =>
    request<{ status: string; ledger?: number }>(`/tx/${hash}`),
};
```

- [ ] **Step 2: Create utils**

```typescript
// frontend/src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsdc(stroops: number): string {
  return (stroops / 1_000_000).toFixed(2);
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function stateLabel(state: string): string {
  const labels: Record<string, string> = {
    setup: "Waiting for members",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[state] ?? state;
}

export function stateColor(state: string): string {
  const colors: Record<string, string> = {
    setup: "bg-yellow-500/20 text-yellow-400",
    active: "bg-green-500/20 text-green-400",
    completed: "bg-blue-500/20 text-blue-400",
    cancelled: "bg-red-500/20 text-red-400",
  };
  return colors[state] ?? "bg-gray-500/20 text-gray-400";
}
```

- [ ] **Step 3: Create use-pools hook**

```typescript
// frontend/src/hooks/use-pools.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function usePools() {
  return useQuery({
    queryKey: ["pools"],
    queryFn: api.listPools,
  });
}

export function usePool(id: string) {
  return useQuery({
    queryKey: ["pool", id],
    queryFn: () => api.getPool(id),
    enabled: !!id,
    refetchInterval: 10_000,
  });
}
```

- [ ] **Step 4: Create use-tx hook**

```typescript
// frontend/src/hooks/use-tx.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getWalletKit, NETWORK_PASSPHRASE } from "../lib/stellar";

export function useSubmitTx() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (unsignedXdr: string) => {
      const kit = getWalletKit();
      const { signedTxXdr } = await kit.signTransaction(unsignedXdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      return api.submitTx(signedTxXdr);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pools"] });
    },
  });
}
```

- [ ] **Step 5: Verify build**

Run: `cd /Users/abba/Desktop/stellar_build/frontend && npx vite build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): API client, react-query hooks, tx signing flow"
```

---

### Task 4: Pool List + Pool Card

**Files:**
- Create: `frontend/src/components/pool/PoolCard.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Create PoolCard**

```tsx
// frontend/src/components/pool/PoolCard.tsx
import { Link } from "react-router";
import type { Pool } from "../../lib/api";
import { formatUsdc, stateLabel, stateColor, cn } from "../../lib/utils";

interface PoolCardProps {
  pool: Pool;
}

export function PoolCard({ pool }: PoolCardProps) {
  return (
    <Link
      to={`/pools/${pool.contract_id}`}
      className="block border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-sm text-gray-500">
          {pool.contract_id.slice(0, 8)}...
        </span>
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", stateColor(pool.state))}>
          {stateLabel(pool.state)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Contribution</span>
          <p className="font-medium">{formatUsdc(pool.contribution)} USDC</p>
        </div>
        <div>
          <span className="text-gray-500">Round</span>
          <p className="font-medium">{pool.current_round} / {pool.max_members}</p>
        </div>
        <div>
          <span className="text-gray-500">Members</span>
          <p className="font-medium">? / {pool.max_members}</p>
        </div>
        <div>
          <span className="text-gray-500">Fee</span>
          <p className="font-medium">{(pool.fee_bps / 100).toFixed(1)}%</p>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Build Dashboard page**

```tsx
// frontend/src/pages/Dashboard.tsx
import { Link } from "react-router";
import { usePools } from "../hooks/use-pools";
import { PoolCard } from "../components/pool/PoolCard";
import { useWalletStore } from "../stores/wallet-store";

export function Dashboard() {
  const { data: pools, isLoading, error } = usePools();
  const { connected } = useWalletStore();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Pools</h1>
        {connected && (
          <Link
            to="/pools/create"
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg font-medium"
          >
            Create Pool
          </Link>
        )}
      </div>

      {!connected && (
        <p className="text-gray-500">Connect your wallet to view and manage pools.</p>
      )}

      {isLoading && <p className="text-gray-500">Loading pools...</p>}

      {error && (
        <p className="text-red-400">Failed to load pools: {(error as Error).message}</p>
      )}

      {pools && pools.length === 0 && (
        <p className="text-gray-500">No pools yet. Create one or check out the Demo.</p>
      )}

      {pools && pools.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {pools.map((pool) => (
            <PoolCard key={pool.contract_id} pool={pool} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/abba/Desktop/stellar_build/frontend && npx vite build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): pool list dashboard with PoolCard component"
```

---

### Task 5: Create Pool Form

**Files:**
- Modify: `frontend/src/pages/CreatePool.tsx`

- [ ] **Step 1: Build the create pool form**

```tsx
// frontend/src/pages/CreatePool.tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import { useWalletStore } from "../stores/wallet-store";
import { api } from "../lib/api";
import { useSubmitTx } from "../hooks/use-tx";

const PERIOD_OPTIONS = [
  { label: "1 minute (demo)", value: 60 },
  { label: "1 hour", value: 3600 },
  { label: "1 day", value: 86400 },
  { label: "1 week", value: 604800 },
];

export function CreatePool() {
  const { address } = useWalletStore();
  const navigate = useNavigate();
  const submitTx = useSubmitTx();

  const [contribution, setContribution] = useState("10");
  const [period, setPeriod] = useState(60);
  const [maxMembers, setMaxMembers] = useState(5);
  const [feeBps, setFeeBps] = useState(200);
  const [managerSelf, setManagerSelf] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!address) {
    return <p className="text-gray-500">Connect your wallet to create a pool.</p>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await api.buildCreatePool({
        admin: address,
        contribution_amount: Math.round(parseFloat(contribution) * 1_000_000),
        round_period: period,
        max_members: maxMembers,
        manager: managerSelf ? address : address, // TODO: agent address option
        manager_fee_bps: feeBps,
      });

      const txResult = await submitTx.mutateAsync(result.unsignedXdr);

      if (txResult.status === "SUCCESS") {
        navigate("/pools");
      } else {
        setError(`Transaction failed: ${txResult.error ?? txResult.status}`);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to create pool");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Create Pool</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Contribution per round (USDC)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={contribution}
            onChange={(e) => setContribution(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Round period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Max members (2-20)</label>
          <input
            type="number"
            min={2}
            max={20}
            value={maxMembers}
            onChange={(e) => setMaxMembers(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Manager fee: {(feeBps / 100).toFixed(1)}%</label>
          <input
            type="range"
            min={0}
            max={500}
            step={50}
            value={feeBps}
            onChange={(e) => setFeeBps(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={managerSelf}
            onChange={(e) => setManagerSelf(e.target.checked)}
            id="manager-self"
          />
          <label htmlFor="manager-self" className="text-sm text-gray-400">I am the manager</label>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg font-medium"
        >
          {loading ? "Creating..." : "Create Pool"}
        </button>
      </form>
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
git commit -m "feat(frontend): create pool form with tx signing"
```

---

### Task 6: Pool Detail + Contribute Flow

**Files:**
- Create: `frontend/src/components/pool/MemberList.tsx`
- Create: `frontend/src/components/pool/RoundCountdown.tsx`
- Modify: `frontend/src/pages/PoolDetail.tsx`

- [ ] **Step 1: Create MemberList**

```tsx
// frontend/src/components/pool/MemberList.tsx
import type { PoolMember } from "../../lib/api";
import { shortenAddress } from "../../lib/stellar";

interface MemberListProps {
  members: PoolMember[];
  currentRound: number;
}

export function MemberList({ members, currentRound }: MemberListProps) {
  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-800/50">
          <tr>
            <th className="text-left px-4 py-2 text-gray-400">#</th>
            <th className="text-left px-4 py-2 text-gray-400">Address</th>
            <th className="text-left px-4 py-2 text-gray-400">Payout Round</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr
              key={m.member}
              className={m.position === currentRound ? "bg-green-500/10" : ""}
            >
              <td className="px-4 py-2">{m.position + 1}</td>
              <td className="px-4 py-2 font-mono">{shortenAddress(m.member)}</td>
              <td className="px-4 py-2">
                {m.position === currentRound ? (
                  <span className="text-green-400 font-medium">Current recipient</span>
                ) : m.position < currentRound ? (
                  <span className="text-gray-500">Received</span>
                ) : (
                  <span className="text-gray-400">Round {m.position + 1}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create RoundCountdown**

```tsx
// frontend/src/components/pool/RoundCountdown.tsx
import { useState, useEffect } from "react";
import { formatCountdown } from "../../lib/utils";

interface RoundCountdownProps {
  startTime: number;
  roundPeriod: number;
  currentRound: number;
}

export function RoundCountdown({ startTime, roundPeriod, currentRound }: RoundCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    function calculate() {
      const roundEnd = startTime + roundPeriod * (currentRound + 1);
      const now = Math.floor(Date.now() / 1000);
      setSecondsLeft(Math.max(0, roundEnd - now));
    }
    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [startTime, roundPeriod, currentRound]);

  return (
    <div className="text-center">
      <p className="text-gray-400 text-sm">Round ends in</p>
      <p className="text-3xl font-bold font-mono">{formatCountdown(secondsLeft)}</p>
    </div>
  );
}
```

- [ ] **Step 3: Build PoolDetail page**

```tsx
// frontend/src/pages/PoolDetail.tsx
import { useParams } from "react-router";
import { usePool } from "../hooks/use-pools";
import { useWalletStore } from "../stores/wallet-store";
import { useSubmitTx } from "../hooks/use-tx";
import { api } from "../lib/api";
import { MemberList } from "../components/pool/MemberList";
import { RoundCountdown } from "../components/pool/RoundCountdown";
import { formatUsdc, stateLabel, stateColor, cn } from "../lib/utils";
import { explorerTxUrl } from "../lib/stellar";
import { useState } from "react";

export function PoolDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: pool, isLoading } = usePool(id!);
  const { address } = useWalletStore();
  const submitTx = useSubmitTx();
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  if (isLoading) return <p className="text-gray-500">Loading pool...</p>;
  if (!pool) return <p className="text-red-400">Pool not found</p>;

  async function handleContribute() {
    if (!address || !id) return;
    setTxStatus("Building transaction...");
    try {
      const result = await api.buildContribute(id, address);
      setTxStatus("Please sign in your wallet...");
      const txResult = await submitTx.mutateAsync(result.unsignedXdr);
      if (txResult.status === "SUCCESS") {
        setTxStatus("Contribution confirmed!");
        setTxHash(txResult.hash);
      } else {
        setTxStatus(`Failed: ${txResult.error ?? txResult.status}`);
      }
    } catch (err: any) {
      setTxStatus(`Error: ${err.message}`);
    }
  }

  const isMember = pool.members.some((m) => m.member === address);
  const isActive = pool.state === "active";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">{pool.contract_id.slice(0, 12)}...</h1>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block", stateColor(pool.state))}>
            {stateLabel(pool.state)}
          </span>
        </div>
        {isActive && pool.start_time && (
          <RoundCountdown
            startTime={pool.start_time}
            roundPeriod={pool.round_period}
            currentRound={pool.current_round}
          />
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Contribution</p>
          <p className="text-lg font-bold">{formatUsdc(pool.contribution)} USDC</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Round</p>
          <p className="text-lg font-bold">{pool.current_round + 1} / {pool.max_members}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Members</p>
          <p className="text-lg font-bold">{pool.members.length} / {pool.max_members}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Manager Fee</p>
          <p className="text-lg font-bold">{(pool.fee_bps / 100).toFixed(1)}%</p>
        </div>
      </div>

      <MemberList members={pool.members} currentRound={pool.current_round} />

      {isActive && isMember && (
        <div className="border border-gray-800 rounded-lg p-4">
          <h2 className="font-bold mb-2">Contribute</h2>
          <p className="text-sm text-gray-400 mb-3">
            Pay {formatUsdc(pool.contribution)} USDC for round {pool.current_round + 1}
          </p>
          <button
            onClick={handleContribute}
            disabled={submitTx.isPending}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium"
          >
            {submitTx.isPending ? "Signing..." : "Contribute"}
          </button>
          {txStatus && <p className="text-sm mt-2 text-gray-400">{txStatus}</p>}
          {txHash && (
            <a
              href={explorerTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:underline mt-1 block"
            >
              View on Explorer
            </a>
          )}
        </div>
      )}

      {pool.state === "setup" && !isMember && address && (
        <a
          href={`/pools/${pool.contract_id}/join`}
          className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium"
        >
          Join Pool
        </a>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `cd /Users/abba/Desktop/stellar_build/frontend && npx vite build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): pool detail page with contribute flow and countdown"
```

---

### Task 7: Agent Chat Drawer

**Files:**
- Create: `frontend/src/components/chat/ChatInput.tsx`
- Create: `frontend/src/components/chat/ChatMessage.tsx`
- Create: `frontend/src/components/layout/AgentDrawer.tsx`
- Modify: `frontend/src/components/layout/Header.tsx`

- [ ] **Step 1: Create ChatMessage**

```tsx
// frontend/src/components/chat/ChatMessage.tsx
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
```

- [ ] **Step 2: Create ChatInput**

```tsx
// frontend/src/components/chat/ChatInput.tsx
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

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask the agent..."
        disabled={disabled}
        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
      >
        Send
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create AgentDrawer**

```tsx
// frontend/src/components/layout/AgentDrawer.tsx
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
      content: "Hi! I'm your Agent Circles assistant. I can help you create pools, check your status, contribute, and explain how savings circles work. What would you like to do?",
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
      // For now, echo a placeholder response
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
```

- [ ] **Step 4: Update Header with agent toggle**

```tsx
// frontend/src/components/layout/Header.tsx
import { useState } from "react";
import { Link } from "react-router";
import { ConnectButton } from "../wallet/ConnectButton";
import { AgentDrawer } from "./AgentDrawer";

export function Header() {
  const [agentOpen, setAgentOpen] = useState(false);

  return (
    <>
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="container mx-auto max-w-5xl flex items-center justify-between">
          <Link to="/" className="text-xl font-bold">Agent Circles</Link>
          <nav className="flex items-center gap-6">
            <Link to="/pools" className="text-sm text-gray-400 hover:text-white">Pools</Link>
            <Link to="/demo" className="text-sm text-gray-400 hover:text-white">Demo</Link>
            <button
              onClick={() => setAgentOpen(!agentOpen)}
              className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg"
            >
              Agent
            </button>
            <ConnectButton />
          </nav>
        </div>
      </header>
      <AgentDrawer open={agentOpen} onClose={() => setAgentOpen(false)} />
    </>
  );
}
```

- [ ] **Step 5: Verify build**

Run: `cd /Users/abba/Desktop/stellar_build/frontend && npx vite build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): agent chat drawer with message UI"
```

---

## Phase 3 Complete Checklist

After all 7 tasks, verify:

- [ ] `cd frontend && npx vite build` — builds clean
- [ ] Routes working: /, /pools, /pools/create, /pools/:id, /pools/:id/join, /demo
- [ ] Wallet connect/disconnect works with stellar-wallets-kit
- [ ] Pool list fetches from backend and renders cards
- [ ] Create pool form builds tx and requests wallet signature
- [ ] Pool detail shows members, countdown, contribute button
- [ ] Agent drawer opens/closes and accepts messages (placeholder responses)
- [ ] All state management: zustand (wallet), react-query (pools, tx)
