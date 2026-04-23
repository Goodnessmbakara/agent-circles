import { Link, useLocation } from "react-router";

export function Footer() {
  const { pathname } = useLocation();

  return (
    <footer className="relative mt-20 overflow-hidden bg-zinc-950/20 pb-24 md:pb-0">
      {/* The Wavy Background Structure */}
      <div className="relative w-full flex flex-row items-end h-[200px] md:h-[300px]">
        
        {/* Stage 1: Lowest */}
        <a 
          href="https://x.com/AgentCircles" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex-1 h-[80px] md:h-[100px] bg-zinc-900/50 border-t border-white/5 relative group transition-all duration-500 hover:bg-zinc-900/80 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
          <div className="relative h-full flex items-center px-4 md:px-10">
            <div className="flex items-center gap-3 md:gap-4 text-white transition-colors text-[13px] md:text-base font-bold">
              <svg className="w-5 h-5 md:w-8 md:h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
              </svg>
              <span className="hidden xs:inline tracking-tighter">X.com</span>
            </div>
          </div>
          {/* Curve to Stage 2 */}
          <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-full w-12 md:w-20 h-12 md:h-20 pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-zinc-900/50">
              <path d="M0 100 Q 50 100 50 50 Q 50 0 100 0 L 100 100 Z" />
            </svg>
          </div>
        </a>

        {/* Stage 2: Middle */}
        <div className="flex-1 h-[140px] md:h-[200px] bg-zinc-900/60 border-t border-white/5 relative group transition-all duration-500 hover:bg-zinc-900/90">
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
          <div className="relative h-full flex flex-col justify-center gap-1">
            <Link to="/about" className="px-4 md:px-10 py-1.5 md:py-2 text-zinc-500 hover:text-white hover:bg-white/5 transition-all text-xs md:text-sm font-medium">About</Link>
            <Link to="/demo" className="px-4 md:px-10 py-1.5 md:py-2 text-zinc-500 hover:text-white hover:bg-white/5 transition-all text-xs md:text-sm font-medium">Demo</Link>
          </div>
          {/* Curve to Stage 3 */}
          <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-full w-12 md:w-20 h-12 md:h-20 pointer-events-none">
             <svg viewBox="0 0 100 100" className="w-full h-full fill-zinc-900/60">
              <path d="M0 100 Q 50 100 50 50 Q 50 0 100 0 L 100 100 Z" />
            </svg>
          </div>
        </div>

        {/* Stage 3: Highest */}
        <div className="flex-1 h-[200px] md:h-[300px] bg-zinc-900/70 border-t border-white/5 relative group transition-all duration-500 hover:bg-zinc-900/100">
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
          <div className="relative h-full flex flex-col justify-center gap-1">
             <button 
                onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-4 md:px-10 py-1.5 md:py-2 text-left text-zinc-500 hover:text-white hover:bg-white/5 transition-all text-xs md:text-sm font-medium"
             >
                Waitlist
             </button>
             <Link to="/pools" className="px-4 md:px-10 py-1.5 md:py-2 text-zinc-500 hover:text-white hover:bg-white/5 transition-all text-xs md:text-sm font-medium">Pool</Link>
             {pathname !== '/' && (
               <Link to="/login" className="px-4 md:px-10 py-1.5 md:py-2 text-zinc-500 hover:text-white hover:bg-white/5 transition-all text-xs md:text-sm font-medium">Sign In</Link>
             )}
          </div>
        </div>
      </div>

      {/* Decorative Brand Text */}
      <div className="absolute bottom-4 md:bottom-10 left-4 md:left-10 opacity-10 pointer-events-none">
        <span className="text-4xl xs:text-6xl md:text-8xl font-black tracking-tighter text-white uppercase">Agent Circles</span>
      </div>
    </footer>
  );
}
