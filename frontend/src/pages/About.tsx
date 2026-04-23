export function About() {
  return (
    <div className="bg-zinc-950 min-h-screen pt-32 pb-20 px-5">
      <div className="max-w-4xl mx-auto">
        <header className="mb-20 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white mb-6">
            Empowering <span className="text-indigo-400 italic">Circles</span>.
          </h1>
          <p className="text-xl text-zinc-400 leading-relaxed max-w-2xl">
            Agent Circles is building the future of autonomous social savings, leveraging on-chain agents to create trustless, community-driven financial ecosystems.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-24">
          <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 hover:bg-white/[0.05] transition-all group">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Autonomous Trust</h3>
            <p className="text-zinc-500 leading-relaxed text-sm">
              Our on-chain agents handle all operations automatically. No human intermediary, no central authority, and no room for error. Your funds are governed by code, not people.
            </p>
          </div>

          <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 hover:bg-white/[0.05] transition-all group">
            <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Social First</h3>
            <p className="text-zinc-500 leading-relaxed text-sm">
              We've turned traditional ROSCAs into a high-tech social experience. Join circles with friends, family, or communities you trust, and grow your wealth together.
            </p>
          </div>
        </div>

        <section className="border-t border-white/5 pt-20">
          <h2 className="text-3xl font-bold text-white mb-10 tracking-tight">Our Mission</h2>
          <div className="space-y-8 text-zinc-400 leading-relaxed text-lg">
            <p>
              Traditional rotating savings and credit associations (ROSCAs) have been the backbone of community finance for centuries. However, they've always been limited by physical proximity and human trust.
            </p>
            <p>
              At Agent Circles, we use the Stellar network and Soroban smart contracts to bridge this gap. By automating the payout cycles and collateral management, we enable anyone, anywhere, to participate in global savings circles with absolute security.
            </p>
            <p className="font-medium text-white italic">
              "We believe that financial independence shouldn't depend on where you were born, but on the strength of your community."
            </p>
          </div>
        </section>

        <div className="mt-24 p-10 rounded-4xl bg-gradient-to-br from-indigo-500 to-purple-600 text-center text-white">
          <h2 className="text-3xl font-black mb-6 tracking-tighter">Ready to join the revolution?</h2>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-white text-zinc-950 px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform"
          >
            Go Back Home
          </button>
        </div>
      </div>
    </div>
  );
}
