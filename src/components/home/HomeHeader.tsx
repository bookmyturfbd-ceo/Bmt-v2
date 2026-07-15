'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, Globe, X, Phone, Mail } from 'lucide-react';
import NotificationCenter from '@/components/layout/NotificationCenter';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { getCookie } from '@/lib/cookies';

// WhatsApp SVG Icon
function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.498 1.451 5.418 1.452 5.51 0 9.991-4.49 9.995-10.005.002-2.673-1.036-5.187-2.923-7.078-1.888-1.89-4.4-2.932-7.08-2.933-5.516 0-10.003 4.49-10.008 10.008-.001 1.93.502 3.81 1.457 5.429L1.816 22.2l6.186-1.622zm11.365-6.8c-.302-.152-1.792-.883-2.072-.985-.28-.102-.484-.153-.687.152-.203.305-.788.985-.966 1.187-.178.203-.356.228-.658.077-1.136-.57-1.93-1.006-2.7-2.324-.203-.35-.203-.654-.05-.806.136-.137.304-.35.457-.525.152-.178.203-.304.304-.508.102-.203.05-.381-.025-.533-.077-.152-.687-1.65-.94-2.26-.247-.594-.501-.513-.687-.523-.178-.01-.381-.01-.584-.01-.203 0-.533.076-.813.381-.28.305-1.066 1.042-1.066 2.54 0 1.498 1.092 2.946 1.244 3.149.153.203 2.15 3.284 5.21 4.603.728.314 1.296.502 1.74.643.73.232 1.396.199 1.922.121.587-.087 1.792-.733 2.047-1.442.254-.71.254-1.32.178-1.442-.076-.122-.28-.178-.584-.33z"/>
    </svg>
  );
}

// Facebook SVG Icon
function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

// Instagram SVG Icon
function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

// TikTok SVG Icon
function TiktokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.53.02c.11 0 .22.02.32.04 1.15.22 2.19.82 2.92 1.67.14.16.27.34.39.53.25.4.45.84.58 1.3.04.14.07.29.09.43.02.13.03.26.03.39v2.24c-.03.01-.06.01-.09.01-1.07 0-2.07-.37-2.88-1-.07-.05-.13-.11-.2-.17v6.62c0 4.14-3.36 7.5-7.5 7.5S2.14 16.22 2.14 12s3.36-7.5 7.5-7.5c.34 0 .68.02 1.01.07v3.08c-.33-.09-.67-.14-1.01-.14-2.43 0-4.4 1.97-4.4 4.4s1.97 4.4 4.4 4.4 4.4-1.97 4.4-4.4V0h4.49z" />
    </svg>
  );
}

