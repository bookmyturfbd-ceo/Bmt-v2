'use client';
import { usePathname, useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale as string;
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className={`relative flex items-center p-[2px] rounded-full bg-slate-900/10 dark:bg-white/5 border border-slate-900/5 dark:border-white/5 font-mono w-[78px] h-[32px] shrink-0 ${className}`}>
        <div className="w-[35px] h-full" />
        <div className="w-[35px] h-full" />
      </div>
    );
  }

  return (
    <div 
      className={`relative flex items-center p-[2px] rounded-full bg-slate-900/10 dark:bg-white/5 border border-slate-900/5 dark:border-white/5 font-mono select-none w-[78px] h-[32px] shadow-inner pointer-events-auto shrink-0 ${className}`}
      aria-label="Toggle language"
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
            router.replace(pathname, { locale: 'en' });
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
            router.replace(pathname, { locale: 'bn' });
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
  );
}
