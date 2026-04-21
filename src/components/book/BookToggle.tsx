import { useTranslations } from 'next-intl';

export default function BookToggle({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: 'turf'|'pros'|'history') => void }) {
  const t = useTranslations('Book.toggle');
  
  return (
    <div className="flex bg-neutral-900 border border-neutral-800 rounded-full p-1 mb-4 shadow-inner">
      <button onClick={() => setActiveTab('turf')} className={`flex-1 py-1.5 text-center text-sm transition-all rounded-full ${activeTab === 'turf' ? 'font-bold bg-accent text-black shadow-md' : 'font-medium text-neutral-400 hover:text-white'}`}>{t('turf')}</button>
      <button onClick={() => setActiveTab('pros')} className={`flex-1 py-1.5 text-center text-sm transition-all rounded-full ${activeTab === 'pros' ? 'font-bold bg-accent text-black shadow-md' : 'font-medium text-neutral-400 hover:text-white'}`}>{t('pros')}</button>
      <button onClick={() => setActiveTab('history')} className={`flex-1 py-1.5 text-center text-sm transition-all rounded-full ${activeTab === 'history' ? 'font-bold bg-accent text-black shadow-md' : 'font-medium text-neutral-400 hover:text-white'}`}>{t('history')}</button>
    </div>
  );
}
