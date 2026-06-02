import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Wallet, ShieldAlert } from 'lucide-react';
import WalletDashboard from '@/components/wallet/WalletDashboard';

export default async function WalletPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Home' });

  const cookieStore = await cookies();
  const authCookie = cookieStore.get('bmt_auth');
  const playerCookie = cookieStore.get('bmt_player_id');

  // Verify authentication server side
  const isLoggedIn = !!authCookie && !!playerCookie;

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-24 pt-20 selection:bg-accent/30 selection:text-accent">
        <div className="w-full max-w-md mx-auto relative flex flex-col px-4 text-center items-center justify-center py-20 gap-6 animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* Glowing Icon Circle */}
          <div className="relative w-20 h-20 rounded-3xl bg-neutral-900 border border-white/5 flex items-center justify-center shadow-xl group">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-[#00ff41]/20 to-[#00cc35]/5 blur-lg opacity-80 pointer-events-none group-hover:scale-110 transition-transform" />
            <Wallet size={36} className="text-[#00ff41] stroke-[1.5] drop-shadow-[0_0_12px_rgba(0,255,65,0.4)]" />
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <ShieldAlert size={12} className="text-yellow-400" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Login Required</h2>
            <p className="text-xs text-neutral-400 max-w-[280px] font-medium leading-relaxed mt-1">
              You need to log in to access the wallet, recharge your balance, and view your transaction history.
            </p>
          </div>

          {/* Action button */}
          <Link
            href="/login"
            className="w-full max-w-[220px] py-4 rounded-2xl bg-gradient-to-b from-[#00ff41] to-[#00cc35] text-black font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_24px_rgba(0,255,65,0.3)]"
          >
            Log In Now
          </Link>
        </div>
      </div>
    );
  }

  // If authenticated, render the full-screen WalletDashboard
  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 pt-6 selection:bg-accent/30 selection:text-accent">
      <div className="w-full max-w-md mx-auto relative flex flex-col px-4">
        <h1 className="text-xl font-black mb-4 tracking-wider uppercase drop-shadow-md text-white">My Wallet</h1>
        <WalletDashboard />
      </div>
    </div>
  );
}
