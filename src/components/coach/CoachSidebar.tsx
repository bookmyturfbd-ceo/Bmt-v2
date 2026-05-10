'use client';
import { useState, useEffect } from 'react';
import { getCookie } from '@/lib/cookies';
import {
  CalendarDays, UserCircle, Wallet, Settings2,
  ChevronLeft, ChevronRight, Menu, X, Zap, Dumbbell
} from 'lucide-react';

export type CoachPage = 'myProfile' | 'bookings' | 'manageServices' | 'finance' | 'settings';

const NAV_ITEMS: { key: CoachPage; icon: typeof UserCircle; label: string }[] = [
  { key: 'myProfile',      icon: UserCircle,    label: 'My Profile' },
  { key: 'manageServices', icon: Dumbbell,      label: 'My Services' },
  { key: 'bookings',       icon: CalendarDays,  label: 'Bookings' },
  { key: 'finance',        icon: Wallet,        label: 'Finance' },
];

interface CoachSidebarProps {
  activePage: CoachPage;
  onNavigate: (page: CoachPage) => void;
}

export default function CoachSidebar({ activePage, onNavigate }: CoachSidebarProps) {
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ownerName, setOwnerName]   = useState('Coach Portal');

  useEffect(() => {
    const name = getCookie('bmt_name') || getCookie('bmt_owner_name') || 'Coach Portal';
    setOwnerName(name);
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-[var(--panel-border)] ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
          <Zap size={16} className="text-blue-500" fill="currentColor" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-sm font-black tracking-tight truncate">{ownerName}</span>
            <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-widest">Coach Portal</span>
          </div>
        )}
      </div>
      <nav className="flex-1 px-2 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const IconObj = item.icon;
          const isActive = activePage === item.key;
          return (
            <button key={item.key}
              onClick={() => { onNavigate(item.key); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left active:scale-[0.98]
                ${isActive
                  ? 'bg-blue-500/12 text-blue-500 border border-blue-500/25'
                  : 'text-[var(--muted)] hover:text-foreground hover:bg-[var(--panel-bg)] border border-transparent'
                } ${collapsed ? 'justify-center' : ''}`}
            >
              <IconObj size={18} className="shrink-0" />
              {!collapsed && <span className="text-sm font-semibold truncate">{item.label}</span>}
              {!collapsed && isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.9)] shrink-0" />}
            </button>
          );
        })}
      </nav>
      <div className="hidden md:flex px-3 pb-4 border-t border-[var(--panel-border)] pt-3">
        <button onClick={() => setCollapsed(prev => !prev)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--muted)] hover:text-foreground hover:bg-[var(--panel-bg)] transition-all text-xs font-semibold ${collapsed ? 'justify-center' : ''}`}>
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(prev => !prev)}
        className="md:hidden fixed top-4 left-4 z-[60] w-10 h-10 glass-panel rounded-xl flex items-center justify-center">
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      {mobileOpen && <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]" onClick={() => setMobileOpen(false)} />}
      <div className={`md:hidden fixed top-0 left-0 h-full w-60 glass-sidebar border-r z-[56] transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </div>
      <aside className={`hidden md:flex flex-col h-screen sticky top-0 glass-sidebar border-r border-[var(--panel-border)] transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
        <SidebarContent />
      </aside>
    </>
  );
}
