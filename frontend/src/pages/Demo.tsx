import { useMemo, useState } from "react";
import { ApiError, api, type DemoRunResult, type DemoSeedResult } from "../lib/api";

function truncate(s: string, n = 12) {
  return s.slice(0, n) + "…" + s.slice(-6);
}

function prettifyStepName(step: string): string {
  if (step === "fund_accounts") return "Funded 5 demo accounts";
  if (step === "advance_round") return "Advanced round and processed payout";

  const joinMatch = step.match(/^join_member_(\d+)$/);
  if (joinMatch) {
    return `Member ${Number(joinMatch[1]) + 1} joined the pool`;
  }

  const contributeMatch = step.match(/^contribute_member_(\d+)$/);
  if (contributeMatch) {
    return `Member ${Number(contributeMatch[1]) + 1} made their contribution`;
  }

  return step.replace(/_/g, " ");
}

function prettifyStepDetail(step: string, detail?: string): string | undefined {
  if (!detail) return undefined;
  if (step === "fund_accounts") return "Generated new testnet wallets and funded them with Friendbot.";
  if (/^join_member_\d+$/.test(step)) return detail.replace(/^Member (\d+)/, (_, m) => `Member ${Number(m) + 1}`);
  if (/^contribute_member_\d+$/.test(step)) {
    return detail.replace(/^Member (\d+)/, (_, m) => `Member ${Number(m) + 1}`);
  }
  return detail;
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
  const [seedLoading, setSeedLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedResult, setSeedResult] = useState<DemoSeedResult | null>(null);
  const [runResult, setRunResult] = useState<DemoRunResult | null>(null);

  async function handleSeed() {
    setSeedLoading(true);
    setError(null);
    try {
      const data = await api.seedDemo();
      setSeedResult(data);
      setRunResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed demo accounts");
    } finally {
      setSeedLoading(false);
    }
  }

  async function handleRunDemo() {
    setRunLoading(true);
    setError(null);
    try {
      const data = await api.runDemo();
      setRunResult(data);
      if (!seedResult) {
        setSeedResult({
          accounts: data.accounts,
          note: "Accounts were generated as part of the full demo run.",
        });
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === "demo_contract_not_configured") {
        setError("Demo contract is not configured on the backend. Set DEMO_CONTRACT_ID and rerun.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to run full demo");
      }
    } finally {
      setRunLoading(false);
    }
  }

  const stepStats = useMemo(() => {
    const steps = runResult?.steps ?? [];
    return {
      total: steps.length,
      success: steps.filter((s) => s.status === "success").length,
      failed: steps.filter((s) => s.status === "failed").length,
      skipped: steps.filter((s) => s.status === "skipped").length,
    };
  }, [runResult]);

  return (
    <div className="py-10">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold text-zinc-50 mb-1">Demo Mode</h1>
          <p className="text-zinc-500 text-sm mb-8">
            Guided story mode for judge demos, plus advanced controls for manual reruns.
          </p>

          <div className="card p-6 mb-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="font-medium text-zinc-200 mb-1">Story Mode (Recommended)</h2>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  End-to-end scripted walkthrough: seed accounts, execute joins and contributions, then advance a round.
                </p>
              </div>
              <span className="text-[11px] px-2 py-1 rounded-md bg-brand-500/10 border border-brand-500/25 text-brand-300">
                Demo day flow
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <p className="text-xs font-medium text-zinc-300 mb-1">Step 1</p>
                <p className="text-sm text-zinc-500">Generate and fund 5 Stellar testnet accounts.</p>
                <button
                  onClick={handleSeed}
                  disabled={seedLoading || runLoading}
                  className="btn-secondary mt-3 text-sm"
                >
                  {seedLoading ? "Funding accounts..." : seedResult ? "Reseed Accounts" : "Seed Accounts"}
                </button>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <p className="text-xs font-medium text-zinc-300 mb-1">Step 2</p>
                <p className="text-sm text-zinc-500">Run full on-chain flow on configured `DEMO_CONTRACT_ID`.</p>
                <button
                  onClick={handleRunDemo}
                  disabled={runLoading || seedLoading}
                  className="btn-primary mt-3 text-sm"
                >
                  {runLoading ? "Running full demo..." : "Run Full Demo"}
                </button>
              </div>
            </div>

            <ul className="space-y-2">
              {[
                "Generates and funds 5 fresh keypairs",
                "Submits join and contribution transactions",
                "Advances one round and returns tx hashes",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-500">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-emerald-500 mt-0.5 flex-shrink-0">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M4.5 7L6.5 9L9.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-4 py-3 text-xs text-amber-400/80 leading-relaxed mt-5">
              Testnet only. Secret keys are shown for demo purposes — never use or share these on mainnet.
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {runResult && (
            <div className="card p-6 mb-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-medium text-zinc-200">Run Results</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Contract: <span className="font-mono text-zinc-400">{truncate(runResult.contractId, 12)}</span>
                  </p>
                </div>
                <span className="text-[11px] px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  {stepStats.success}/{stepStats.total} success
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                  <p className="text-[11px] text-zinc-500">Success</p>
                  <p className="text-sm font-medium text-emerald-300">{stepStats.success}</p>
                </div>
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                  <p className="text-[11px] text-zinc-500">Failed</p>
                  <p className="text-sm font-medium text-red-300">{stepStats.failed}</p>
                </div>
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                  <p className="text-[11px] text-zinc-500">Skipped</p>
                  <p className="text-sm font-medium text-zinc-300">{stepStats.skipped}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {runResult.steps.map((step) => (
                  <div key={`${step.step}-${step.txHash ?? "nohash"}`} className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-zinc-300">{prettifyStepName(step.step)}</p>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-md border ${
                          step.status === "success"
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                            : step.status === "failed"
                              ? "border-red-500/25 bg-red-500/10 text-red-300"
                              : "border-zinc-500/25 bg-zinc-500/10 text-zinc-300"
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                    {prettifyStepDetail(step.step, step.detail) && (
                      <p className="text-xs text-zinc-500 mt-1">{prettifyStepDetail(step.step, step.detail)}</p>
                    )}
                    {step.txHash && (
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${step.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors inline-flex items-center gap-1 mt-2"
                      >
                        View tx
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1.5 7.5L7.5 1.5M4 1.5H7.5V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-zinc-500">{runResult.summary}</p>
            </div>
          )}

          {seedResult && (
            <div className="card p-6 mb-6">
              <h3 className="text-sm font-medium text-zinc-200 mb-1">Demo Accounts</h3>
              <p className="text-xs text-zinc-500 mb-4">{seedResult.note}</p>
              <div className="space-y-3">
                {seedResult.accounts.map((acc, i) => (
                  <div key={acc.publicKey} className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
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
                          <path d="M1.5 7.5L7.5 1.5M4 1.5H7.5V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
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
            </div>
          )}

          <details className="card p-6">
            <summary className="text-sm font-medium text-zinc-300 cursor-pointer select-none">
              Advanced Controls
            </summary>
            <p className="text-xs text-zinc-500 mt-2 mb-4">
              Manual controls for rehearsals, repeated runs, and debugging.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSeed}
                disabled={seedLoading || runLoading}
                className="btn-secondary text-sm"
              >
                {seedLoading ? "Seeding..." : "Reseed accounts"}
              </button>
              <button
                onClick={handleRunDemo}
                disabled={runLoading || seedLoading}
                className="btn-secondary text-sm"
              >
                {runLoading ? "Running..." : "Run full demo now"}
              </button>
              <button
                onClick={() => {
                  setSeedResult(null);
                  setRunResult(null);
                  setError(null);
                }}
                className="btn-secondary text-sm"
              >
                Clear results
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
