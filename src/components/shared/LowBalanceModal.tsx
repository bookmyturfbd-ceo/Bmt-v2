'use client';
import { Wallet, X, ChevronRight } from 'lucide-react';

interface Props {
  required: number;
  current: number;
  onClose: () => void;
  onRecharge: () => void;
}

export default function LowBalanceModal({ required, current, onClose, onRecharge }: Props) {
  return (
    <div className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-red-500/30 overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1a0808, #0a0a0a)' }}>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #ef4444, transparent)' }} />
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <Wallet size={22} className="text-red-400" />
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5">
              <X size={14} />
            </button>
          </div>
          <div>
            <h3 className="text-lg font-black text-red-400">Low Balance</h3>
            <p className="text-sm text-neutral-400 mt-1 leading-relaxed">
              You need <span className="font-black text-white">৳{required.toLocaleString()}</span> but your wallet only has{' '}
              <span className="font-black text-red-400">৳{current.toLocaleString()}</span>.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={onRecharge}
              className="w-full py-3 rounded-2xl bg-accent text-black font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_16px_rgba(0,255,65,0.2)]">
              <Wallet size={15} /> Recharge Wallet <ChevronRight size={14} />
            </button>
            <button onClick={onClose}
              className="w-full py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-[var(--muted)] hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
