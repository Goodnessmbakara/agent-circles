export function Demo() {
  return (
    <div className="py-10">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-lg">
          <h1 className="text-2xl font-semibold text-zinc-50 mb-1">Demo Mode</h1>
          <p className="text-zinc-500 text-sm mb-6">
            Testnet sandbox with Friendbot-funded accounts — coming in Phase 4.
          </p>

          <div className="card p-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-amber-400">
                <path d="M9 2L10.5 7H16L11.5 10.5L13 16L9 12.5L5 16L6.5 10.5L2 7H7.5L9 2Z"
                  stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
            </div>

            <h2 className="font-medium text-zinc-200 mb-1">Phase 4 Preview</h2>
            <p className="text-sm text-zinc-500 leading-relaxed mb-4">
              Demo mode will let you explore Agent Circles without real funds. We'll automatically
              fund testnet accounts via Friendbot and seed a full round of activity.
            </p>

            <ul className="space-y-2">
              {[
                "Automatic testnet account funding via Friendbot",
                "Pool seeding with realistic multi-account simulation",
                "Agent-driven round advancement",
                "Full contribution + payout flow walkthrough",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-500">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-zinc-600 mt-0.5 flex-shrink-0">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M4.5 7L6.5 9L9.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
