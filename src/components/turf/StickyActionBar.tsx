'use client';
import { useTranslations } from 'next-intl';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function StickyActionBar({ price }: { price: number }) {
  const t = useTranslations('TurfDetails');
  const isAuthed = useAuth();

  const handleBook = () => {
    if (!isAuthed) {
      // Redirect to login, remembering where they came from
      window.location.href = window.location.origin + '/en/login?next=' + encodeURIComponent(window.location.pathname);
      return;
    }
    // TODO: navigate to booking confirmation
    alert('Booking flow coming soon!');
  };

  return (
    <div className="fixed bottom-0 w-full z-50 glass-light dark:glass pb-safe pt-3 px-5 pb-5 border-t border-white/10 dark:border-white/5 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
      <div className="flex flex-col">
        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Price</span>
        <div className="flex items-baseline gap-1.5 text-white">
          <span className="text-[22px] font-black">৳{price}</span>
          <span className="text-[11px] text-neutral-400 font-bold">{t('perHour')}</span>
        </div>
      </div>

      {/* Render nothing until hydration resolves to avoid layout shift */}
      {isAuthed === null ? (
        <div className="w-36 h-12 rounded-full bg-neutral-800 animate-pulse" />
      ) : isAuthed ? (
        <button
          onClick={handleBook}
          className="bg-accent text-black px-10 py-3.5 rounded-full font-black tracking-wide shadow-[0_4px_20px_rgba(0,255,0,0.2)] active:scale-95 hover:brightness-110 transition-all text-sm"
        >
          {t('bookNow')}
        </button>
      ) : (
        <button
          onClick={handleBook}
          className="flex items-center gap-2 bg-neutral-800 border border-white/10 text-white px-6 py-3.5 rounded-full font-bold tracking-wide active:scale-95 hover:bg-neutral-700 transition-all text-sm"
        >
          <LogIn size={15} className="text-accent" />
          Sign in to Book
        </button>
      )}
    </div>
  );
}