// YouTube SVG Icon
function YoutubeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.522 3.5 12 3.5 12 3.5s-7.522 0-9.388.556a3.002 3.002 0 0 0-2.11 2.107C0 8.028 0 12 0 12s0 3.972.502 5.837a3.003 3.003 0 0 0 2.11 2.107C4.478 20.5 12 20.5 12 20.5s7.522 0 9.388-.556a3.002 3.002 0 0 0 2.11-2.107C24 15.972 24 12 24 12s0-3.972-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function HomeHeader({ initialAuth = false }: { initialAuth?: boolean }) {
  const t = useTranslations('Home');
  const [initials, setInitials] = useState('');
  const [isAuthed, setIsAuthed]  = useState(initialAuth);
  const [avatar, setAvatar]      = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale as string;
  const [mounted, setMounted] = useState(false);
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [socials, setSocials] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    
    // Fetch socials
    fetch('/api/bmt/social-settings')
      .then(r => r.json())
      .then(d => setSocials(d))
      .catch(() => {});

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
    <div className="flex flex-col w-full bg-[#080808]">
      {/* 1. Slim Top Utility Bar (Location & Language Toggle) */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/5 bg-white/[0.01]">
        {/* Clickable Geo Location */}
        <div 
          onClick={fetchLocation}
          className="flex items-center gap-1.5 text-[10px] font-black text-neutral-400 hover:text-accent transition-colors cursor-pointer select-none"
          title="Click to detect location"
        >
          <MapPin size={11} className="text-accent" />
          <span>{userLocation || t('location')}</span>
        </div>

        {/* Language Toggler */}
        <div className="flex items-center gap-2">
          <Globe size={11} className="text-neutral-500" />
          <div 
            className="relative flex items-center p-[2px] rounded-full bg-slate-900/10 dark:bg-white/5 border border-slate-900/5 dark:border-white/5 font-mono select-none w-[60px] h-[22px] shadow-inner"
            aria-label="Select Language"
          >
            {/* Sliding background pill */}
            <div 
              className="absolute top-[2px] bottom-[2px] left-[2px] w-[27px] rounded-full bg-accent transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-sm"
              style={{
                transform: locale === 'bn' ? 'translateX(28px)' : 'translateX(0px)'
              }}
            />
            
            {/* Option 'EN' */}
            <button 
              onClick={() => {
                if (locale !== 'en') {
                  router.replace(pathname, { locale: 'en' });
                }
              }}
              className={`relative z-10 w-[27px] h-full text-center font-black text-[9px] tracking-wide transition-colors duration-300 cursor-pointer flex items-center justify-center ${
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
              className={`relative z-10 w-[27px] h-full text-center font-black text-[9px] tracking-wide transition-colors duration-300 cursor-pointer flex items-center justify-center ${
                locale === 'bn' 
                  ? 'text-black dark:text-black' 
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              BN
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Branding & Actions Bar */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Brand Logo */}
        <div>
          <img src="/bmt-logo.png" alt="Book My Turf" className="h-10 md:h-12 object-contain object-left drop-shadow-lg" />
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Login or Profile Avatar / Notification */}
          {isAuthed ? (
            <div className="flex items-center gap-2">
              {/* Real Notification Center */}
              <NotificationCenter />

              <Link href="/profile">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-blue-500 p-[2px] hover:scale-105 transition-transform active:scale-95">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                    {avatar
                      ? <img src={avatar} alt="profile" className="w-full h-full object-cover" />
                      : <span className="text-xs font-black text-accent">{initials}</span>
                    }
                  </div>
                </div>
              </Link>
            </div>
          ) : (
            <Link href="/login" className="px-4.5 py-1.5 rounded-xl bg-accent text-black font-black text-[10px] uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md">
              {t('login')}
            </Link>
          )}
        </div>
      </div>

      {/* Social Links Row Under Header — also hosts Contact Us button */}
      {(socials.social_facebook || socials.social_instagram || socials.social_tiktok || socials.social_youtube) && (
        <div id="social-links" className="flex items-center justify-between px-4 py-1.5 border-t border-white/[0.03] bg-white/[0.01]">
          {/* Left: Follow Us + social icons */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Follow us</span>
            <div className="flex items-center gap-1.5 select-none">
              {socials.social_facebook && (
                <a href={socials.social_facebook} target="_blank" rel="noopener noreferrer" className="w-[26px] h-[26px] rounded-full border border-white/5 bg-white/5 hover:bg-[#1877F2] hover:border-transparent hover:text-white transition-all flex items-center justify-center text-neutral-400 active:scale-90" title="Facebook">
                  <FacebookIcon size={11} />
                </a>
              )}
              {socials.social_instagram && (
                <a href={socials.social_instagram} target="_blank" rel="noopener noreferrer" className="w-[26px] h-[26px] rounded-full border border-white/5 bg-white/5 hover:bg-gradient-to-tr hover:from-[#FCAF45] hover:to-[#E1306C] hover:border-transparent hover:text-white transition-all flex items-center justify-center text-neutral-400 active:scale-90" title="Instagram">
                  <InstagramIcon size={11} />
                </a>
              )}
              {socials.social_tiktok && (
                <a href={socials.social_tiktok} target="_blank" rel="noopener noreferrer" className="w-[26px] h-[26px] rounded-full border border-white/5 bg-white/5 hover:bg-black hover:border-white/10 hover:text-white transition-all flex items-center justify-center text-neutral-400 active:scale-90" title="TikTok">
                  <TiktokIcon size={11} />
                </a>
              )}
              {socials.social_youtube && (
                <a href={socials.social_youtube} target="_blank" rel="noopener noreferrer" className="w-[26px] h-[26px] rounded-full border border-white/5 bg-white/5 hover:bg-[#FF0000] hover:border-transparent hover:text-white transition-all flex items-center justify-center text-neutral-400 active:scale-90" title="YouTube">
                  <YoutubeIcon size={11} />
                </a>
              )}
            </div>
          </div>

          {/* Right: Contact Us */}
          <button
            onClick={() => setShowContactModal(true)}
            className="px-3 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-[9px] font-black uppercase tracking-wider text-neutral-300 hover:text-accent hover:border-accent/30 cursor-pointer"
          >
            {t('contact')}
          </button>
        </div>
      )}

      {/* Contact Us Modal Overlay */}
      {showContactModal && (
        <div 
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          onClick={() => setShowContactModal(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#0e0e0e] border border-white/10 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-white text-lg tracking-tight leading-tight">{t('contactUs')}</h3>
                <p className="text-[11px] text-neutral-500 mt-1">Get in touch with Team Book My Turf</p>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Content - Clickable Large Tabs */}
            <div className="flex flex-col gap-3">
              
              {/* WhatsApp Tab */}
              <a 
                href="https://wa.me/8801621960472" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 transition-all duration-200 active:scale-[0.98] group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/25 shrink-0 text-emerald-400 group-hover:scale-105 transition-transform">
                  <WhatsAppIcon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white leading-tight group-hover:text-emerald-400 transition-colors">01621-960472</p>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide mt-0.5">WhatsApp Message</p>
                </div>
              </a>

              {/* Call Tab */}
              <a 
                href="tel:01811008303" 
                className="flex items-center gap-4 p-4 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/25 transition-all duration-200 active:scale-[0.98] group"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center border border-cyan-500/25 shrink-0 text-cyan-400 group-hover:scale-105 transition-transform">
                  <Phone size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white leading-tight group-hover:text-cyan-400 transition-colors">01811-008303</p>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide mt-0.5">Call Support</p>
                </div>
              </a>

              {/* Facebook Tab */}
              <a 
                href="https://facebook.com/bookmyturfbd" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/25 transition-all duration-200 active:scale-[0.98] group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center border border-blue-500/25 shrink-0 text-blue-400 group-hover:scale-105 transition-transform">
                  <FacebookIcon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white leading-tight group-hover:text-blue-400 transition-colors">facebook.com/bookmyturfbd</p>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide mt-0.5">Facebook Page</p>
                </div>
              </a>

              {/* Email Tab */}
              <a 
                href="mailto:bookmyturfbd@gmail.com" 
                className="flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/25 transition-all duration-200 active:scale-[0.98] group"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center border border-red-500/25 shrink-0 text-red-400 group-hover:scale-105 transition-transform">
                  <Mail size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white leading-tight group-hover:text-red-400 transition-colors">bookmyturfbd@gmail.com</p>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide mt-0.5">Email Support</p>
                </div>
              </a>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
