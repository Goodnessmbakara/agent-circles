import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Clock } from 'lucide-react';

interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  expiresAt: string;
}

export function OnRampPaymentDetails({ details }: { details: BankDetails }) {
  const [copied, setCopied] = useState(false);

  const copyAccountNumber = () => {
    navigator.clipboard.writeText(details.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timeRemaining = () => {
    const expires = new Date(details.expiresAt).getTime();
    const now = new Date().getTime();
    const diff = expires - now;
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Transfer Funds</h3>
          <p className="text-zinc-400 text-sm">Send exactly the amount below</p>
        </div>
        <div className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border border-amber-500/20">
          <Clock size={12} />
          <span>{timeRemaining()}</span>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 font-semibold">Bank</div>
          <div className="text-white font-medium">{details.bankName}</div>
        </div>

        <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 flex justify-between items-center group">
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 font-semibold">Account Number</div>
            <div className="text-white font-mono text-lg">{details.accountNumber}</div>
          </div>
          <button 
            onClick={copyAccountNumber}
            className="p-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all active:scale-95"
          >
            {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
          </button>
        </div>

        <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 font-semibold">Account Name</div>
          <div className="text-white font-medium">{details.accountName}</div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
          <div className="text-xs text-emerald-500/70 uppercase tracking-wider mb-1 font-semibold">Amount to Send</div>
          <div className="text-3xl font-black text-white">₦{details.amount.toLocaleString()}</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-3 text-sm text-zinc-400 leading-relaxed bg-zinc-800/30 p-4 rounded-xl border border-zinc-800/50">
          <div className="shrink-0 text-emerald-500 mt-0.5">
            <Check size={16} />
          </div>
          <p>
            Transfer exactly <span className="text-white font-medium">₦{details.amount.toLocaleString()}</span> from your bank app. 
            The system will automatically detect your payment.
          </p>
        </div>
        
        <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs py-2 hover:text-zinc-400 cursor-pointer transition-colors">
          <span>Powered by Partna</span>
          <ExternalLink size={10} />
        </div>
      </div>
    </div>
  );
}
