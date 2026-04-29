'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, Bell, UserCircle, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Link } from '@/i18n/routing';
import { getCookie } from '@/lib/cookies';

export default function HomeHeader({ initialAuth = false }: { initialAuth?: boolean }) {
  const t = useTranslations('Home');
  const [initials, setInitials] = useState('');
  const [isAuthed, setIsAuthed]  = useState(initialAuth);
  const [avatar, setAvatar]      = useState('');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userLocation, setUserLocation] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const auth = document.cookie.includes('bmt_auth=');
    const role = getCookie('bmt_role');
    const currentlyAuthed = auth && (!role || role === 'player');
    
    if (currentlyAuthed !== isAuthed) {
      setIsAuthed(currentlyAuthed);
    }

    if (currentlyAuthed) {
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

    // Try auto-fetch on mount silently
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
            const data = await res.json();
            if (data?.address) {
              const city = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state;
              const country = data.address.country;
              if (city && country) {
                setUserLocation(`${city}, ${country}`);
              } else if (city || country) {
                setUserLocation(city || country);
              }
            }
          } catch (error) {}
        },
        () => {} // silently fail on auto-mount
      );
    }
  }, []);

  const fetchLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
            const data = await res.json();
            if (data?.address) {
              const city = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state;
              const country = data.address.country;
              if (city && country) {
                setUserLocation(`${city}, ${country}`);
              } else if (city || country) {
                setUserLocation(city || country);
              }
            }
          } catch (error) {
            console.error("Failed to reverse geocode:", error);
            alert("Could not determine city from coordinates.");
          }
        },
        (error) => {
          console.warn("Geolocation failed", error);
          if (error.code === error.PERMISSION_DENIED) {
            alert("Location access was denied. Please enable it in your browser settings.");
          } else if (error.code === error.POSITION_UNAVAILABLE || error.message.includes('secure origin')) {
            alert("Location unavailable. Make sure you are using localhost or HTTPS.");
          } else {
            alert("Could not get location: " + error.message);
          }
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };


  return (
    <header className="flex items-center justify-between px-4 py-2 pt-3">
      <div className="flex flex-col">
        <div 
          onClick={fetchLocation}
          className="flex items-center gap-1 text-xs font-medium opacity-80 mb-0.5 cursor-pointer hover:text-accent transition-colors"
          title="Click to detect location"
        >
          <MapPin size={14} className="text-accent" />
          <span>{userLocation || t('location')}</span>
        </div>
        <div className="mt-0.5">
          <img src="/bmt-logo.png" alt="Book My Turf" className="h-14 md:h-16 object-contain object-left drop-shadow-lg" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="relative p-2 rounded-full glass hover:border-accent/50 hover:bg-white/10 transition-colors pointer-events-auto z-10"
        >
          {mounted && theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-[var(--foreground)]" />}
        </button>

        {isAuthed ? (
          <>
            <button className="relative p-2 rounded-full glass hover:border-accent/50 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />
            </button>

            <Link href="/profile">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-blue-500 p-[2px] hover:scale-105 transition-transform active:scale-95">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                  {avatar
                    ? <img src={avatar} alt="profile" className="w-full h-full object-cover" />
                    : <span className="text-sm font-black text-accent">{initials}</span>
                  }
                </div>
              </div>
            </Link>
          </>
        ) : (
          <Link href="/login" className="px-5 py-2 rounded-xl bg-accent text-black font-black text-sm tracking-wide hover:brightness-110 active:scale-95 transition-all shadow-md">
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
