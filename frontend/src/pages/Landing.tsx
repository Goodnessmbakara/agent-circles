import { Link } from "react-router";

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Rotating Payouts",
    description:
      "Each member takes turns receiving the full pooled payout. Everyone contributes equally, everyone wins on their round.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 6.5V10.5L12.5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="10" cy="10" r="2" fill="currentColor" opacity="0.3"/>
      </svg>
    ),
    title: "Autonomous Operations",
    description:
      "On-chain agents advance rounds automatically when all contributions are received — no trusted third party required.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2.5" y="5.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6.5 5.5V3.5C6.5 3 7 2.5 7.5 2.5H12.5C13 2.5 13.5 3 13.5 3.5V5.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2.5 9.5H17.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    title: "Fully On-Chain",
    description:
      "Built on Stellar Soroban. Every deposit, payout, and state change is verifiable on-chain — no custodians, no middlemen.",
  },
];

const stats = [
  { label: "Total Value Locked", value: "$2.4M" },
  { label: "Active Circles", value: "148" },
  { label: "Payouts Completed", value: "1,203" },
  { label: "Avg. APY Equivalent", value: "20%" },
];

export function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="relative pt-24 pb-20 text-center overflow-hidden">
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
          style={{
            background:
              "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(99,102,241,0.14) 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-3xl px-5">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-zinc-50 leading-[1.1] mb-5">
            Savings circles,{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              on-chain
            </span>
          </h1>

          <p className="text-lg text-zinc-400 leading-relaxed mb-8 max-w-xl mx-auto">
            Agent Circles brings the traditional rotating savings model (ROSCA) to Stellar.
            Join a circle, contribute each round, and receive the pooled payout when it's your turn.
          </p>

          <div className="flex items-center gap-3 justify-center">
            <Link to="/pools" className="btn-primary px-7 py-3 text-sm">
              Browse Pools
            </Link>
            <Link to="/demo" className="btn-secondary px-7 py-3 text-sm">
              Try Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-6">
        <div className="mx-auto max-w-6xl px-5">
          <div className="rounded-2xl border border-white/[0.06] bg-[#111113]/60 px-4 py-5 md:px-0 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 md:divide-x md:divide-white/[0.06]">
            {stats.map((s) => (
              <div key={s.label} className="text-center md:px-8">
                <div className="text-2xl font-bold tabular-nums text-zinc-50">{s.value}</div>
                <div className="text-xs text-zinc-500 mt-0.5 tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-3">How it works</h2>
            <p className="text-zinc-500 max-w-md mx-auto text-sm leading-relaxed">
              A savings circle pools contributions from all members each round and sends the full
              pot to one member — rotating until everyone has received it.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className="card p-6">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-zinc-100 mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-5">
          <div
            className="rounded-2xl border border-brand-500/20 p-10 text-center"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(99,102,241,0.08) 0%, transparent 70%)",
            }}
          >
            <h2 className="text-2xl font-semibold text-zinc-100 mb-3">
              Ready to start saving?
            </h2>
            <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">
              Connect your Stellar wallet and join an existing circle or create your own.
            </p>
            <Link to="/pools" className="btn-primary">
              View Open Circles
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
