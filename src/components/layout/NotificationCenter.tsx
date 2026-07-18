'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { 
  Bell, Swords, Users, Gamepad2, Calendar, 
  MessageSquare, CheckCheck, Loader2 
} from 'lucide-react';
import { getLoggedInUserId } from '@/lib/onesignal';
import { supabase } from '@/lib/supabase';

interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string; // JSON
  body: string | null; // JSON
  url: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationCenter() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const router = useRouter();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Resolve user ID client-side
  useEffect(() => {
    setUserId(getLoggedInUserId());
  }, []);

  // 2. Fetch notifications and connect to Realtime when userId is available
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data: NotificationItem[] = await res.json();
          setNotifications(data);
          setUnreadCount(data.filter(n => !n.read).length);
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Setup authenticated Supabase connection and Realtime listener
    let channel: any = null;

    const setupRealtime = async () => {
      try {
        // Fetch the custom signed JWT token
        const tokenRes = await fetch('/api/auth/supabase-token');
        if (tokenRes.ok) {
          const { token } = await tokenRes.json();
          if (token) {
            // Apply token to realtime client
            supabase.realtime.setAuth(token);
          }
        }

        // Subscribe to database changes and direct broadcasts for notifications matching this user
        channel = supabase
          .channel(`notifications:${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const newNotif = payload.new as NotificationItem;
              setNotifications(prev => {
                if (prev.some(n => n.id === newNotif.id)) return prev;
                setUnreadCount(c => c + 1);
                return [newNotif, ...prev];
              });
            }
          )
          .on(
            'broadcast',
            { event: 'new_notification' },
            (payload) => {
              const newNotif = payload.payload as NotificationItem;
              setNotifications(prev => {
                if (prev.some(n => n.id === newNotif.id)) return prev;
                setUnreadCount(c => c + 1);
                return [newNotif, ...prev];
              });
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Failed to setup Realtime notifications listener:', err);
      }
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper: Format JSON localization fields
  const parseLocalText = (jsonStr: string | null): string => {
    if (!jsonStr) return '';
    try {
      const parsed = JSON.parse(jsonStr);
      return parsed[locale] || parsed['en'] || jsonStr;
    } catch {
      return jsonStr;
    }
  };

  // Helper: Get Icon based on Type
  const getNotificationIcon = (type: string) => {
    const cls = "w-4 h-4 text-accent shrink-0";
    if (type.startsWith('team_')) return <Users className={cls} />;
    if (type.startsWith('challenge_') || type.startsWith('open_challenge_')) return <Swords className={cls} />;
    if (type.startsWith('match_')) return <Gamepad2 className={cls} />;
    if (type.startsWith('booking_')) return <Calendar className={cls} />;
    if (type.startsWith('coach_') || type.startsWith('friend_') || type.startsWith('interaction_')) {
      return <MessageSquare className={cls} />;
    }
    return <Bell className={cls} />;
  };

  // Helper: Relative time formatter
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (locale === 'bn') {
      const toBanglaNum = (n: number) => {
        const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return String(n).replace(/[0-9]/g, (w) => banglaDigits[+w]);
      };
      if (diffSec < 60) return 'এইমাত্র';
      if (diffMin < 60) return `${toBanglaNum(diffMin)} মিনিট আগে`;
      if (diffHr < 24) return `${toBanglaNum(diffHr)} ঘণ্টা আগে`;
      return `${toBanglaNum(diffDays)} দিন আগে`;
    } else {
      if (diffSec < 60) return 'just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      return `${diffDays}d ago`;
    }
  };

  // Actions
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await fetch('/api/notifications', { method: 'PATCH' });
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    setIsOpen(false);
    
    if (!notif.read) {
      // Optimistic UI update
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

      try {
        await fetch(`/api/notifications/${notif.id}`, { method: 'PATCH' });
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    if (notif.url) {
      let targetUrl = notif.url;
      // Strip leading slash + 2-letter locale if present (e.g. /en/abc -> /abc)
      if (targetUrl.startsWith('/en/') || targetUrl.startsWith('/bn/')) {
        targetUrl = targetUrl.substring(3);
      } else if (targetUrl === '/en' || targetUrl === '/bn') {
        targetUrl = '/';
      }
      router.push(targetUrl);
    }
  };

  if (!userId) return null;

  return (
    <div className="relative pointer-events-auto" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-900/10 dark:hover:bg-white/5 transition-colors cursor-pointer select-none"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-800 dark:text-white" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_10px_rgba(0,255,65,0.8)]" />
        )}
      </button>

      {/* Tray Dropdown */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-3 w-80 glass-panel border border-white/10 rounded-2xl shadow-2xl p-4 z-[60] flex flex-col gap-3 animate-in fade-in slide-in-from-top-3 duration-200"
          style={{ background: 'linear-gradient(180deg, #0d0d0d 0%, #050505 100%)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-black tracking-wider uppercase text-white">
              {locale === 'bn' ? 'নোটিফিকেশন' : 'Notifications'}
              {unreadCount > 0 && ` (${unreadCount})`}
            </span>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[10px] font-black text-accent hover:brightness-110 uppercase tracking-wide cursor-pointer"
              >
                <CheckCheck className="w-3 h-3" />
                {locale === 'bn' ? 'সব পঠিত করুন' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-accent animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-neutral-900/50 border border-white/5 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-neutral-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">
                    {locale === 'bn' ? 'কোনো নতুন নোটিফিকেশন নেই' : 'All Caught Up!'}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">
                    {locale === 'bn' ? 'আমরা আপনাকে সর্বশেষ আপডেট এখানে জানাব।' : 'Your alerts will appear here.'}
                  </p>
                </div>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    notif.read 
                      ? 'bg-transparent border-transparent hover:bg-white/5' 
                      : 'bg-accent/5 border-accent/10 hover:bg-accent/10'
                  }`}
                >
                  {/* Left Icon */}
                  <div className="mt-0.5 shrink-0">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                      notif.read ? 'bg-neutral-900 border border-white/5' : 'bg-accent/15 border border-accent/20'
                    }`}>
                      {getNotificationIcon(notif.type)}
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className={`text-[11px] leading-tight text-white ${notif.read ? 'font-medium' : 'font-black'}`}>
                      {parseLocalText(notif.title)}
                    </span>
                    {notif.body && (
                      <span className="text-[10px] leading-normal text-neutral-400 font-medium">
                        {parseLocalText(notif.body)}
                      </span>
                    )}
                    <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider mt-1">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
