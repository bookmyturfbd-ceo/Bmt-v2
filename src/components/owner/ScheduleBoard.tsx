import { useTranslations } from 'next-intl';

type Slot = {
  time: string;
  booked: boolean;
  player?: string;
  sport?: string;
  paid?: boolean;
};

const SCHEDULE: Slot[] = [
  // Intentionally empty. Will be populated by real Turf Bookings.
];

export default function ScheduleBoard() {
  const t = useTranslations('Owner.schedule');

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">{t('title')}</h2>

      {SCHEDULE.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-bg)] text-center">
          <p className="text-sm font-semibold text-[var(--muted)]">No schedule for today</p>
          <p className="text-xs text-[var(--muted)] opacity-50">When your turfs get booked, they will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {SCHEDULE.map((slot, idx) => (
            <div key={idx} className={`flex gap-3 items-stretch rounded-2xl border transition-colors overflow-hidden
              ${slot.booked
                ? 'glass-panel hover:shadow-sm'
                : 'border-dashed border-[var(--panel-border)] hover:border-accent/30 bg-transparent'
              }`}
            >
              {/* Time stripe */}
              <div className={`w-1 shrink-0 rounded-l-2xl ${slot.booked ? (slot.paid ? 'bg-accent' : 'bg-orange-400') : 'bg-white/10'}`} />

              <div className="flex-1 flex items-center justify-between gap-3 py-3 pr-4">
                {/* Time */}
                <div className="flex flex-col gap-0.5 min-w-[90px]">
                  <span className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">{slot.time}</span>
                  {slot.booked && slot.sport && (
                    <span className="text-[10px] text-neutral-600 font-semibold">{slot.sport}</span>
                  )}
                </div>

                {slot.booked ? (
                  /* Booked slot */
                  <div className="flex-1 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{slot.player}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        slot.paid
                          ? 'bg-accent/10 border-accent/30 text-accent'
                          : 'bg-orange-400/10 border-orange-400/30 text-orange-400'
                      }`}>
                        {slot.paid ? t('paid') : t('due')}
                      </span>
                      <button className="text-[11px] font-bold text-neutral-500 hover:text-white border border-white/8 hover:border-white/20 px-3 py-1 rounded-lg transition-all">
                        {t('viewDetails')}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Empty slot */
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-neutral-600">{t('emptySlot')}</span>
                    <button className="text-[11px] font-black text-accent hover:underline tracking-wide">
                      {t('promoteSlot')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
