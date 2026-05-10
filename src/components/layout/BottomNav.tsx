'use client';
import { useState } from 'react';
import { usePathname } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import { Home, Calendar, ShoppingBag, Swords, Wallet } from 'lucide-react';
import dynamic from 'next/dynamic';

const GlobalWalletModal = dynamic(() => import('./GlobalWalletModal'), { ssr: false });

const leftItems  = [
  { id: 'home',  href: '/',      icon: Home,        label: 'Home' },
  { id: 'book',  href: '/book',  icon: Calendar,    label: 'Book' },
] as const;

const rightItems = [
  { id: 'shop',   href: '/shop',   icon: ShoppingBag, label: 'Shop' },
  { id: 'wallet', href: '#',       icon: Wallet,      label: 'Wallet' },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const [walletOpen, setWalletOpen] = useState(false);

  if (pathname.includes('/admin') || pathname.includes('/owner') || pathname.includes('/login') || pathname.includes('/register') || pathname.includes('/organizer')) return null;

  const isActive = (id: string, href: string) =>
    id === 'arena'
      ? (pathname.startsWith('/arena') || pathname.startsWith('/interact') || pathname.startsWith('/teams') || pathname.startsWith('/tourney') || pathname.startsWith('/leaderboard') || pathname.startsWith('/play'))
      : href === '/'
      ? pathname === href
      : pathname.startsWith(href);

  const NavLink = ({ item }: { item: { id: string; href: string; icon: any; label: string } }) => {
    const active = isActive(item.id, item.href);
    const Icon = item.icon;

    if (item.id === 'wallet') {
      return (
        <button
          onClick={() => setWalletOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-2xl transition-all active:scale-95 ${
            walletOpen ? 'text-accent' : 'text-neutral-500 hover:text-white'
          }`}
        >
          <div className={`p-1.5 rounded-xl ${walletOpen ? 'bg-accent/10' : ''}`}>
            <Icon size={22} className={walletOpen ? 'stroke-[2.5]' : 'stroke-2'} />
          </div>
          <span className={`text-[10px] font-semibold ${walletOpen ? 'font-bold tracking-wide' : ''}`}>{item.label}</span>
        </button>
      );
    }

    return (
      <Link
        href={item.href as any}
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-2xl transition-all active:scale-95 ${
          active ? 'text-accent' : 'text-neutral-500 hover:text-white'
        }`}
      >
        <div className={`p-1.5 rounded-xl ${active ? 'bg-accent/10' : ''}`}>
          <Icon size={22} className={active ? 'stroke-[2.5]' : 'stroke-2'} />
        </div>
        <span className={`text-[10px] font-semibold ${active ? 'font-bold tracking-wide' : ''}`}>{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {walletOpen && <GlobalWalletModal onClose={() => setWalletOpen(false)} />}

      <nav className="fixed bottom-0 w-full z-50 glass-light dark:glass pb-safe pt-2 border-t border-white/10 dark:border-white/5">
        <div className="flex items-end justify-between px-2 pb-0.5 gap-1">

          {/* Left items */}
          {leftItems.map(item => <NavLink key={item.id} item={item} />)}

          {/* Center Arena FAB */}
          <Link
            href="/arena"
            className="relative flex flex-col items-center justify-center -mt-5 mx-1"
          >
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full bg-[#00ff41]/20 blur-xl scale-150 pointer-events-none" />
            {/* Pill button */}
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-b from-[#00ff41] to-[#00cc35] shadow-[0_0_24px_rgba(0,255,65,0.45)] flex items-center justify-center active:scale-95 transition-transform">
              <Swords size={24} className="text-black stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-black text-[#00ff41] mt-1 tracking-wide">Arena</span>
          </Link>

          {/* Right items */}
          {rightItems.map(item => <NavLink key={item.id} item={item} />)}

        </div>

        {/* Made in Bangladesh strip */}
        <div className="pb-[env(safe-area-inset-bottom)] flex items-center justify-center gap-1 pb-0.5">
          <span className="text-[9px] font-semibold tracking-widest uppercase text-neutral-600 dark:text-neutral-700 select-none">
            Proudly Made in Bangladesh
          </span>
          <span className="text-[9px] animate-pulse text-red-500/60">♥</span>
        </div>
      </nav>
    </>
  );
}
