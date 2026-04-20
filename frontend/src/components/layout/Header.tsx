import { useState } from "react";
import { Link, useLocation } from "react-router";
import { ConnectButton } from "../wallet/ConnectButton";
import { AgentDrawer } from "./AgentDrawer";

export function Header() {
  const [agentOpen, setAgentOpen] = useState(false);
  const { pathname } = useLocation();

  const isActive = (to: string) =>
    pathname === to || pathname.startsWith(to + "/");

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.06]"
        style={{ background: "rgba(9,9,11,0.85)", backdropFilter: "blur(20px)" }}
      >
        <div className="mx-auto max-w-6xl px-5 h-[60px] flex items-center gap-6">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            {/* Mark */}
            <div className="relative w-8 h-8 flex items-center justify-center">
              {/* Outer ring */}
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="absolute inset-0">
                <circle cx="16" cy="16" r="14" stroke="url(#ring-grad)" strokeWidth="1.5" strokeOpacity="0.5"/>
                <defs>
                  <linearGradient id="ring-grad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366f1"/>
                    <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.3"/>
                  </linearGradient>
                </defs>
              </svg>
              {/* Orbiting dots */}
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="absolute inset-0">
                <circle cx="16" cy="4"  r="2.2" fill="#6366f1"/>
                <circle cx="26" cy="10" r="1.7" fill="#818cf8" fillOpacity="0.7"/>
                <circle cx="26" cy="22" r="1.5" fill="#818cf8" fillOpacity="0.5"/>
                <circle cx="16" cy="28" r="1.5" fill="#818cf8" fillOpacity="0.35"/>
                <circle cx="6"  cy="22" r="1.5" fill="#818cf8" fillOpacity="0.25"/>
                <circle cx="6"  cy="10" r="1.7" fill="#818cf8" fillOpacity="0.15"/>
              </svg>
              {/* Center emerald dot */}
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative z-10"
                style={{ boxShadow: "0 0 8px rgba(52,211,153,0.6)" }} />
            </div>

            <div className="flex flex-col leading-none">
              <span className="text-[13px] font-semibold text-zinc-100 group-hover:text-white transition-colors tracking-tight">
                Agent Circles
              </span>
              <span className="text-[10px] text-zinc-600 tracking-widest uppercase mt-0.5">
                on Stellar
              </span>
            </div>
          </Link>

          {/* Divider */}
          <div className="h-5 w-px bg-white/[0.08]" />

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {[
              { to: "/pools", label: "Pools" },
              { to: "/demo",  label: "Demo"  },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive(to)
                    ? "text-zinc-100 bg-white/[0.07]"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                }`}
              >
                {label}
                {isActive(to) && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right side — wallet first, assistant last */}
          <div className="flex items-center gap-2 ml-auto">
            <ConnectButton />

            <div className="h-5 w-px bg-white/[0.08]" aria-hidden />

            {/* Chat assistant (LLM help — not keeper / on-chain automation) */}
            <button
              type="button"
              onClick={() => setAgentOpen(!agentOpen)}
              title="Chat help for pools and ROSCAs — not automated round advancement"
              aria-label="Open pool assistant chat"
              className={`relative flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer ${
                agentOpen
                  ? "border-indigo-500/40 text-indigo-300"
                  : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.07] hover:border-white/[0.12]"
              }`}
              style={agentOpen ? { background: "rgba(99,102,241,0.12)" } : {}}
            >
              {agentOpen && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-400">
                  <span className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-75" />
                </span>
              )}
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                <path
                  d="M2.5 3.5C2.5 2.95 2.95 2.5 3.5 2.5h6c.55 0 1 .45 1 1v4.5c0 .55-.45 1-1 1H6.2L4.5 11v-2H3.5c-.55 0-1-.45-1-1v-4.5z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
              Assistant
            </button>
          </div>
        </div>
      </header>

      <AgentDrawer open={agentOpen} onClose={() => setAgentOpen(false)} />

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 md:hidden border-t border-white/[0.06]"
        style={{ background: "rgba(9,9,11,0.95)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-stretch h-16">
          {/* Pools tab */}
          <Link
            to="/pools"
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium tracking-wide transition-colors ${
              isActive("/pools") ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="6"  cy="6"  r="3" stroke="currentColor" strokeWidth="1.4"/>
              <circle cx="14" cy="6"  r="3" stroke="currentColor" strokeWidth="1.4"/>
              <circle cx="6"  cy="14" r="3" stroke="currentColor" strokeWidth="1.4"/>
              <circle cx="14" cy="14" r="3" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
            Pools
          </Link>

          {/* Demo tab */}
          <Link
            to="/demo"
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium tracking-wide transition-colors ${
              isActive("/demo") ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <polygon points="7,4 16,10 7,16" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
              <circle cx="4" cy="4"  r="1.2" fill="currentColor" opacity="0.6"/>
              <circle cx="4" cy="16" r="1.2" fill="currentColor" opacity="0.4"/>
            </svg>
            Demo
          </Link>

          {/* Assistant tab — chat help, not chain automation */}
          <button
            type="button"
            onClick={() => setAgentOpen(!agentOpen)}
            aria-label="Open pool assistant chat"
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium tracking-wide transition-colors cursor-pointer ${
              agentOpen ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="relative">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path
                  d="M4 5.5C4 4.67 4.67 4 5.5 4h9c.83 0 1.5.67 1.5 1.5v6c0 .83-.67 1.5-1.5 1.5h-2.3L9.5 17v-4H5.5C4.67 13 4 12.33 4 11.5v-6z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
              {agentOpen && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-400">
                  <span className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-75" />
                </span>
              )}
            </span>
            Assistant
          </button>
        </div>
      </nav>
    </>
  );
}
