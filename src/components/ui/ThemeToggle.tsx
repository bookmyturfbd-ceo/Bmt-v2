'use client';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-9 h-9 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] animate-pulse" />;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      className={`relative w-9 h-9 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] flex items-center justify-center hover:border-accent/40 transition-all active:scale-95 group ${className}`}
    >
      <Sun
        size={16}
        className={`absolute transition-all duration-300 ${isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100 text-amber-500'}`}
      />
      <Moon
        size={16}
        className={`absolute transition-all duration-300 ${isDark ? 'opacity-100 rotate-0 scale-100 text-accent' : 'opacity-0 -rotate-90 scale-50'}`}
      />
    </button>
  );
}
