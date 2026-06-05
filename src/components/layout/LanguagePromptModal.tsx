'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { Globe } from 'lucide-react';

export default function LanguagePromptModal() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    // Check if preference already selected
    const selected = localStorage.getItem('bmt_language_selected');
    if (!selected) {
      setIsOpen(true);
    }
  }, []);

  const handleSelectLanguage = (selectedLocale: 'en' | 'bn') => {
    localStorage.setItem('bmt_language_selected', 'true');
    setIsOpen(false);
    
    // Redirect if selected locale is different from current URL locale
    if (locale !== selectedLocale) {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      router.replace(pathname + search, { locale: selectedLocale });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Glassy dark backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      
      {/* Modal Sheet */}
      <div className="relative w-full max-w-sm glass-panel border border-white/10 rounded-3xl p-6 text-center shadow-2xl z-10 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <Globe className="text-accent w-6 h-6 animate-pulse" />
        </div>
        
        <div>
          <h2 className="text-lg font-black text-white mb-1">ভাষা নির্বাচন করুন / Select Language</h2>
          <p className="text-xs text-[var(--muted)] font-medium leading-relaxed">
            আপনি কি আমাদের অ্যাপ বাংলা ভাষায় ব্যবহার করতে চান? <br />
            Would you like to use our app in Bangla?
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => handleSelectLanguage('bn')}
            className="w-full py-3.5 rounded-2xl bg-accent text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(0,255,65,0.2)] cursor-pointer"
          >
            হ্যাঁ, বাংলা করুন (BN)
          </button>
          
          <button
            onClick={() => handleSelectLanguage('en')}
            className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-neutral-800 border border-white/10 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
          >
            English (EN)
          </button>
        </div>
        
        <p className="text-[10px] text-neutral-500 font-bold">
          * আপনার পছন্দটি পরবর্তী ভিজিটের জন্য সংরক্ষণ করা হবে।
        </p>
      </div>
    </div>
  );
}
