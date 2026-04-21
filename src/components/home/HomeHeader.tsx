'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, Bell, UserCircle, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Link } from '@/i18n/routing';
import { getCookie } from '@/lib/cookies';

export default function HomeHeader() {
  const t = useTranslations('Home');
  const [initials, setInitials] = useState('');
  const [isAuthed, setIsAuthed]  = useState(false);
  const [avatar, setAvatar]      = useState('');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const auth = document.cookie.includes('bmt_auth=');
    const role = getCookie('bmt_role');
    if (auth && (!role || role === 'player')) {
      setIsAuthed(true);
      const name = getCookie('bmt_name') || '';
      setInitials(name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'P');
      const pid = getCookie('bmt_player_id');
      if (pid) {
        fetch(`/api/bmt/players/${pid}`)
          .then(r => r.json())
          .then(d => { if (d?.avatarUrl || d?.avatarBase64) setAvatar(d.avatarUrl || d.avatarBase64); })
          .catch(() => {});
      }
    }
  }, []);


  return (
    <header className="flex items-center justify-between px-4 py-4 mt-2">
      <div className="flex flex-col">
        <div className="flex items-center gap-1 text-xs font-medium opacity-80 mb-0.5">
          <MapPin size={14} className="text-accent" />
          <span>{t('location')}</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight">{t('appTitle')}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="relative p-2 rounded-full glass hover:border-accent/50 hover:bg-white/10 transition-colors pointer-events-auto z-10"
        >
          {mounted && theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-[var(--foreground)]" />}
        </button>

        <button className="relative p-2 rounded-full glass hover:border-accent/50 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />
        </button>

        {/* Profile avatar → links to /profile */}
        <Link href="/profile">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-blue-500 p-[2px] hover:scale-105 transition-transform active:scale-95">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
              {isAuthed ? (
                avatar
                  ? <img src={avatar} alt="profile" className="w-full h-full object-cover" />
                  : <span className="text-sm font-black text-accent">{initials}</span>
              ) : (
                <UserCircle size={22} className="text-neutral-500" />
              )}
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}
