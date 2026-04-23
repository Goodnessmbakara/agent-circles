import { Link } from "react-router";

export function Footer() {
  return (
    <footer className="relative mt-20 overflow-hidden bg-zinc-950/20">
      {/* The Wavy Background Structure */}
      <div className="relative w-full flex flex-col md:flex-row items-stretch md:items-end min-h-[400px] md:h-[300px]">
        
        {/* Stage 1: Lowest */}
        <div className="flex-1 h-[80px] md:h-[100px] bg-zinc-900/50 border-t md:border-t-0 border-white/5 relative group transition-all duration-500 hover:bg-zinc-900/80">
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
          <div className="relative h-full flex items-center px-6 md:px-10">
            <a href="https://x.com/AgentCircles" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors text-sm font-medium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
              </svg>
              <span>X.com</span>
            </a>
          </div>
          {/* Curve to Stage 2 (Desktop only) */}
          <div className="hidden md:block absolute top-0 right-0 translate-x-1/2 -translate-y-full w-20 h-20 pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-zinc-900/50">
              <path d="M0 100 Q 50 100 50 50 Q 50 0 100 0 L 100 100 Z" />
            </svg>
          </div>
        </div>

        {/* Stage 2: Middle */}
        <div className="flex-1 h-[120px] md:h-[200px] bg-zinc-900/60 border-t border-white/5 relative group transition-all duration-500 hover:bg-zinc-900/90">
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
          <div className="relative h-full flex flex-col justify-center px-6 md:px-10 gap-3">
            <Link to="/about" className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">About</Link>
            <Link to="/demo" className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">Demo</Link>
          </div>
          {/* Curve to Stage 3 (Desktop only) */}
          <div className="hidden md:block absolute top-0 right-0 translate-x-1/2 -translate-y-full w-20 h-20 pointer-events-none">
             <svg viewBox="0 0 100 100" className="w-full h-full fill-zinc-900/60">
              <path d="M0 100 Q 50 100 50 50 Q 50 0 100 0 L 100 100 Z" />
            </svg>
          </div>
        </div>

        {/* Stage 3: Highest */}
        <div className="flex-1 h-[200px] md:h-[300px] bg-zinc-900/70 border-t border-white/5 relative group transition-all duration-500 hover:bg-zinc-900/100">
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
          <div className="relative h-full flex flex-col justify-center px-6 md:px-10 gap-3">
             <button 
                onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-left text-zinc-500 hover:text-white transition-colors text-sm font-medium"
             >
                Waitlist
             </button>
             <Link to="/login" className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">Sign In</Link>
             <Link to="/pools" className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">Pool</Link>
          </div>
        </div>
      </div>

      {/* Decorative Brand Text */}
      <div className="absolute bottom-10 left-10 opacity-10 pointer-events-none">
        <span className="text-8xl font-black tracking-tighter text-white uppercase">Agent Circles</span>
      </div>
    </footer>
  );
}
