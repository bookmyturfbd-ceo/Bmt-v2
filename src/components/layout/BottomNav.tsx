'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import {
  Home, Calendar, ShoppingBag, Swords, Wallet,
  UserCircle, Dumbbell, CheckSquare, CalendarDays
} from 'lucide-react';
import { useTranslations } from 'next-intl';

const leftItems  = [
  { id: 'home',  href: '/',      icon: Home,        label: 'Home' },
  { id: 'book',  href: '/book',  icon: Calendar,    label: 'Book' },
] as const;

const rightItems = [
  { id: 'shop',   href: '/shop',   icon: ShoppingBag, label: 'Shop' },
  { id: 'wallet', href: '/wallet', icon: Wallet,      label: 'Wallet' },
] as const;

const PRO_ITEMS = [
  { key: 'myProfile',      icon: UserCircle,   label: 'Profile' },
  { key: 'manageServices', icon: Dumbbell,     label: 'Services' },
  { key: 'training',       icon: CheckSquare,  label: 'Training' },
  { key: 'bookings',       icon: CalendarDays, label: 'Bookings' },
  { key: 'finance',        icon: Wallet,       label: 'Finance' },
] as const;

export default function BottomNav() {
  const t = useTranslations('Home');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isProDashboard = pathname.includes('/dashboard/coach') || pathname.includes('/coach');
  const currentProTab = (searchParams.get('tab') as string) || 'myProfile';

  if (
    pathname.includes('/admin') ||
    pathname.includes('/owner') ||
    pathname.includes('/login') ||
    pathname.includes('/register') ||
    pathname.includes('/organizer')
  ) {
    return null;
  }

  // ─── Professional Dashboard Bottom Nav ──────────────────────────────────────
  if (isProDashboard) {
    return (
      <nav className="fixed bottom-0 w-full z-50 glass-light dark:glass pb-safe pt-1 border-t border-blue-500/20 bg-[#07080e]/95 backdrop-blur-xl">
        <div className="flex items-center justify-around px-2 py-1">
          {PRO_ITEMS.map((item) => {
            const IconObj = item.icon;
            const active = currentProTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('bmt_coach_nav', { detail: item.key }));
                  router.push(`/dashboard/coach?tab=${item.key}` as any);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-2xl transition-all active:scale-95 ${
                  active ? 'text-blue-400 font-black' : 'text-neutral-500 hover:text-white font-medium'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${active ? 'bg-blue-500/15 border border-blue-500/30' : ''}`}>
                  <IconObj size={20} className={active ? 'stroke-[2.5]' : 'stroke-2'} />
                </div>
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // ─── Standard Player Bottom Nav ─────────────────────────────────────────────
  const isActive = (id: string, href: string) =>
    id === 'arena'
      ? (pathname.startsWith('/arena') || pathname.startsWith('/interact') || pathname.startsWith('/teams') || pathname.startsWith('/tourney') || pathname.startsWith('/leaderboard') || pathname.startsWith('/play'))
      : href === '/'
      ? pathname === href
      : pathname.startsWith(href);

  const NavLink = ({ item }: { item: { id: string; href: string; icon: any; label: string } }) => {
    const active = isActive(item.id, item.href);
    const Icon = item.icon;

    return (
      <Link
        href={item.href as any}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-2xl transition-all active:scale-95 ${
          active ? 'text-accent' : 'text-neutral-500 hover:text-white'
        }`}
      >
        <div className={`p-1 rounded-xl ${active ? 'bg-accent/10' : ''}`}>
          <Icon size={24} className={active ? 'stroke-[2.5]' : 'stroke-2'} />
        </div>
        <span className={`text-[10px] font-semibold ${active ? 'font-bold tracking-wide' : ''}`}>{t(`nav.${item.id}` as any)}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 w-full z-50 glass-light dark:glass pb-safe pt-1 border-t border-white/10 dark:border-white/5">
      <div className="flex items-end justify-between px-2 pb-0.5 gap-1">

        {/* Left items */}
        {leftItems.map(item => <NavLink key={item.id} item={item} />)}

        {/* Center Arena FAB */}
        <Link
          href="/arena"
          className="relative flex flex-col items-center justify-center -mt-4.5 mx-1"
        >
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-[#00ff41]/20 blur-xl scale-150 pointer-events-none" />
          {/* Pill button */}
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-b from-[#00ff41] to-[#00cc35] shadow-[0_0_24px_rgba(0,255,65,0.45)] flex items-center justify-center active:scale-95 transition-transform">
            <Swords size={26} className="text-black stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-black text-[#00ff41] mt-0.5 tracking-wide">{t('nav.arena')}</span>
        </Link>

        {/* Right items */}
        {rightItems.map(item => <NavLink key={item.id} item={item} />)}

      </div>
    </nav>
  );
}
