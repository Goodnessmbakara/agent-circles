import React, { useState, useEffect, useCallback } from 'react';
import { X, CreditCard, Landmark, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { OnRampPaymentDetails } from './OnRampPaymentDetails';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

interface RampModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolId: string;
  userId: string;
  amountUSDC: number;
  onSuccess: () => void;
  action: 'join' | 'contribute';
}

type Step = 'method' | 'fetching' | 'payment' | 'completed' | 'error';

export function RampModal({ isOpen, onClose, poolId, userId, amountUSDC, onSuccess, action }: RampModalProps) {
  const [step, setStep] = useState<Step>('method');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  // Approximate NGN amount (in production, fetch live rate)
  const amountNGN = Math.round(amountUSDC * 1650); 

  const handleStartNaira = async () => {
    setStep('fetching');
    try {
      const res = await api.createOnRamp({
        poolId,
        userId,
        amountNGN,
        stellarWalletAddress: userId,
      });
      setOrderDetails(res);
      setStep('payment');
      setPolling(true);
    } catch (err: any) {
      setError(err.message);
      setStep('error');
    }
  };

  const checkStatus = useCallback(async () => {
    if (!orderDetails?.orderId || !polling) return;
    try {
      const res = await api.getRampOrder(orderDetails.orderId);
      if (res.status === 'completed') {
        setPolling(false);
        setStep('completed');
      } else if (res.status === 'failed') {
        setPolling(false);
        setError(res.failureReason || 'Payment failed');
        setStep('error');
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, [orderDetails, polling]);

  useEffect(() => {
    let interval: number;
    if (polling) {
      interval = window.setInterval(checkStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [polling, checkStatus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-zinc-900">
          <h2 className="text-xl font-bold text-white">
            {step === 'method' && 'Choose Payment Method'}
            {step === 'fetching' && 'Preparing Payment'}
            {step === 'payment' && 'Send Payment'}
            {step === 'completed' && 'Payment Received'}
            {step === 'error' && 'Something went wrong'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {step === 'method' && (
            <div className="space-y-4">
              <p className="text-zinc-400 text-sm mb-6">
                You need <span className="text-white font-semibold">{amountUSDC} USDC</span> to {action === 'join' ? 'join this circle' : 'make this contribution'}.
              </p>
              
              <button 
                onClick={onClose} // Just close and let them use the default wallet flow
                className="w-full flex items-center gap-4 p-5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800/80 hover:border-zinc-700 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <CreditCard size={24} />
                </div>
                <div className="text-left flex-1">
                  <div className="text-white font-semibold">Pay with USDC (Wallet)</div>
                  <div className="text-zinc-500 text-xs mt-0.5">Use Freighter or other Stellar wallet</div>
                </div>
                <ArrowRight size={18} className="text-zinc-600 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={handleStartNaira}
                className="w-full flex items-center gap-4 p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-500">
                  <Landmark size={24} />
                </div>
                <div className="text-left flex-1">
                  <div className="text-white font-semibold">Pay with Naira (Bank Transfer)</div>
                  <div className="text-zinc-500 text-xs mt-0.5">Instant NGN on-ramp via Partna</div>
                </div>
                <ArrowRight size={18} className="text-zinc-600 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {step === 'fetching' && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 size={40} className="text-indigo-500 animate-spin mb-4" />
              <p className="text-white font-medium">Generating your virtual account...</p>
              <p className="text-zinc-500 text-sm mt-2">This usually takes a few seconds</p>
            </div>
          )}

          {step === 'payment' && orderDetails && (
            <div className="-mx-8 -mb-8 px-8 pb-8 bg-zinc-900/30">
              <OnRampPaymentDetails details={orderDetails} />
              <div className="mt-6 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Loader2 size={16} className="animate-spin text-indigo-500" />
                  Waiting for bank transfer...
                </div>
              </div>
            </div>
          )}

          {step === 'completed' && (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6 border border-emerald-500/20">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Funds Received!</h3>
              <p className="text-zinc-400 mb-8 max-w-xs">
                Your NGN has been converted to <span className="text-white font-semibold">{amountUSDC} USDC</span>. 
                Now, finalize your {action} by signing the transaction.
              </p>
              <button 
                onClick={() => {
                  onClose();
                  onSuccess(); // Trigger the original sign flow
                }}
                className="btn-primary w-full py-4 text-lg"
              >
                Sign & Complete
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-6 border border-red-500/20">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
              <p className="text-zinc-500 text-sm mb-8">{error}</p>
              <button 
                onClick={() => setStep('method')}
                className="btn-secondary w-full"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
