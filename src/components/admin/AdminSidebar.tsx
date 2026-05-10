'use client';
import { useState } from 'react';
import { LayoutDashboard, Building2, UserCircle2, Settings, ChevronLeft, ChevronRight, Zap, Menu, X, Banknote, ChevronDown, ChevronUp, Users, Wallet, KeyRound, Monitor, Trophy, Swords, ShoppingBag, PackageCheck, BarChart3, Globe2 } from 'lucide-react';

export type AdminPage = 'overview' | 'platformSettings' | 'manageTurfs' | 'managePros' | 'payouts' | 'walletRecharge' | 'players' | 'frontend' | 'competitiveTeams' | 'challengeMarket' | 'openWbt' | 'shop' | 'shopOrders' | 'shopIncome' | 'tournaments' | 'bmtTournaments' | 'organizers' | 'orgRecharge';

interface NavGroup {
  label: string;
  icon: typeof LayoutDashboard;
  children: { key: AdminPage; label: string; icon: typeof LayoutDashboard }[];
}

const STANDALONE_ITEMS: { key: AdminPage; icon: typeof LayoutDashboard; label: string }[] = [
  { key: 'overview', icon: LayoutDashboard, label: 'Dashboard Overview' },
];

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Platform Tools',
    icon: Settings,
    children: [
      { key: 'platformSettings', icon: Settings,      label: 'Platform Settings' },
      { key: 'manageTurfs',      icon: Building2,     label: 'Owners & Turfs' },
      { key: 'payouts',          icon: Banknote,      label: 'Payouts & Ledger' },
    ],
  },
  {
    label: 'Players & Wallets',
    icon: Users,
    children: [
      { key: 'players',       icon: UserCircle2, label: 'Players' },
      { key: 'walletRecharge', icon: Wallet,      label: 'Wallet Recharge' },
    ],
  },
  {
    label: 'Frontend',
    icon: Monitor,
    children: [
      { key: 'frontend',   icon: Monitor,      label: 'Frontend Carousel' },
      { key: 'shop',       icon: ShoppingBag,  label: 'Shop Front'        },
      { key: 'shopOrders', icon: PackageCheck, label: 'Shop Orders'       },
      { key: 'shopIncome', icon: BarChart3,    label: 'Shop Income'       },
    ],
  },
  {
    label: 'Competitive',
    icon: Trophy,
    children: [
      { key: 'competitiveTeams', icon: Trophy, label: 'Teams' },
      { key: 'challengeMarket', icon: Swords, label: 'Challenge Market' },
      { key: 'openWbt', icon: Globe2, label: 'Open WBT' },
    ],
  },
  {
    label: 'Tournament Engine',
    icon: Trophy,
    children: [
      { key: 'bmtTournaments', icon: Trophy,       label: 'BMT Tournaments'       },
      { key: 'organizers',     icon: UserCircle2,   label: 'Organizers'             },
      { key: 'orgRecharge',    icon: Wallet,        label: 'Org Wallet Recharges'  },
    ],
  },
];

interface AdminSidebarProps {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
}

