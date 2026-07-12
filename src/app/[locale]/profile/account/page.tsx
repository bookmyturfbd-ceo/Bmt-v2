'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/cookies';
import {
  Wallet, ShoppingBag, Phone, Mail, Hash, Calendar,
  LogOut, ArrowLeft, ChevronRight, Star, AlertTriangle,
} from 'lucide-react';
import { Link } from '@/i18n/routing';


interface AccountData {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  joinedAt: string;
  walletBalance?: number;
  loyaltyPoints?: number;
  playerCode?: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = getCookie('bmt_player_id');
    if (!id) { router.replace('/login'); return; }
    fetch(`/api/bmt/players/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function signOut() {
    ['bmt_auth', 'bmt_role', 'bmt_player_id', 'bmt_name'].forEach(k => {
      document.cookie = `${k}=; path=/; max-age=0`;
    });
    router.replace('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-white/60 font-medium">Could not load account data.</p>
        <button onClick={() => router.back()} className="text-accent font-black text-sm">← Go back</button>
      </div>
    );
  }

  const showLp = process.env.NEXT_PUBLIC_FEATURE_LP === 'true';

  return (
    <div className="min-h-screen bg-[var(--bg-base)] pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-5 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-xl font-black tracking-tight">Account & Wallet</h1>
      </div>

      {/* Wallet balance */}
      <div className="mx-4 mb-4 rounded-3xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-accent/60 mb-1">Wallet Balance</p>
        <p className="text-4xl font-black text-accent leading-none">
          ৳{(data.walletBalance ?? 0).toFixed(0)}
        </p>
        <p className="text-xs text-white/30 mt-2 font-medium">Available for bookings and shop orders</p>
      </div>

      {/* LP (feature-flagged) */}
      {showLp && (
        <div className="mx-4 mb-4 rounded-2xl bg-white/[0.04] border border-white/[0.07] p-4 flex items-center gap-3">
          <Star size={18} className="text-[var(--tier-gold)] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-black">{data.loyaltyPoints ?? 0} Loyalty Points</p>
            <p className="text-[10px] text-white/30 font-medium">Can be redeemed on the shop</p>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="mx-4 mb-5">
        <div className="flex flex-col divide-y divide-white/[0.04] bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
          <Link href="/wallet" className="flex items-center gap-3 px-4 py-4 hover:bg-white/[0.03] transition-all">
            <Wallet size={16} className="text-accent flex-shrink-0" />
            <span className="flex-1 text-sm font-black">Wallet & Top-up History</span>
            <ChevronRight size={14} className="text-white/30" />
          </Link>
          <Link href="/shop" className="flex items-center gap-3 px-4 py-4 hover:bg-white/[0.03] transition-all">
            <ShoppingBag size={16} className="text-white/60 flex-shrink-0" />
            <span className="flex-1 text-sm font-black">Shop Orders</span>
            <ChevronRight size={14} className="text-white/30" />
          </Link>
        </div>
      </div>

      {/* Account details */}
      <div className="mx-4 mb-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Account Details</p>
        <div className="flex flex-col gap-0 bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
          {[
            { icon: <Mail size={14} className="text-white/40" />, label: 'Email', val: data.email },
            { icon: <Phone size={14} className="text-white/40" />, label: 'Phone', val: data.phone },
            { icon: <Hash size={14} className="text-white/40" />, label: 'Player Code', val: data.playerCode ?? '—' },
            { icon: <Calendar size={14} className="text-white/40" />, label: 'Member since', val: new Date(data.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) },
          ].map(({ icon, label, val }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3.5">
              {icon}
              <div className="flex-1">
                <p className="text-[10px] text-white/30 font-medium">{label}</p>
                <p className="text-sm font-black text-white/80">{val}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="mx-4">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-black hover:bg-red-500/15 active:scale-95 transition-all"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );
}
