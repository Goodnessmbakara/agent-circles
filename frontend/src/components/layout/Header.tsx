import { useState } from "react";
import { Link, useLocation } from "react-router";
import { ConnectButton } from "../wallet/ConnectButton";
import { AgentDrawer } from "./AgentDrawer";

export function Header() {
  const [agentOpen, setAgentOpen] = useState(false);
  const { pathname } = useLocation();

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors duration-150 ${
        pathname === to || pathname.startsWith(to + "/")
          ? "text-zinc-50"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-cta flex items-center justify-center shadow-brand-glow/50">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="2" r="1.5" fill="white"/>
                <circle cx="11.5" cy="5.5" r="1.2" fill="white" opacity="0.7"/>
                <circle cx="10" cy="10.5" r="1.2" fill="white" opacity="0.55"/>
                <circle cx="4" cy="10.5" r="1.2" fill="white" opacity="0.4"/>
                <circle cx="2.5" cy="5.5" r="1.2" fill="white" opacity="0.3"/>
                <circle cx="7" cy="7" r="1.5" fill="#10b981"/>
              </svg>
            </div>
            <span className="font-semibold text-sm text-zinc-100 group-hover:text-white transition-colors">
              Agent Circles
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLink("/pools", "Pools")}
            {navLink("/demo", "Demo")}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAgentOpen(!agentOpen)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-150 ${
                agentOpen
                  ? "bg-brand-500/15 border-brand-500/30 text-brand-400"
                  : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.07]"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="6" cy="6" r="2" fill="currentColor"/>
              </svg>
              Agent
            </button>
            <ConnectButton />
          </div>
        </div>
      </header>
      <AgentDrawer open={agentOpen} onClose={() => setAgentOpen(false)} />
    </>
  );
}
