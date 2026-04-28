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
      <header className="sticky top-0 z-40 overflow-visible"
        style={{ background: "transparent" }}
      >
        <div className="mx-auto max-w-6xl px-5 h-[60px] flex items-center gap-6 relative">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="relative w-8 h-8">
              <svg viewBox="0 0 100 100" className="w-full h-full fill-[#8B5CF6] group-hover:opacity-80 transition-opacity">
                <path d="M5 75L25 25H45L25 75H5Z" />
                <circle cx="68" cy="50" r="28" />
              </svg>
            </div>

            <div className="flex flex-col leading-[0.9]">
              <span className="text-[14px] font-bold text-white tracking-tight uppercase font-sans">
                Agent
              </span>
              <span className="text-[14px] font-bold text-white tracking-tight uppercase font-sans">
                Circles
              </span>
            </div>
          </Link>

          {/* Divider */}
          <div className="h-5 w-px bg-white/[0.08]" />

          {/* Nav (clean underline + sketch split layout) */}
          <nav className="hidden md:flex items-center gap-5 flex-1">
            {[
              { to: "/pools", label: "Pools" },
              { to: "/demo",  label: "Demo"  },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`relative px-0 py-1 text-sm font-medium transition-colors duration-150 ${
                  isActive(to)
                    ? "text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
                <span
                  className={`absolute -bottom-1 left-0 h-[2px] rounded-full bg-indigo-400 transition-all duration-200 ${
                    isActive(to) ? "w-full opacity-100" : "w-0 opacity-0"
                  }`}
                />
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3 ml-auto">
            <button 
              onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-primary py-1.5 px-5 text-xs font-bold"
            >
              Join Waitlist
            </button>
            {pathname !== '/' && <ConnectButton />}
          </div>
        </div>

        {/* Inset lower border + smooth center curve (doesn't touch viewport edges) */}
        <div className="pointer-events-none absolute left-1/2 -bottom-6 -translate-x-1/2 w-full max-w-6xl px-5">
          <svg viewBox="0 0 1000 44" preserveAspectRatio="none" className="w-full h-11">
            <path
              d="M8 6 H410 C455 6 465 38 500 38 C535 38 545 6 590 6 H992"
              fill="none"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth="1.2"
            />
            <path
              d="M8 6 H410 C455 6 465 38 500 38 C535 38 545 6 590 6 H992"
              fill="none"
              stroke="rgba(99,102,241,0.18)"
              strokeWidth="0.8"
            />
          </svg>
        </div>
      </header>

      <AgentDrawer open={agentOpen} onClose={() => setAgentOpen(false)} />

      {/* Floating assistant trigger (sketch-inspired, bottom-right) */}
      <button
        type="button"
        onClick={() => setAgentOpen(!agentOpen)}
        title="Chat help for pools and ROSCAs — not automated round advancement"
        aria-label="Open pool assistant chat"
        className={`fixed bottom-[35%] md:bottom-6 right-4 md:right-6 z-40 h-12 px-4 rounded-full border shadow-[0_12px_32px_rgba(0,0,0,0.35)] transition-all duration-200 cursor-pointer flex items-center gap-2 ${
          agentOpen
            ? "border-indigo-500/50 bg-indigo-500/20 text-indigo-200"
            : "border-white/[0.14] bg-[rgba(20,20,24,0.92)] text-zinc-300 hover:text-zinc-100 hover:border-white/[0.24]"
        }`}
      >
        {agentOpen && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-400">
            <span className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-75" />
          </span>
        )}
        <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden>
          <path
            d="M2.5 3.5C2.5 2.95 2.95 2.5 3.5 2.5h6c.55 0 1 .45 1 1v4.5c0 .55-.45 1-1 1H6.2L4.5 11v-2H3.5c-.55 0-1-.45-1-1v-4.5z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-xs font-medium">Assistant</span>
      </button>

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

        </div>
      </nav>
    </>
  );
}
