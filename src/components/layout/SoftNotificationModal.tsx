'use client';

import { useTranslations } from 'next-intl';
import { Swords, X } from 'lucide-react';
import { useNotificationsStore } from '@/hooks/useNotificationsStore';
import { syncOneSignalIdentity } from '@/lib/onesignal';
import OneSignal from 'react-onesignal';

export default function SoftNotificationModal() {
  const t = useTranslations('NotificationsModal');
  const { isModalOpen, closeModal } = useNotificationsStore();

  if (!isModalOpen) return null;

  const handleEnable = async () => {
    closeModal();
    try {
      console.log('OneSignal: Requesting push notification permission (native)...');
      await OneSignal.Notifications.requestPermission();
      await syncOneSignalIdentity();
    } catch (err) {
      console.error('OneSignal: Failed to request notification permission:', err);
    }
  };

  const handleMaybeLater = () => {
    closeModal();
    // Cooldown of 3 days
    localStorage.setItem('bmt_onesignal_cooldown', Date.now().toString());
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      {/* Dark glassy backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" 
        onClick={handleMaybeLater} 
      />
      
      {/* Modal box */}
      <div 
        className="relative w-full max-w-sm glass-panel border border-white/10 rounded-3xl p-6 text-center shadow-2xl z-10 flex flex-col gap-5 animate-in zoom-in-95 duration-200"
        style={{ background: 'linear-gradient(180deg, #091309 0%, #030303 100%)' }}
      >
        
        {/* Close button */}
        <button 
          onClick={handleMaybeLater} 
          className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Top Icon */}
        <div className="mx-auto w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center">
          <Swords className="text-accent w-6 h-6 animate-pulse" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-lg font-black text-white">{t('title')}</h2>
        </div>

        {/* Benefits List */}
        <div className="flex flex-col gap-4 text-left px-1 mt-1">
          <div className="flex items-start gap-3">
            <span className="text-base mt-0.5 select-none">⚔️</span>
            <p className="text-xs text-neutral-300 leading-relaxed font-semibold">
              {t('benefit1')}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-base mt-0.5 select-none">🏟️</span>
            <p className="text-xs text-neutral-300 leading-relaxed font-semibold">
              {t('benefit2')}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-base mt-0.5 select-none">✅</span>
            <p className="text-xs text-neutral-300 leading-relaxed font-semibold">
              {t('benefit3')}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 mt-2 shrink-0">
          <button
            onClick={handleEnable}
            className="w-full py-3.5 rounded-2xl bg-accent text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(0,255,65,0.2)] cursor-pointer"
          >
            {t('enable')}
          </button>
          
          <button
            onClick={handleMaybeLater}
            className="w-full py-1 text-center text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            {t('maybeLater')}
          </button>
        </div>
      </div>
    </div>
  );
}