export default function AdminSidebar({ activePage, onNavigate }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-expand group if its child is active
  const getDefaultOpen = () => {
    const open: Record<string, boolean> = {};
    NAV_GROUPS.forEach(g => {
      if (g.children.some(c => c.key === activePage)) open[g.label] = true;
      else open[g.label] = true; // default all open
    });
    return open;
  };
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getDefaultOpen);

  const toggleGroup = (label: string) => setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={`flex items-center gap-3 md:gap-4 px-4 md:px-5 py-5 md:py-6 border-b border-[var(--panel-border)] shrink-0 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
          <Zap size={16} className="text-accent md:hidden" fill="currentColor" />
          <Zap size={20} className="text-accent hidden md:block" fill="currentColor" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-sm md:text-base font-black tracking-tight">BookMyTurf</span>
            <span className="text-[9px] md:text-[10px] font-bold text-accent uppercase tracking-widest">Admin Panel</span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 md:px-3 py-4 md:py-5 flex flex-col gap-1 md:gap-1.5 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Standalone items */}
        {STANDALONE_ITEMS.map(item => {
          const IconObj = item.icon;
          const isActive = activePage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => { onNavigate(item.key); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3.5 rounded-xl transition-all text-left active:scale-[0.98]
                ${isActive
                  ? 'bg-[var(--panel-bg-hover)] border border-[var(--panel-border)]'
                  : 'text-[var(--muted)] hover:text-foreground hover:bg-[var(--panel-bg)] border border-transparent'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <IconObj size={18} className="shrink-0 md:hidden" />
              <IconObj size={21} className="shrink-0 hidden md:block" />
              {!collapsed && <span className="text-sm md:text-[15px] font-semibold truncate">{item.label}</span>}
            </button>
          );
        })}

        {/* Grouped items */}
        {NAV_GROUPS.map(group => {
          const GroupIcon = group.icon;
          const isGroupOpen = openGroups[group.label] ?? true;
          const hasActiveChild = group.children.some(c => c.key === activePage);
          return (
            <div key={group.label}>
              {/* Group Header */}
              <button
                onClick={() => !collapsed && toggleGroup(group.label)}
                className={`w-full flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-all text-left mt-1
                  ${hasActiveChild ? 'text-accent' : 'text-[var(--muted)] hover:text-foreground'}
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <GroupIcon size={18} className="shrink-0 md:hidden" />
                <GroupIcon size={21} className="shrink-0 hidden md:block" />
                {!collapsed && (
                  <>
                    <span className="text-xs font-black uppercase tracking-widest flex-1">{group.label}</span>
                    {isGroupOpen
                      ? <ChevronUp size={13} className="shrink-0 opacity-50" />
                      : <ChevronDown size={13} className="shrink-0 opacity-50" />
                    }
                  </>
                )}
              </button>

              {/* Group Children */}
              {(isGroupOpen || collapsed) && group.children.map(child => {
                const ChildIcon = child.icon;
                const isActive = activePage === child.key;
                return (
                  <button
                    key={child.key}
                    onClick={() => { onNavigate(child.key); setMobileOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-xl transition-all text-left active:scale-[0.98]
                      ${!collapsed ? 'ml-4 w-[calc(100%-1rem)]' : 'justify-center'}
                      ${isActive
                        ? 'bg-accent/15 border border-accent/30 text-accent'
                        : 'text-[var(--muted)] hover:text-foreground hover:bg-[var(--panel-bg)] border border-transparent'
                      }
                    `}
                  >
                    <ChildIcon size={15} className="shrink-0 md:hidden" />
                    <ChildIcon size={17} className="shrink-0 hidden md:block" />
                    {!collapsed && <span className="text-sm font-semibold truncate">{child.label}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="hidden md:flex shrink-0 px-3 md:px-4 pb-4 md:pb-5 border-t border-[var(--panel-border)] pt-3 md:pt-4">
        <button
          onClick={() => setCollapsed(prev => !prev)}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[var(--muted)] hover:text-foreground hover:bg-[var(--panel-bg)] transition-all text-xs md:text-sm font-semibold ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Collapse</span></>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(prev => !prev)}
        className="md:hidden fixed top-4 left-4 z-[60] w-10 h-10 glass-panel rounded-xl flex items-center justify-center"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      {mobileOpen && <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]" onClick={() => setMobileOpen(false)} />}
      <div className={`md:hidden fixed top-0 left-0 h-full w-64 glass-sidebar border-r z-[56] transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </div>
      <aside className={`hidden md:flex flex-col h-screen sticky top-0 glass-sidebar border-r border-[var(--panel-border)] transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-72'}`}>
        <SidebarContent />
      </aside>
    </>
  );
}
