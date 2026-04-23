import { Link } from "react-router";
import { WaitlistForm } from "../components/layout/WaitlistForm";

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
    <div className="bg-zinc-950 min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-24 text-center overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-20 blur-[120px] rounded-full"
               style={{ background: "radial-gradient(circle, #8B5CF6 0%, #6366F1 50%, transparent 100%)" }} />
          <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] opacity-10 blur-[80px] rounded-full bg-[#FACC15] animate-pulse-slow" />
        </div>

        <div className="relative mx-auto max-w-4xl px-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-bold uppercase tracking-widest mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Live on Stellar Soroban
          </div>
          
          <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tighter text-white leading-[1.05] mb-8">
            The next generation of{" "}
            <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-gradient-x">
              Social Savings
              <svg className="absolute -bottom-2 left-0 w-full h-2 text-indigo-500/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q25 0 50 5 T100 5" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </span>
          </h1>

          <p className="text-xl text-zinc-400 leading-relaxed mb-10 max-w-2xl mx-auto font-medium">
            Agent Circles automates traditional ROSCAs using on-chain agents. 
            Contribute together, grow together, and build trust without middlemen.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <Link to="/pools" className="btn-primary w-full sm:w-auto min-w-[200px]">
              Explore Circles
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="ml-1">
                <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link to="/demo" className="btn-secondary w-full sm:w-auto min-w-[200px]">
              Try the Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar with Solar Yellow highlights */}
      <section className="relative z-10 -mt-12 mb-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="rounded-[2rem] border border-white/[0.08] bg-zinc-900/50 backdrop-blur-xl p-8 md:p-12 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 shadow-2xl relative overflow-hidden group">
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            
            {stats.map((s, idx) => (
              <div key={s.label} className="relative group/stat text-center md:text-left md:px-6">
                <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1 group-hover/stat:text-indigo-400 transition-colors">
                  {s.label}
                </div>
                <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter flex items-center justify-center md:justify-start gap-2">
                  {s.value}
                  {idx === 3 && <span className="w-2 h-2 rounded-full bg-[#FACC15] shadow-[0_0_10px_#FACC15]" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works / Features Showcase */}
      <section className="py-32 relative">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center mb-24">
            <h2 className="text-5xl font-extrabold text-white tracking-tighter mb-4">
              Automated . Social . Secure
            </h2>
            <div className="h-1.5 w-24 bg-indigo-500 mx-auto rounded-full" />
          </div>

          <div className="space-y-32">
            {/* Step 1: Rotating Payouts */}
            <div className="relative group">
              <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                <div className="flex-1 order-2 md:order-1">
                  <h3 className="text-3xl font-bold text-white mb-6">Rotating Payouts</h3>
                  <p className="text-zinc-400 text-lg leading-relaxed mb-8 max-w-md">
                    Each member takes turns receiving the full pooled payout. Everyone contributes equally, everyone wins on their round.
                  </p>
                  <div className="h-px w-full bg-zinc-800" />
                </div>
                <div className="flex-1 order-1 md:order-2 relative">
                  <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-xl group-hover:border-indigo-500/30 transition-colors duration-500 h-[110px]">
                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-transparent to-transparent z-10" />
                    <img src="/assets/payouts.png" alt="Rotating Payouts UI" className="w-full h-full object-cover object-center grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700" />
                    <div className="absolute top-0 right-0 h-full w-16 bg-indigo-600 flex items-center justify-center">
                      <span className="text-3xl font-black text-white/90">1</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Autonomous Operations */}
            <div className="relative group">
              <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                <div className="flex-1 relative order-1">
                  <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-xl group-hover:border-indigo-500/30 transition-colors duration-500 h-[110px]">
                    <div className="absolute inset-0 bg-gradient-to-l from-zinc-950 via-transparent to-transparent z-10" />
                    <img src="/assets/agents.png" alt="Autonomous Agents UI" className="w-full h-full object-cover object-center grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700" />
                    <div className="absolute top-0 left-0 h-full w-16 bg-indigo-500 flex items-center justify-center">
                      <span className="text-3xl font-black text-white/90">2</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 order-2">
                  <h3 className="text-2xl font-bold text-white mb-4 text-left">Autonomous Operations</h3>
                  <p className="text-zinc-400 text-base leading-relaxed mb-6 max-w-md">
                    On-chain agents advance rounds automatically when all contributions are received — no trusted third party required.
                  </p>
                  <div className="h-px w-full bg-zinc-800" />
                </div>
              </div>
            </div>

            {/* Step 3: Fully On-Chain */}
            <div className="relative group">
              <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                <div className="flex-1 order-2 md:order-1">
                  <h3 className="text-2xl font-bold text-white mb-4">Fully On-Chain</h3>
                  <p className="text-zinc-400 text-base leading-relaxed mb-6 max-w-md">
                    Built on Stellar Soroban. Every deposit, payout, and state change is verifiable on-chain — no custodians, no middlemen.
                  </p>
                  <div className="h-px w-full bg-zinc-800" />
                </div>
                <div className="flex-1 order-1 md:order-2 relative">
                  <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-xl group-hover:border-indigo-500/30 transition-colors duration-500 h-[110px]">
                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-transparent to-transparent z-10" />
                    <img src="/assets/onchain.png" alt="Fully On-Chain UI" className="w-full h-full object-cover object-center grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700" />
                    <div className="absolute top-0 right-0 h-full w-16 bg-indigo-700 flex items-center justify-center">
                      <span className="text-3xl font-black text-white/90">3</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="waitlist" className="py-32">
        <div className="mx-auto max-w-6xl px-5">
          <div className="relative rounded-[3rem] border border-indigo-500/20 bg-indigo-500/[0.02] p-12 md:p-20 text-center overflow-hidden shadow-2xl">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight">
                Ready to build your <br className="hidden sm:block" />
                <span className="text-[#8B5CF6]">Agent Circle?</span>
              </h2>
              <p className="text-zinc-400 text-lg mb-10 font-medium">
                Join thousands of users securing their financial future with community-driven, autonomous savings.
              </p>
              <div className="max-w-md mx-auto">
                <WaitlistForm />
              </div>
              <div className="flex -space-x-3 items-center justify-center mt-10">
                  {[1,2,3,4].map(i => (
                    <img 
                      key={i} 
                      src={`/assets/avatars/${i}.png`} 
                      alt={`Member ${i}`}
                      className="w-10 h-10 rounded-full border-2 border-zinc-900 object-cover" 
                    />
                  ))}
                  <span className="ml-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">+ 2.4k joined</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
