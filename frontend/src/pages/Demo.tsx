import { useState } from "react";
import { api } from "../lib/api";

interface DemoAccount {
  publicKey: string;
  secretKey: string;
  friendbotUrl: string;
  explorerUrl: string;
}

function truncate(s: string, n = 12) {
  return s.slice(0, n) + "…" + s.slice(-6);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-white/[0.06]"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function Demo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ accounts: DemoAccount[]; note: string } | null>(null);

  async function handleSeed() {
    setLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await (api as any).seedDemo?.() ??
        await fetch("/api/demo/seed", { method: "POST" }).then(async (r) => {
          const j = await r.json();
          if (!r.ok) throw new Error(j.error?.message ?? "Failed to seed");
          return j.data;
        });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed demo accounts");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="py-10">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold text-zinc-50 mb-1">Demo Mode</h1>
          <p className="text-zinc-500 text-sm mb-8">
            Generate 5 Friendbot-funded Stellar testnet accounts to explore Agent Circles without real funds.
          </p>

          {!result && (
            <div className="card p-6 mb-6">
              <h2 className="font-medium text-zinc-200 mb-1">Seed Testnet Accounts</h2>
              <p className="text-sm text-zinc-500 leading-relaxed mb-5">
                Clicking the button below will:
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  "Generate 5 fresh Stellar keypairs",
                  "Fund each via Friendbot (10,000 XLM each)",
                  "Return public + secret keys for testing",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-500">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-emerald-500 mt-0.5 flex-shrink-0">
                      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M4.5 7L6.5 9L9.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-4 py-3 text-xs text-amber-400/80 leading-relaxed mb-5">
                Testnet only. Secret keys are shown for demo purposes — never use these on mainnet.
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleSeed}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
                      <path d="M7 1.5C4 1.5 1.5 4 1.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Funding via Friendbot…
                  </>
                ) : (
                  "Generate Demo Accounts"
                )}
              </button>
            </div>
          )}

          {result && (
            <>
              <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-4 py-3 mb-5 flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <p className="text-sm text-emerald-300">5 accounts funded successfully</p>
              </div>

              <div className="space-y-3 mb-6">
                {result.accounts.map((acc, i) => (
                  <div key={acc.publicKey} className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-zinc-400">Account {i + 1}</span>
                      <a
                        href={acc.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1"
                      >
                        View on Explorer
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1.5 7.5L7.5 1.5M4 1.5H7.5V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Public key</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-zinc-300">{truncate(acc.publicKey, 10)}</span>
                          <CopyButton text={acc.publicKey} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Secret key</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-400/80">{truncate(acc.secretKey, 6)}</span>
                          <CopyButton text={acc.secretKey} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-xs text-zinc-500 leading-relaxed mb-5">
                {result.note}
              </div>

              <button
                onClick={() => { setResult(null); setError(null); }}
                className="btn-secondary text-sm"
              >
                Generate New Set
              </button>
            </>
          )}

          {/* Phase 4 upcoming */}
          {!result && (
            <div className="card p-5 mt-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">Coming next in demo mode</h3>
              <ul className="space-y-2">
                {[
                  "One-click pool creation with demo accounts",
                  "Simulated multi-account contribution flow",
                  "Agent-driven automatic round advancement",
                  "Full payout walkthrough end-to-end",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-600">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-zinc-700 mt-0.5 flex-shrink-0">
                      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
