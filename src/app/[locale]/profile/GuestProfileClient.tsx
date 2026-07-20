'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { User, LogIn, UserPlus } from 'lucide-react';

export function GuestProfileClient() {
  const t = useTranslations('Profile');
  return (
    <div className="min-h-screen bg-[#08090f] text-white flex flex-col pb-20">
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-black tracking-tight">{t('title')}</h1>
      </div>
      <div className="mx-4 bg-[#0d0e15] border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-5 text-center shadow-2xl">
        <div className="w-20 h-20 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center">
          <User size={32} className="text-neutral-500" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">{t('notSignedIn')}</h2>
          <p className="text-sm text-neutral-400 mt-1 leading-relaxed">{t('notSignedInDesc')}</p>
        </div>
        <div className="flex flex-col w-full gap-3 mt-2">
          <Link href="/login" className="w-full py-3.5 rounded-2xl bg-[#00ff41] text-black font-black text-sm flex items-center justify-center gap-2 hover:bg-[#00dd38] active:scale-95 transition-all shadow-[0_4px_20px_rgba(0,255,65,0.2)]">
            <LogIn size={16} /> {t('signIn')}
          </Link>
          <Link href="/register" className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
            <UserPlus size={16} /> {t('createAccount')}
          </Link>
        </div>
      </div>
    </div>
  );
}
