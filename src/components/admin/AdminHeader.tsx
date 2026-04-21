'use client';
import { Search, Shield } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';

interface AdminHeaderProps {
  breadcrumb: string;
}

export default function AdminHeader({ breadcrumb }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-[var(--panel-border)] px-5 md:px-8 py-3 md:py-4 flex items-center justify-between gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 ml-10 md:ml-0">
        <span className="text-[var(--muted)] text-sm md:text-base font-medium hidden sm:inline">Admin</span>
        <span className="text-[var(--muted)] hidden sm:inline">/</span>
        <span className="text-sm md:text-base font-bold">{breadcrumb}</span>
      </div>

      {/* Right: Search + Theme Toggle + Profile */}
      <div className="flex items-center gap-2.5 md:gap-3">
        <div className="relative hidden sm:flex items-center">
          <Search size={14} className="absolute left-3 text-[var(--muted)] md:hidden" />
          <Search size={16} className="absolute left-3.5 text-[var(--muted)] hidden md:block" />
          <input
            type="text"
            placeholder="Search…"
            className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl pl-8 md:pl-10 pr-4 py-2 md:py-2.5 text-sm md:text-base placeholder:text-[var(--muted)] outline-none focus:border-accent/50 transition-colors w-44 md:w-64"
          />
        </div>

        <ThemeToggle />

        <div className="flex items-center gap-2 md:gap-3 glass-panel rounded-xl px-3 md:px-4 py-1.5 md:py-2">
          <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
            <Shield size={14} className="text-accent md:hidden" />
            <Shield size={17} className="text-accent hidden md:block" />
          </div>
          <div className="hidden sm:flex flex-col leading-none gap-0.5">
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-accent">Super Admin</span>
            <span className="text-[11px] md:text-xs text-[var(--muted)] font-medium">admin@bmt.com</span>
          </div>
        </div>
      </div>
    </header>
  );
}
