import { useTranslations } from 'next-intl';

export default function DashboardPage() {
  const t = useTranslations('Dashboard');

  return (
    <div className="flex-1 mt-16 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-black tracking-tight uppercase">
            {t('title')}
          </h1>
          <button className="bg-accent text-black font-bold py-2 px-6 rounded-lg hover:brightness-110 transition-all self-start md:self-auto">
            {t('bookNow')}
          </button>
        </header>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Active Bookings Card */}
          <div className="glass-light dark:glass p-6 rounded-2xl flex flex-col gap-4 hover:border-accent/50 transition-colors">
            <h3 className="text-lg font-bold opacity-80 uppercase tracking-wider">{t('activeBookings')}</h3>
            <span className="text-5xl font-black text-accent">2</span>
          </div>

          {/* Matches Card */}
          <div className="glass-light dark:glass p-6 rounded-2xl flex flex-col gap-4 hover:border-accent/50 transition-colors">
            <h3 className="text-lg font-bold opacity-80 uppercase tracking-wider">{t('totalMatches')}</h3>
            <span className="text-5xl font-black text-accent">14</span>
          </div>

          {/* Upcoming Card */}
          <div className="glass-light dark:glass p-6 rounded-2xl flex flex-col gap-4 hover:border-accent/50 transition-colors sm:col-span-2 lg:col-span-1">
            <h3 className="text-lg font-bold opacity-80 uppercase tracking-wider">{t('upcoming')}</h3>
            <div className="mt-auto opacity-70 font-medium">Sat 14 Nov, 18:00 PM - Turf Alpha</div>
          </div>
        </div>
      </div>
    </div>
  );
}
