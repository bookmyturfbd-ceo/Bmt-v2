"use client";

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useParams } from 'next/navigation';
import NotificationCenter from './NotificationCenter';

export default function Navbar() {
  const t = useTranslations('Navigation');
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

  return (
    <>
      {/* ── Made in Bangladesh — sticky top strip ── */}
      <div className="bmt-origin-banner">
        <span className="bmt-origin-text">🇧🇩 Proudly Made in Bangladesh</span>
        <span className="bmt-origin-heart">♥</span>
      </div>

      {/* ── Main Navbar (sits below the 22px strip) ── */}
      <nav className="fixed top-[22px] w-full z-50 glass-light dark:glass px-4 py-3 flex items-center justify-between transition-colors duration-300">
        <div className="font-bold text-xl tracking-tighter cursor-pointer flex items-center gap-2">
          <span className="text-accent">BMT</span>
        </div>

        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="hidden md:flex gap-6 mr-4 cursor-pointer">
            <span className="hover:text-accent transition-colors">{t('dashboard')}</span>
            <span className="hover:text-accent transition-colors">{t('login')}</span>
          </div>

          {mounted && <NotificationCenter />}

          <div 
            className="relative flex items-center p-[2px] rounded-full bg-slate-900/10 dark:bg-white/5 border border-slate-900/5 dark:border-white/5 font-mono select-none w-[78px] h-[32px] shadow-inner pointer-events-auto"
            aria-label={t('toggleLanguage')}
          >
            {/* Sliding background pill */}
            <div 
              className="absolute top-[2px] bottom-[2px] left-[2px] w-[35px] rounded-full bg-accent transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-sm"
              style={{
                transform: locale === 'bn' ? 'translateX(35px)' : 'translateX(0px)'
              }}
            />
            
            {/* Option 'EN' */}
            <button 
              onClick={() => {
                if (locale !== 'en') {
                  const search = typeof window !== 'undefined' ? window.location.search : '';
                  router.replace(pathname + search, { locale: 'en' });
                }
              }}
              className={`relative z-10 w-[35px] h-full text-center font-black text-[10px] tracking-wide transition-colors duration-300 cursor-pointer flex items-center justify-center ${
                locale === 'en' 
                  ? 'text-black dark:text-black' 
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              EN
            </button>
            
            {/* Option 'BN' */}
            <button 
              onClick={() => {
                if (locale !== 'bn') {
                  const search = typeof window !== 'undefined' ? window.location.search : '';
                  router.replace(pathname + search, { locale: 'bn' });
                }
              }}
              className={`relative z-10 w-[35px] h-full text-center font-black text-[10px] tracking-wide transition-colors duration-300 cursor-pointer flex items-center justify-center ${
                locale === 'bn' 
                  ? 'text-black dark:text-black' 
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              BN
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
