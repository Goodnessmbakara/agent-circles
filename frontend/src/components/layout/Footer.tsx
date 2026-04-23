import { Link } from "react-router";

export function Footer() {
  return (
    <footer className="relative mt-20 overflow-hidden">
      {/* The Wavy Background Structure */}
      <div className="relative w-full h-[300px] flex items-end">
        {/* Stage 1: Lowest (Left) */}
        <div className="flex-1 h-[100px] bg-zinc-900/50 border-t border-white/5 relative group transition-all duration-500 hover:h-[120px]">
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
          <div className="relative h-full flex flex-col justify-center px-10">
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">
              X.com
            </a>
          </div>
          {/* Curve to Stage 2 */}
          <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-full w-20 h-20 pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-zinc-900/50">
              <path d="M0 100 Q 50 100 50 50 Q 50 0 100 0 L 100 100 Z" />
            </svg>
          </div>
        </div>

        {/* Stage 2: Middle (Center) */}
        <div className="flex-1 h-[200px] bg-zinc-900/50 border-t border-white/5 relative group transition-all duration-500 hover:h-[220px]">
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
          <div className="relative h-full flex flex-col justify-center px-10 gap-4">
            <Link to="/about" className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">About</Link>
            <Link to="/demo" className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">Demo</Link>
          </div>
          {/* Curve to Stage 3 */}
          <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-full w-20 h-20 pointer-events-none">
             <svg viewBox="0 0 100 100" className="w-full h-full fill-zinc-900/50">
              <path d="M0 100 Q 50 100 50 50 Q 50 0 100 0 L 100 100 Z" />
            </svg>
          </div>
        </div>

        {/* Stage 3: Highest (Right) */}
        <div className="flex-1 h-[300px] bg-zinc-900/50 border-t border-white/5 relative group transition-all duration-500 hover:h-[320px]">
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
          <div className="relative h-full flex flex-col justify-center px-10 gap-4">
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
