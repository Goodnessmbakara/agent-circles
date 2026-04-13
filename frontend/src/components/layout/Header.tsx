import { useState } from "react";
import { Link } from "react-router";
import { ConnectButton } from "../wallet/ConnectButton";
import { AgentDrawer } from "./AgentDrawer";

export function Header() {
  const [agentOpen, setAgentOpen] = useState(false);

  return (
    <>
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="container mx-auto max-w-5xl flex items-center justify-between">
          <Link to="/" className="text-xl font-bold">Agent Circles</Link>
          <nav className="flex items-center gap-6">
            <Link to="/pools" className="text-sm text-gray-400 hover:text-white">Pools</Link>
            <Link to="/demo" className="text-sm text-gray-400 hover:text-white">Demo</Link>
            <button
              onClick={() => setAgentOpen(!agentOpen)}
              className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg"
            >
              Agent
            </button>
            <ConnectButton />
          </nav>
        </div>
      </header>
      <AgentDrawer open={agentOpen} onClose={() => setAgentOpen(false)} />
    </>
  );
}
