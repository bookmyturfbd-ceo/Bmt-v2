"use client";

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { Moon, Sun, Globe } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function Navbar() {
  const t = useTranslations('Navigation');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => setMounted(true), []);

  const toggleLanguage = () => {
    const nextLocale = locale === 'en' ? 'bn' : 'en';
    router.replace(pathname, { locale: nextLocale });
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <nav className="fixed top-0 w-full z-50 glass-light dark:glass px-4 py-3 flex items-center justify-between transition-colors duration-300">
      <div className="font-bold text-xl tracking-tighter cursor-pointer flex items-center gap-2">
        <span className="text-accent">BMT</span>
      </div>

      <div className="flex items-center gap-4 text-sm font-medium">
        <div className="hidden md:flex gap-6 mr-4 cursor-pointer">
          <span className="hover:text-accent transition-colors">{t('dashboard')}</span>
          <span className="hover:text-accent transition-colors">{t('login')}</span>
        </div>

        <button 
          onClick={toggleTheme} 
          className="p-2 rounded-full hover:bg-neutral-200/20 dark:hover:bg-neutral-800/50 transition-colors"
          aria-label={t('toggleTheme')}
        >
          {mounted && theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button 
          onClick={toggleLanguage}
          className="p-2 rounded-full hover:bg-neutral-200/20 dark:hover:bg-neutral-800/50 transition-colors flex items-center gap-2"
          aria-label={t('toggleLanguage')}
        >
          <Globe size={20} />
          <span className="hidden sm:inline">{locale === 'en' ? 'BN' : 'EN'}</span>
        </button>
      </div>
    </nav>
  );
}
