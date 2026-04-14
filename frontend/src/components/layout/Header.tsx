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

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Agent toggle */}
            <button
              onClick={() => setAgentOpen(!agentOpen)}
              title="Open AI agent"
              className={`relative flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer ${
                agentOpen
                  ? "border-indigo-500/40 text-indigo-300"
                  : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.07] hover:border-white/[0.12]"
              }`}
              style={agentOpen ? { background: "rgba(99,102,241,0.12)" } : {}}
            >
              {/* Pulse when open */}
              {agentOpen && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-400">
                  <span className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-75" />
                </span>
              )}
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
                <circle cx="6.5" cy="6.5" r="2" fill="currentColor"/>
              </svg>
              Agent
            </button>

            {/* Divider */}
            <div className="h-5 w-px bg-white/[0.08]" />

            <ConnectButton />
          </div>
        </div>
      </header>

      <AgentDrawer open={agentOpen} onClose={() => setAgentOpen(false)} />
    </>
  );
}
